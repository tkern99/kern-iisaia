/**
 * netlistExtractor.js
 * Extracts a netlist from a flat list of layout shapes using geometric BFS.
 * Returns: { nets, devices, pins }
 *
 * Net identification:
 *   - Two shapes are connected if they physically overlap AND their layer pair is electrically adjacent
 *   - Poly splits OD to model transistor channel barriers
 *
 * Device identification:
 *   - NMOS: Poly overlaps Oxide that has Nimp (and no Nwell)
 *   - PMOS: Poly overlaps Oxide that has Pimp (and Nwell)
 *
 * Terminals per device:
 *   G = net touching the poly
 *   D/S = nets touching the two separate OD segments on each side of poly (D/S are interchangeable)
 *   B = body net (Pimp/Nwell tie metal connected to the body OD)
 */

function shapesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function adjacentLayers(layerA, layerB) {
  if (layerA === layerB) return true;
  const pairs = [
    ['Metal1', 'Cont'],
    ['Poly',   'Cont'],
    ['Oxide',  'Cont'],
    ['Metal2', 'Via1'],
    ['Metal1', 'Via1'],
    ['PinM1',  'Metal1'],
    ['PinM2',  'Metal2'],
  ];
  return pairs.some(([a, b]) =>
    (layerA === a && layerB === b) || (layerA === b && layerB === a)
  );
}

/**
 * Split OD shapes at every Poly intersection to model transistor barriers.
 * Returns a new list where each OD crossing a Poly is replaced by up to 4 sub-rects.
 */
function splitOxideByPoly(shapes) {
  const polys  = shapes.filter(s => s.layerId === 'Poly');
  const oxides = shapes.filter(s => s.layerId === 'Oxide');
  const others = shapes.filter(s => s.layerId !== 'Oxide');

  let effectiveOxides = [...oxides];

  for (const poly of polys) {
    const next = [];
    for (const ox of effectiveOxides) {
      if (!shapesOverlap(poly, ox)) {
        next.push(ox);
        continue;
      }
      const ix  = Math.max(ox.x, poly.x);
      const iy  = Math.max(ox.y, poly.y);
      const iw  = Math.min(ox.x + ox.width,  poly.x + poly.width)  - ix;
      const ih  = Math.min(ox.y + ox.height, poly.y + poly.height) - iy;

      if (iy > ox.y)
        next.push({ ...ox, height: iy - ox.y, id: ox.id + '-t' });
      if (iy + ih < ox.y + ox.height)
        next.push({ ...ox, y: iy + ih, height: (ox.y + ox.height) - (iy + ih), id: ox.id + '-b' });
      if (ix > ox.x)
        next.push({ ...ox, width: ix - ox.x, y: iy, height: ih, id: ox.id + '-l' });
      if (ix + iw < ox.x + ox.width)
        next.push({ ...ox, x: ix + iw, width: (ox.x + ox.width) - (ix + iw), y: iy, height: ih, id: ox.id + '-r' });
    }
    effectiveOxides = next;
  }

  return [...others, ...polys, ...effectiveOxides];
}

/**
 * BFS connectivity pass.
 * Returns an array of nets, each net being a Set of shape IDs.
 */
function buildNets(effectiveShapes) {
  const visited = new Map(); // shapeId -> netIndex
  const nets = [];

  for (const seed of effectiveShapes) {
    if (visited.has(seed.id)) continue;

    const netIdx = nets.length;
    const net = new Set();
    nets.push(net);

    const queue = [seed];
    net.add(seed.id);
    visited.set(seed.id, netIdx);

    while (queue.length) {
      const current = queue.shift();
      for (const other of effectiveShapes) {
        if (visited.has(other.id)) continue;
        if (adjacentLayers(current.layerId, other.layerId) && shapesOverlap(current, other)) {
          net.add(other.id);
          visited.set(other.id, netIdx);
          queue.push(other);
        }
      }
    }
  }

  return nets; // nets[i] = Set<id>
}

/**
 * Identify transistors from the layout.
 * Strategy:
 *   For each Poly shape, find OD shapes it crosses.
 *   For each such OD, determine if it carries Nimp (NMOS) or Pimp (PMOS).
 *   Each crossing = one transistor.
 *
 * Terminal assignment uses effectiveShapes netIds:
 *   G = netId of the poly shape
 *   D, S = netIds of the two OD fragments created by the split (left/right or top/bottom)
 *   B = for NMOS: net of the Pimp/body-tie active touching same area
 *      for PMOS: net of the Nimp/body-tie active inside Nwell
 */
