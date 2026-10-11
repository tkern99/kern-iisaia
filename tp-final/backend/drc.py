from typing import Dict, Any, List

def validate_drc(data: Dict[str, Any], drc_rules: Dict[str, Any]) -> List[str]:
    """
    Validador de reglas de diseño (DRC) para el nodo tecnológico GPDK045 (45nm).
    Verifica que el layout no esté vacío y que las geometrías respeten los anchos
    mínimos y dimensiones del PDK.
    """
    violations: List[str] = []

    # Extraer lista de geometrías (soporta tanto 'shapes' de nuestro frontend como 'polygons' del contrato)
    shapes = []
    if isinstance(data, list):
        shapes = data
    elif isinstance(data, dict):
        if "shapes" in data and isinstance(data["shapes"], list):
            shapes = data["shapes"]
        elif "polygons" in data and isinstance(data["polygons"], list):
            shapes = data["polygons"]

    if not shapes:
        violations.append("El layout está vacío o no contiene formas/polígonos válidos.")
        return violations

    # Filtrar geometrías físicas (omitir pines lógicos)
    physical_shapes = []
    for idx, shape in enumerate(shapes):
        layer_id = shape.get("layerId") or shape.get("layer") or shape.get("layer_id")
        if not layer_id:
            violations.append(f"Elemento #{idx}: Falta la especificación de capa ('layerId').")
            continue
        if str(layer_id).startswith("Pin"):
            continue
        physical_shapes.append((idx, shape, str(layer_id)))

    EPS = 0.0005

    def get_box(s, i):
        raw_w = float(s.get("width", 0))
        raw_h = float(s.get("height", 0))
        w = abs(raw_w)
        h = abs(raw_h)
        x = float(s.get("x", 0))
        y = float(s.get("y", 0))
        min_x = x if raw_w >= 0 else x - w
        min_y = y if raw_h >= 0 else y - h
        return {
            "id": s.get("id", f"elem_{i}"),
            "minX": min_x,
            "maxX": min_x + w,
            "minY": min_y,
            "maxY": min_y + h,
            "w": w,
            "h": h,
            "minDim": min(w, h),
            "maxDim": max(w, h)
        }

    def merge_rectangles_of_layer(boxes):
        if not boxes or len(boxes) <= 1:
            return list(boxes) if boxes else []
        merged = [dict(b) for b in boxes]
        changed = True

        while changed:
            changed = False
            next_boxes = []
            used = set()

            for i in range(len(merged)):
                if i in used:
                    continue
                cur = dict(merged[i])

                for j in range(i + 1, len(merged)):
                    if j in used:
                        continue
                    other = merged[j]

                    # 1. Contención total
                    if (other["minX"] >= cur["minX"] - EPS and other["maxX"] <= cur["maxX"] + EPS and
                        other["minY"] >= cur["minY"] - EPS and other["maxY"] <= cur["maxY"] + EPS):
                        used.add(j)
                        changed = True
                        continue
                    if (cur["minX"] >= other["minX"] - EPS and cur["maxX"] <= other["maxX"] + EPS and
                        cur["minY"] >= other["minY"] - EPS and cur["maxY"] <= other["maxY"] + EPS):
                        cur = dict(other)
                        used.add(j)
                        changed = True
                        continue

                    # 2. Mismo tramo en X, solapados en Y
                    same_x = abs(cur["minX"] - other["minX"]) < EPS and abs(cur["maxX"] - other["maxX"]) < EPS
                    touch_y = cur["minY"] <= other["maxY"] + EPS and other["minY"] <= cur["maxY"] + EPS
                    if same_x and touch_y:
                        min_y = min(cur["minY"], other["minY"])
                        max_y = max(cur["maxY"], other["maxY"])
                        w = cur["maxX"] - cur["minX"]
                        h = max_y - min_y
                        cur["minY"] = min_y
                        cur["maxY"] = max_y
                        cur["h"] = h
                        cur["minDim"] = min(w, h)
                        cur["maxDim"] = max(w, h)
                        used.add(j)
                        changed = True
                        continue

                    # 3. Mismo tramo en Y, solapados en X
                    same_y = abs(cur["minY"] - other["minY"]) < EPS and abs(cur["maxY"] - other["maxY"]) < EPS
                    touch_x = cur["minX"] <= other["maxX"] + EPS and other["minX"] <= cur["maxX"] + EPS
                    if same_y and touch_x:
                        min_x = min(cur["minX"], other["minX"])
                        max_x = max(cur["maxX"], other["maxX"])
                        w = max_x - min_x
                        h = cur["maxY"] - cur["minY"]
                        cur["minX"] = min_x
                        cur["maxX"] = max_x
                        cur["w"] = w
                        cur["minDim"] = min(w, h)
                        cur["maxDim"] = max(w, h)
                        used.add(j)
                        changed = True
                        continue

                    # 4. Unión rectangular general
                    min_x = min(cur["minX"], other["minX"])
                    max_x = max(cur["maxX"], other["maxX"])
                    min_y = min(cur["minY"], other["minY"])
                    max_y = max(cur["maxY"], other["maxY"])
                    bbox_w = max_x - min_x
                    bbox_h = max_y - min_y
                    bbox_area = bbox_w * bbox_h

                    ov_w = max(0.0, min(cur["maxX"], other["maxX"]) - max(cur["minX"], other["minX"]))
                    ov_h = max(0.0, min(cur["maxY"], other["maxY"]) - max(cur["minY"], other["minY"]))
                    union_area = (cur["w"] * cur["h"]) + (other["w"] * other["h"]) - (ov_w * ov_h)

                    if ov_w > 0 and ov_h > 0 and abs(union_area - bbox_area) < EPS * max(1.0, bbox_area):
                        cur["minX"] = min_x
                        cur["maxX"] = max_x
                        cur["minY"] = min_y
                        cur["maxY"] = max_y
                        cur["w"] = bbox_w
                        cur["h"] = bbox_h
                        cur["minDim"] = min(bbox_w, bbox_h)
                        cur["maxDim"] = max(bbox_w, bbox_h)
                        used.add(j)
                        changed = True
                        continue

                next_boxes.append(cur)
            merged = next_boxes

        return merged

    def is_extended_to_required_dim(b, layer_boxes, required_dim):
        if b["minDim"] >= required_dim - EPS:
            return True

        if b["h"] < required_dim - EPS:
            connected_y = [b]
            expanded = True
            while expanded:
                expanded = False
                for other in layer_boxes:
                    if other in connected_y:
                        continue
                    ov_x = min(b["maxX"], other["maxX"]) - max(b["minX"], other["minX"])
                    if ov_x <= EPS:
                        continue
                    touches = any(other["minY"] <= c["maxY"] + EPS and other["maxY"] >= c["minY"] - EPS for c in connected_y)
                    if touches:
                        connected_y.append(other)
                        expanded = True
            total_h = max(c["maxY"] for c in connected_y) - min(c["minY"] for c in connected_y)
            if total_h >= required_dim - EPS and b["w"] >= required_dim - EPS:
                return True

        if b["w"] < required_dim - EPS:
            connected_x = [b]
            expanded = True
            while expanded:
                expanded = False
                for other in layer_boxes:
                    if other in connected_x:
                        continue
                    ov_y = min(b["maxY"], other["maxY"]) - max(b["minY"], other["minY"])
                    if ov_y <= EPS:
                        continue
                    touches = any(other["minX"] <= c["maxX"] + EPS and other["maxX"] >= c["minX"] - EPS for c in connected_x)
                    if touches:
                        connected_x.append(other)
                        expanded = True
            total_w = max(c["maxX"] for c in connected_x) - min(c["minX"] for c in connected_x)
            if total_w >= required_dim - EPS and b["h"] >= required_dim - EPS:
                return True

        return False

    # Agrupar por capa
    raw_by_layer = {}
    for idx, shape, layer_id in physical_shapes:
        b = get_box(shape, idx)
        raw_by_layer.setdefault(layer_id, []).append(b)

    by_layer = {}
    for layer_id, boxes in raw_by_layer.items():
        if layer_id.strip().lower() in ["cont", "via1"]:
            by_layer[layer_id] = boxes
        else:
            by_layer[layer_id] = merge_rectangles_of_layer(boxes)

    # 1. Chequeo de Ancho Mínimo y Tamaño Mínimo
    for layer_id, layer_boxes in by_layer.items():
        rule = None
        layer_norm = layer_id.strip().lower()
        for k, v in drc_rules.items():
            if k.lower() == layer_norm:
                rule = v
                break
        if not rule:
            continue

        min_w = rule.get("min_width")
        min_size = rule.get("min_size")

        for b in layer_boxes:
            w, h = b["w"], b["h"]
            min_dim = b["minDim"]

            if min_w is not None and (w < min_w - EPS or h < min_w - EPS):
                if not is_extended_to_required_dim(b, layer_boxes, min_w):
                    violations.append(
                        f"Regla {layer_id}.W.1: Dimensión mínima de {layer_id} violada "
                        f"({min_dim:.4f} µm < requerido {min_w:.4f} µm) en elemento {b['id']}."
                    )

            if min_size is not None and (w < min_size - EPS or h < min_size - EPS):
                violations.append(
                    f"Regla {layer_id}.Size.1: Tamaño mínimo de {layer_id} violado "
                    f"({w:.4f}x{h:.4f} µm < requerido {min_size:.4f}x{min_size:.4f} µm) en elemento {b['id']}."
                )

    # 2. Chequeo de Espaciado Mínimo entre geometrías de la misma capa
    for layer_id, layer_items in by_layer.items():
        rule = None
        layer_norm = layer_id.strip().lower()
        for k, v in drc_rules.items():
            if k.lower() == layer_norm:
                rule = v
                break
        if not rule:
            continue

        min_sp = rule.get("min_spacing")
        if min_sp is None:
            continue

        for i in range(len(layer_items)):
            b1 = layer_items[i]
            for j in range(i + 1, len(layer_items)):
                b2 = layer_items[j]

                # Si se solapan o tocan, es la misma red física continua
                overlap = (b1["minX"] < b2["maxX"] - EPS and b1["maxX"] > b2["minX"] + EPS and
                           b1["minY"] < b2["maxY"] - EPS and b1["maxY"] > b2["minY"] + EPS)
                if overlap:
                    continue

                dx = max(0.0, max(b1["minX"], b2["minX"]) - min(b1["maxX"], b2["maxX"]))
                dy = max(0.0, max(b1["minY"], b2["minY"]) - min(b1["maxY"], b2["maxY"]))
                dist = (dx * dx + dy * dy) ** 0.5

                if EPS < dist < min_sp - EPS:
                    violations.append(
                        f"Regla {layer_id}.SP.1: Espaciado mínimo de {layer_id} violado "
                        f"({dist:.4f} µm < requerido {min_sp:.4f} µm) entre elementos {b1['id']} y {b2['id']}."
                    )

    def overlaps(a, b):
        return (
            a["minX"] < b["maxX"] - EPS and
            a["maxX"] > b["minX"] + EPS and
            a["minY"] < b["maxY"] - EPS and
            a["maxY"] > b["minY"] + EPS
        )

    # 3. Dimensiones Fijas / Tamaño de Contactos y Vías
    contacts = by_layer.get("Cont", [])
    polys = by_layer.get("Poly", [])
    oxides = by_layer.get("Oxide", [])
    vias = by_layer.get("Via1", [])
    m1s = by_layer.get("Metal1", [])
    m2s = by_layer.get("Metal2", [])

    for c in contacts:
        w_diff = abs(c["w"] - 0.06)
        h_diff = abs(c["h"] - 0.06)
        if w_diff > EPS or h_diff > EPS:
            violations.append(
                f"Regla CONT.W.1: Contact debe ser cuadrado fijo de 0.06x0.06 µm (medido: {c['w']:.4f}x{c['h']:.4f} µm) en elemento {c['id']}."
            )

    for v in vias:
        w_diff = abs(v["w"] - 0.07)
        h_diff = abs(v["h"] - 0.07)
        if w_diff > EPS or h_diff > EPS:
            violations.append(
                f"Regla VIA1.W.1: Via1 debe ser cuadrada fija de 0.07x0.07 µm (medido: {v['w']:.4f}x{v['h']:.4f} µm) en elemento {v['id']}."
            )

    # 4. Regla CONT.X.1: Contacto sobre canal de Gate prohibido
    for c in contacts:
        for p in polys:
            if overlaps(c, p):
                for ox in oxides:
                    if overlaps(c, ox) and overlaps(p, ox):
                        violations.append(
                            f"Regla CONT.X.1: Contacto sobre el canal del transistor (cruce Poly/Oxide) prohibido en elemento {c['id']}."
                        )

    # 5. Regla POLY.E.1: Extensión de Gate Poly fuera de Oxide >= 0.10 µm
    for p in polys:
        for ox in oxides:
            if overlaps(p, ox):
                is_gate_vertical = p["h"] > p["w"]
                if is_gate_vertical:
                    top_ext = p["maxY"] - ox["maxY"]
                    bottom_ext = ox["minY"] - p["minY"]
                    min_ext = min(top_ext, bottom_ext)
                    if min_ext < 0.10 - EPS:
                        violations.append(
                            f"Regla POLY.E.1: Extensión de gate Poly fuera de Oxide ({max(0.0, min_ext):.4f} µm < requerido 0.1000 µm) en gate {p['id']}."
                        )
                else:
                    right_ext = p["maxX"] - ox["maxX"]
                    left_ext = ox["minX"] - p["minX"]
                    min_ext = min(right_ext, left_ext)
                    if min_ext < 0.10 - EPS:
                        violations.append(
                            f"Regla POLY.E.1: Extensión de gate Poly fuera de Oxide ({max(0.0, min_ext):.4f} µm < requerido 0.1000 µm) en gate {p['id']}."
                        )

    # 6. Recubrimientos de Vías y Contactos (Enclosure)
    for v in vias:
        covering_m1 = any(overlaps(v, m) for m in m1s)
        covering_m2 = any(overlaps(v, m) for m in m2s)
        if not covering_m1:
            violations.append(
                f"Regla VIA1.E.1: Via1 no está cubierta por Metal1 en ({v['minX']:.3f}, {v['minY']:.3f}) en elemento {v['id']}."
            )
        if not covering_m2:
            violations.append(
                f"Regla METAL2.E.1: Via1 no está cubierta por Metal2 en ({v['minX']:.3f}, {v['minY']:.3f}) en elemento {v['id']}."
            )

    for c in contacts:
        in_ox = any(overlaps(c, ox) for ox in oxides)
        in_po = any(overlaps(c, po) for po in polys)
        if not in_ox and not in_po:
            violations.append(
                f"Regla CONT.E.1: Contacto huérfano (no está ubicado sobre región activa Oxide ni sobre Poly) en elemento {c['id']}."
            )

    return violations
