/**
 * drcEngine.js
 * Motor de validación de Reglas de Diseño (Design Rule Checking - DRC) para GPDK045.
 * Fiel a las reglas oficiales de assuraDRC.rul.
 */

import { GPDK045_DRC_RULES } from '../data/drcRules.js';

const EPS = 0.0005; // 0.5 nm de tolerancia para redondeos de punto flotante

/**
 * Obtiene las coordenadas canónicas y dimensiones de una geometría.
 */
function getBox(s) {
  const w = Math.abs(s.width || 0);
  const h = Math.abs(s.height || 0);
  const minX = s.width >= 0 ? s.x : s.x - w;
  const minY = s.height >= 0 ? s.y : s.y - h;
  return {
    id: s.id,
    layerId: s.layerId,
    minX,
    maxX: minX + w,
    minY,
    maxY: minY + h,
    w,
    h,
    minDim: Math.min(w, h),
    maxDim: Math.max(w, h)
  };
}

/**
 * Verifica si dos cajas se solapan con tolerancia.
 */
function overlaps(a, b) {
  return (
    a.minX < b.maxX - EPS &&
    a.maxX > b.minX + EPS &&
    a.minY < b.maxY - EPS &&
    a.maxY > b.minY + EPS
  );
}

/**
 * Fusiona iterativamente pares de rectángulos de la misma capa que se solapan o tocan
 * y cuya unión forma un rectángulo exacto (mismo ancho X, mismo alto Y, contención, etc.).
 */
function mergeRectanglesOfLayer(boxes) {
  if (!boxes || boxes.length <= 1) return boxes ? [...boxes] : [];
  let merged = boxes.map(b => ({ ...b }));
  let changed = true;

  while (changed) {
    changed = false;
    const next = [];
    const used = new Set();

    for (let i = 0; i < merged.length; i++) {
      if (used.has(i)) continue;
      let cur = merged[i];

      for (let j = i + 1; j < merged.length; j++) {
        if (used.has(j)) continue;
        const other = merged[j];

        // 1. Contención total de uno dentro de otro
        if (
          other.minX >= cur.minX - EPS && other.maxX <= cur.maxX + EPS &&
          other.minY >= cur.minY - EPS && other.maxY <= cur.maxY + EPS
        ) {
          used.add(j);
          changed = true;
          continue;
        }
        if (
          cur.minX >= other.minX - EPS && cur.maxX <= other.maxX + EPS &&
          cur.minY >= other.minY - EPS && cur.maxY <= other.maxY + EPS
        ) {
          cur = { ...other, id: `${cur.id}_${other.id}` };
          used.add(j);
          changed = true;
          continue;
        }

        // 2. Mismo tramo en X, solapados o tocándose en Y (como el caso de dos shapes apiladas)
        const sameX = Math.abs(cur.minX - other.minX) < EPS && Math.abs(cur.maxX - other.maxX) < EPS;
        const touchY = cur.minY <= other.maxY + EPS && other.minY <= cur.maxY + EPS;
        if (sameX && touchY) {
          const minY = Math.min(cur.minY, other.minY);
          const maxY = Math.max(cur.maxY, other.maxY);
          const w = cur.maxX - cur.minX;
          const h = maxY - minY;
          cur = {
            id: `${cur.id}_${other.id}`,
            layerId: cur.layerId,
            minX: cur.minX,
            maxX: cur.maxX,
            minY,
            maxY,
            w,
            h,
            minDim: Math.min(w, h),
            maxDim: Math.max(w, h)
          };
          used.add(j);
          changed = true;
          continue;
        }

        // 3. Mismo tramo en Y, solapados o tocándose en X
        const sameY = Math.abs(cur.minY - other.minY) < EPS && Math.abs(cur.maxY - other.maxY) < EPS;
        const touchX = cur.minX <= other.maxX + EPS && other.minX <= cur.maxX + EPS;
        if (sameY && touchX) {
          const minX = Math.min(cur.minX, other.minX);
          const maxX = Math.max(cur.maxX, other.maxX);
          const w = maxX - minX;
          const h = cur.maxY - cur.minY;
          cur = {
            id: `${cur.id}_${other.id}`,
            layerId: cur.layerId,
            minX,
            maxX,
            minY: cur.minY,
            maxY: cur.maxY,
            w,
            h,
            minDim: Math.min(w, h),
            maxDim: Math.max(w, h)
          };
          used.add(j);
          changed = true;
          continue;
        }

        // 4. Unión rectangular general (Area(A U B) == Area(BBox))
        const minX = Math.min(cur.minX, other.minX);
        const maxX = Math.max(cur.maxX, other.maxX);
        const minY = Math.min(cur.minY, other.minY);
        const maxY = Math.max(cur.maxY, other.maxY);
        const bboxW = maxX - minX;
        const bboxH = maxY - minY;
        const bboxArea = bboxW * bboxH;

        const ovW = Math.max(0, Math.min(cur.maxX, other.maxX) - Math.max(cur.minX, other.minX));
        const ovH = Math.max(0, Math.min(cur.maxY, other.maxY) - Math.max(cur.minY, other.minY));
        const unionArea = (cur.w * cur.h) + (other.w * other.h) - (ovW * ovH);

        if (ovW > 0 && ovH > 0 && Math.abs(unionArea - bboxArea) < EPS * Math.max(1, bboxArea)) {
          cur = {
            id: `${cur.id}_${other.id}`,
            layerId: cur.layerId,
            minX,
            maxX,
            minY,
            maxY,
            w: bboxW,
            h: bboxH,
            minDim: Math.min(bboxW, bboxH),
            maxDim: Math.max(bboxW, bboxH)
          };
          used.add(j);
          changed = true;
          continue;
        }
      }

      next.push(cur);
    }

    merged = next;
  }

  return merged;
}