function identifyDevices(shapes, effectiveShapes, shapeNetMap) {
  const polys  = shapes.filter(s => s.layerId === 'Poly');
  const oxides = shapes.filter(s => s.layerId === 'Oxide');
  const nimps  = shapes.filter(s => s.layerId === 'Nimp');
  const pimps  = shapes.filter(s => s.layerId === 'Pimp');
  const nwells = shapes.filter(s => s.layerId === 'Nwell');

  const devices = [];

  for (const poly of polys) {
    for (const ox of oxides) {
      if (!shapesOverlap(poly, ox)) continue;

      // Determine device type by implant
      const hasNimp  = nimps.some(ni => shapesOverlap(ni, ox));
      const hasPimp  = pimps.some(pi => shapesOverlap(pi, ox));
      const hasNwell = nwells.some(nw => shapesOverlap(nw, ox));

      const type = (hasPimp && hasNwell) ? 'PMOS' : (hasNimp ? 'NMOS' : null);
      if (!type) continue;

      // Gate net = poly net
      const gateNet = shapeNetMap.get(poly.id);

      // Source/Drain = OD fragments that are NOT under the poly (the two sides of the channel)
      const fragments = effectiveShapes.filter(s =>
        s.layerId === 'Oxide' &&
        s.id.startsWith(ox.id + '-') &&
        !shapesOverlap(poly, s)
      );

      const terminalNets = [...new Set(fragments.map(f => shapeNetMap.get(f.id)).filter(n => n !== undefined))];
      const d = terminalNets[0] ?? null;
      const s_ = terminalNets[1] ?? null;

      // Body net: for NMOS find a Pimp OD (body tie active) connected near this transistor
      // For PMOS find a Nimp OD (nwell tie active)
      let bodyNet = null;
      if (type === 'NMOS') {
        // Body tie is a Pimp-covered OD near this transistor's OD
        const bodyOD = oxides.find(bod =>
          bod.id !== ox.id &&
          pimps.some(pi => shapesOverlap(pi, bod)) &&
          !nwells.some(nw => shapesOverlap(nw, bod))
        );
        if (bodyOD) bodyNet = shapeNetMap.get(bodyOD.id);
      } else {
        // PMOS body tie: Nimp OD inside same Nwell
        const myNwell = nwells.find(nw => shapesOverlap(nw, ox));
        if (myNwell) {
          const bodyOD = oxides.find(bod =>
            bod.id !== ox.id &&
            shapesOverlap(myNwell, bod) &&
            nimps.some(ni => shapesOverlap(ni, bod))
          );
          if (bodyOD) bodyNet = shapeNetMap.get(bodyOD.id);
        }
      }

      devices.push({
        type,
        polyId: poly.id,
        oxId:   ox.id,
        G: gateNet,
        D: d,
        S: s_,
        B: bodyNet
      });
    }
  }

  return devices;
}

/**
 * Identify named pins from PinM1/PinM2 shapes.
 * A pin's net is the net of the corresponding Metal1/Metal2 shape it overlaps.
 * Pin "name" is stored in the shape's `label` property (set by the user).
 */
function identifyPins(shapes, effectiveShapes, shapeNetMap) {
  const pinShapes = shapes.filter(s => s.layerId === 'PinM1' || s.layerId === 'PinM2');
  return pinShapes.map(pin => ({
    name: pin.label || pin.id,
    layerId: pin.layerId,
    netId: shapeNetMap.get(pin.id)
  }));
}

/**
 * Main entry point.
 * @param {Array} shapes  - flat array of shape objects from useLayoutStore
 * @returns {{ nets: Set[], devices: Array, pins: Array, shapeNetMap: Map }}
 */
export function extractNetlist(shapes) {
  const effectiveShapes = splitOxideByPoly(shapes);
  const nets = buildNets(effectiveShapes);

  // Build a reverse map: shapeId -> netIndex
  const shapeNetMap = new Map();
  nets.forEach((net, idx) => net.forEach(id => shapeNetMap.set(id, idx)));

  const devices = identifyDevices(shapes, effectiveShapes, shapeNetMap);
  const pins = identifyPins(shapes, effectiveShapes, shapeNetMap);

  return { nets, devices, pins, shapeNetMap };
}