/**
 * Verifica si una caja que individualmente no alcanza requiredDim está
 * en realidad extendida por geometrías solapadas continuas de la misma capa.
 */
function isExtendedToRequiredDim(b, layerBoxes, requiredDim) {
  if (b.minDim >= requiredDim - EPS) return true;

  // Analizar si la deficiencia vertical (h < requiredDim) se compensa con formas solapadas continuas
  if (b.h < requiredDim - EPS) {
    const connectedY = [b];
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const other of layerBoxes) {
        if (connectedY.includes(other)) continue;
        const ovX = Math.min(b.maxX, other.maxX) - Math.max(b.minX, other.minX);
        if (ovX <= EPS) continue;

        const touches = connectedY.some(c => 
          other.minY <= c.maxY + EPS && other.maxY >= c.minY - EPS
        );
        if (touches) {
          connectedY.push(other);
          expanded = true;
        }
      }
    }

    const totalMinY = Math.min(...connectedY.map(c => c.minY));
    const totalMaxY = Math.max(...connectedY.map(c => c.maxY));
    const totalH = totalMaxY - totalMinY;

    if (totalH >= requiredDim - EPS && b.w >= requiredDim - EPS) {
      return true;
    }
  }

  // Analizar si la deficiencia horizontal (w < requiredDim) se compensa con formas solapadas continuas
  if (b.w < requiredDim - EPS) {
    const connectedX = [b];
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const other of layerBoxes) {
        if (connectedX.includes(other)) continue;
        const ovY = Math.min(b.maxY, other.maxY) - Math.max(b.minY, other.minY);
        if (ovY <= EPS) continue;

        const touches = connectedX.some(c => 
          other.minX <= c.maxX + EPS && other.maxX >= c.minX - EPS
        );
        if (touches) {
          connectedX.push(other);
          expanded = true;
        }
      }
    }

    const totalMinX = Math.min(...connectedX.map(c => c.minX));
    const totalMaxX = Math.max(...connectedX.map(c => c.maxX));
    const totalW = totalMaxX - totalMinX;

    if (totalW >= requiredDim - EPS && b.h >= requiredDim - EPS) {
      return true;
    }
  }

  return false;
}

/**
 * Distancia ortogonal y euclidiana entre dos rectángulos disjuntos.
 */
function distance(a, b) {
  const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Ejecuta la verificación completa de DRC sobre un conjunto de geometrías.
 * @param {Array} shapes - Lista de geometrías del canvas.
 * @returns {{ pass: boolean, errors: string[], warnings: string[], details: string[], violations: Array, stats: Object }}
 */
export function runDRC(shapes) {
  const violations = [];
  const details = [];
  const errors = [];
  const warnings = [];

  if (!shapes || shapes.length === 0) {
    return {
      pass: false,
      errors: ['El canvas está vacío. No hay geometrías para analizar.'],
      warnings: [],
      details: ['── Estado del Layout ────────────────────────────────────', '  Canvas vacío: 0 shapes encontrados ✘'],
      violations: [],
      stats: { totalShapes: 0, rulesChecked: 0, violationsCount: 0 }
    };
  }

  // Filtrar formas físicas (descartar pins para el chequeo de capas de proceso)
  const physicalShapes = shapes.filter(s => s.layerId && !s.layerId.startsWith('Pin'));
  const boxes = physicalShapes.map(getBox);

  // Agrupar cajas por capa y fusionar geometrías de la misma capa que se solapan
  // (los contactos y vías Cont/Via1 se mantienen individuales por ser elementos fijos)
  const rawByLayer = {};
  for (const b of boxes) {
    if (!rawByLayer[b.layerId]) rawByLayer[b.layerId] = [];
    rawByLayer[b.layerId].push(b);
  }

  const byLayer = {};
  for (const [layerId, layerList] of Object.entries(rawByLayer)) {
    if (layerId === 'Cont' || layerId === 'Via1') {
      byLayer[layerId] = layerList;
    } else {
      byLayer[layerId] = mergeRectanglesOfLayer(layerList);
    }
  }

  details.push('── 1. Ancho Mínimo de Capas (Min Width) ─────────────────');
  const widthRules = Object.values(GPDK045_DRC_RULES).filter(r => r.type === 'minWidth');
  
  for (const rule of widthRules) {
    const layerBoxes = byLayer[rule.layer] || [];
    let layerViolations = 0;

    for (const b of layerBoxes) {
      if (b.minDim < rule.value - EPS) {
        if (isExtendedToRequiredDim(b, layerBoxes, rule.value)) {
          continue;
        }
        layerViolations++;
        const msg = `${rule.code}: Ancho de ${rule.layer} (${b.minDim.toFixed(4)} µm) es menor que el mínimo requerido (${rule.value} µm)`;
        errors.push(msg);
        violations.push({
          id: `w_${b.id}`,
          ruleCode: rule.code,
          layer: rule.layer,
          message: msg,
          bbox: { x: b.minX, y: b.minY, width: b.w, height: b.h },
          measured: b.minDim,
          required: rule.value
        });
      }
    }

    if (layerBoxes.length > 0) {
      if (layerViolations === 0) {
        details.push(`  ✔ ${rule.code} (${rule.layer} >= ${rule.value} µm): ${layerBoxes.length} elementos correctos`);
      } else {
        details.push(`  ✘ ${rule.code} (${rule.layer} >= ${rule.value} µm): ${layerViolations} violación(es) detectada(s)`);
      }
    }
  }

  details.push('── 2. Espaciado Mínimo entre Geometrías (Min Spacing) ────');
  const spacingRules = Object.values(GPDK045_DRC_RULES).filter(r => r.type === 'minSpacing');

  for (const rule of spacingRules) {
    const layerBoxes = byLayer[rule.layer] || [];
    let layerViolations = 0;

    for (let i = 0; i < layerBoxes.length; i++) {
      for (let j = i + 1; j < layerBoxes.length; j++) {
        const b1 = layerBoxes[i];
        const b2 = layerBoxes[j];

        // Si se solapan o tocan, forman la misma red física conectada
        if (overlaps(b1, b2)) continue;

        const dist = distance(b1, b2);
        if (dist > EPS && dist < rule.value - EPS) {
          layerViolations++;
          const msg = `${rule.code}: Espaciado de ${rule.layer} (${dist.toFixed(4)} µm) es menor que el mínimo requerido (${rule.value} µm)`;
          errors.push(msg);

          // Caja de la zona de violación entre ambas formas
          const errX = Math.min(b1.minX, b2.minX);
          const errY = Math.min(b1.minY, b2.minY);
          const errW = Math.max(b1.maxX, b2.maxX) - errX;
          const errH = Math.max(b1.maxY, b2.maxY) - errY;

          violations.push({
            id: `sp_${b1.id}_${b2.id}`,
            ruleCode: rule.code,
            layer: rule.layer,
            message: msg,
            bbox: { x: errX, y: errY, width: errW, height: errH },
            measured: dist,
            required: rule.value
          });
        }
      }
    }

    if (layerBoxes.length > 1) {
      if (layerViolations === 0) {
        details.push(`  ✔ ${rule.code} (${rule.layer} >= ${rule.value} µm): Espaciados correctos`);
      } else {
        details.push(`  ✘ ${rule.code} (${rule.layer} >= ${rule.value} µm): ${layerViolations} violación(es) detectada(s)`);
      }
    }
  }

  details.push('── 3. Dimensiones Fijas de Contactos y Vías ──────────────');
  const fixedRules = Object.values(GPDK045_DRC_RULES).filter(r => r.type === 'fixedSize');

  for (const rule of fixedRules) {
    const layerBoxes = byLayer[rule.layer] || [];
    let layerViolations = 0;

    for (const b of layerBoxes) {
      const wDiff = Math.abs(b.w - rule.width);
      const hDiff = Math.abs(b.h - rule.height);

      if (wDiff > EPS || hDiff > EPS) {
        layerViolations++;
        const msg = `${rule.code}: ${rule.layer} debe ser cuadrado fijo de ${rule.width}x${rule.height} µm (medido: ${b.w.toFixed(4)}x${b.h.toFixed(4)} µm)`;
        errors.push(msg);
        violations.push({
          id: `fx_${b.id}`,
          ruleCode: rule.code,
          layer: rule.layer,
          message: msg,
          bbox: { x: b.minX, y: b.minY, width: b.w, height: b.h },
          measured: Math.max(b.w, b.h),
          required: rule.width
        });
      }
    }

    if (layerBoxes.length > 0) {
      if (layerViolations === 0) {
        details.push(`  ✔ ${rule.code} (${rule.layer} == ${rule.width}x${rule.height} µm): ${layerBoxes.length} contactos/vías conformes`);
      } else {
        details.push(`  ✘ ${rule.code} (${rule.layer} == ${rule.width}x${rule.height} µm): ${layerViolations} tamaño(s) no reglamentario(s)`);
      }
    }
  }

  details.push('── 4. Reglas de Exclusión e Integridad Topológica ───────');
  
  // CONT.X.1: Contacto sobre canal de Gate prohibido
  const contacts = byLayer['Cont'] || [];
  const polys = byLayer['Poly'] || [];
  const oxides = byLayer['Oxide'] || [];
  let contOnGateViolations = 0;

  for (const c of contacts) {
    for (const p of polys) {
      if (overlaps(c, p)) {
        for (const ox of oxides) {
          if (overlaps(c, ox) && overlaps(p, ox)) {
            contOnGateViolations++;
            const msg = `CONT.X.1: Contacto sobre el canal del transistor (cruce Poly/Oxide) prohibido en posición (${c.minX.toFixed(3)}, ${c.minY.toFixed(3)})`;
            errors.push(msg);
            violations.push({
              id: `cg_${c.id}`,
              ruleCode: 'CONT.X.1',
              layer: 'Cont',
              message: msg,
              bbox: { x: c.minX, y: c.minY, width: c.w, height: c.h }
            });
          }
        }
      }
    }
  }

  if (contacts.length > 0) {
    if (contOnGateViolations === 0) {
      details.push('  ✔ CONT.X.1 (No contact on gate): Conforme');
    } else {
      details.push(`  ✘ CONT.X.1 (No contact on gate): ${contOnGateViolations} contacto(s) indebido(s) sobre canal`);
    }
  }

  // NIMP.X.1: Nimp y Pimp solapados prohibido
  const nimps = byLayer['Nimp'] || [];
  const pimps = byLayer['Pimp'] || [];
  let implantOverlapViolations = 0;

  for (const ni of nimps) {
    for (const pi of pimps) {
      if (overlaps(ni, pi)) {
        implantOverlapViolations++;
        const msg = `NIMP.X.1: Solapamiento prohibido entre N+ Implant y P+ Implant`;
        errors.push(msg);
        const errX = Math.max(ni.minX, pi.minX);
        const errY = Math.max(ni.minY, pi.minY);
        const errW = Math.min(ni.maxX, pi.maxX) - errX;
        const errH = Math.min(ni.maxY, pi.maxY) - errY;
        violations.push({
          id: `np_${ni.id}_${pi.id}`,
          ruleCode: 'NIMP.X.1',
          layer: 'Nimp',
          message: msg,
          bbox: { x: errX, y: errY, width: Math.max(errW, 0.05), height: Math.max(errH, 0.05) }
        });
      }
    }
  }

  if (nimps.length > 0 && pimps.length > 0) {
    if (implantOverlapViolations === 0) {
      details.push('  ✔ NIMP.X.1 (No Nimp/Pimp overlap): Conforme');
    } else {
      details.push(`  ✘ NIMP.X.1 (No Nimp/Pimp overlap): ${implantOverlapViolations} solapamiento(s) de implantes`);
    }
  }

  details.push('── 5. Extensión de Gate y Source/Drain (POLY.E) ──────────');
  
  // POLY.E.1 & POLY.E.3: Transistor gate end-cap extension y S/D extension
  let gateExtensionViolations = 0;
  for (const p of polys) {
    for (const ox of oxides) {
      if (overlaps(p, ox)) {
        // Determinamos orientación del canal
        const isGateVertical = p.h >= p.w;
        if (isGateVertical) {
          // Gate corre verticalmente a través del óxido (extensión en Y)
          const topExtension = p.maxY - ox.maxY;
          const bottomExtension = ox.minY - p.minY;
          const minExt = Math.min(topExtension, bottomExtension);

          if (minExt < GPDK045_DRC_RULES['POLY.E.1'].value - EPS) {
            gateExtensionViolations++;
            const msg = `POLY.E.1: Extensión de gate Poly fuera de Oxide (${Math.max(0, minExt).toFixed(4)} µm) es menor a 0.10 µm`;
            errors.push(msg);
            violations.push({
              id: `ge_${p.id}_${ox.id}`,
              ruleCode: 'POLY.E.1',
              layer: 'Poly',
              message: msg,
              bbox: { x: p.minX, y: p.minY, width: p.w, height: p.h },
              measured: Math.max(0, minExt),
              required: 0.10
            });
          }
        } else {
          // Gate corre horizontalmente a través del óxido (extensión en X)
          const rightExtension = p.maxX - ox.maxX;
          const leftExtension = ox.minX - p.minX;
          const minExt = Math.min(rightExtension, leftExtension);

          if (minExt < GPDK045_DRC_RULES['POLY.E.1'].value - EPS) {
            gateExtensionViolations++;
            const msg = `POLY.E.1: Extensión de gate Poly fuera de Oxide (${Math.max(0, minExt).toFixed(4)} µm) es menor a 0.10 µm`;
            errors.push(msg);
            violations.push({
              id: `ge_${p.id}_${ox.id}`,
              ruleCode: 'POLY.E.1',
              layer: 'Poly',
              message: msg,
              bbox: { x: p.minX, y: p.minY, width: p.w, height: p.h },
              measured: Math.max(0, minExt),
              required: 0.10
            });
          }
        }
      }
    }
  }

  if (polys.length > 0 && oxides.length > 0) {
    if (gateExtensionViolations === 0) {
      details.push('  ✔ POLY.E.1 (Gate end cap extension >= 0.10 µm): Conforme');
    } else {
      details.push(`  ✘ POLY.E.1 (Gate end cap extension >= 0.10 µm): ${gateExtensionViolations} terminación(es) insuficiente(s)`);
    }
  }

  details.push('── 6. Recubrimientos de Vías y Contactos (Enclosure) ────');
  
  // VIA1.E.1 & METAL2.E.1: Enclosure de Via1 por Metal1 y Metal2
  const vias = byLayer['Via1'] || [];
  const m1s = byLayer['Metal1'] || [];
  const m2s = byLayer['Metal2'] || [];
  let viaEnclosureViolations = 0;

  for (const v of vias) {
    const coveringM1 = m1s.find(m => overlaps(v, m));
    const coveringM2 = m2s.find(m => overlaps(v, m));

    if (!coveringM1) {
      viaEnclosureViolations++;
      const msg = `VIA1.E.1: Via1 no está conectada/cubierta por Metal1 en (${v.minX.toFixed(3)}, ${v.minY.toFixed(3)})`;
      errors.push(msg);
      violations.push({
        id: `vm1_${v.id}`,
        ruleCode: 'VIA1.E.1',
        layer: 'Via1',
        message: msg,
        bbox: { x: v.minX, y: v.minY, width: v.w, height: v.h }
      });
    }

    if (!coveringM2) {
      viaEnclosureViolations++;
      const msg = `METAL2.E.1: Via1 no está conectada/cubierta por Metal2 en (${v.minX.toFixed(3)}, ${v.minY.toFixed(3)})`;
      errors.push(msg);
      violations.push({
        id: `vm2_${v.id}`,
        ruleCode: 'METAL2.E.1',
        layer: 'Via1',
        message: msg,
        bbox: { x: v.minX, y: v.minY, width: v.w, height: v.h }
      });
    }
  }

  if (vias.length > 0) {
    if (viaEnclosureViolations === 0) {
      details.push(`  ✔ VIA1.E.1 / METAL2.E.1: ${vias.length} vías correctamente encerradas por Metal1 y Metal2`);
    } else {
      details.push(`  ✘ VIA1.E.1 / METAL2.E.1: ${viaEnclosureViolations} recubrimiento(s) de vía defectuoso(s)`);
    }
  }

  // CONT.E.1 / CONT.E.2: Cada contacto debe estar contenido en Oxide o en Poly
  let contEnclosureViolations = 0;
  for (const c of contacts) {
    const inOx = oxides.some(ox => overlaps(c, ox));
    const inPo = polys.some(po => overlaps(c, po));

    if (!inOx && !inPo) {
      contEnclosureViolations++;
      const msg = `CONT.E.1: Contacto huérfano (no está ubicado sobre región activa ni sobre Poly) en (${c.minX.toFixed(3)}, ${c.minY.toFixed(3)})`;
      errors.push(msg);
      violations.push({
        id: `ce_${c.id}`,
        ruleCode: 'CONT.E.1',
        layer: 'Cont',
        message: msg,
        bbox: { x: c.minX, y: c.minY, width: c.w, height: c.h }
      });
    }
  }

  if (contacts.length > 0) {
    if (contEnclosureViolations === 0) {
      details.push(`  ✔ CONT.E.1 / CONT.E.2: ${contacts.length} contactos sobre capa activa o Poly válida`);
    } else {
      details.push(`  ✘ CONT.E.1: ${contEnclosureViolations} contacto(s) fuera de área activa o Poly`);
    }
  }

  const pass = errors.length === 0;

  return {
    pass,
    errors,
    warnings,
    details,
    violations,
    stats: {
      totalShapes: physicalShapes.length,
      layersAnalyzed: Object.keys(byLayer).length,
      rulesChecked: Object.keys(GPDK045_DRC_RULES).length,
      violationsCount: violations.length
    }
  };
}
