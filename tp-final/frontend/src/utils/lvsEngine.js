/**
 * lvsEngine.js
 * Compares extracted layout netlist against a schematic reference.
 *
 * Algorithm:
 * 1. Count devices by type in layout vs schematic
 * 2. Match layout pins (by name from PinM1/PinM2 shapes) to schematic pins
 * 3. For each schematic device, find a layout device with matching type
 *    and matching terminal connectivity relative to matched pins
 * 4. Build a detailed report
 */

/**
 * @param {{ devices, pins, nets }} layoutNetlist
 * @param {Object} schematic  - entry from schematicNetlists
 * @returns {{ pass: boolean, errors: string[], warnings: string[], details: string[] }}
 */
export function runLVS(layoutNetlist, schematic) {
  const errors   = [];
  const warnings = [];
  const details  = [];

  const { devices: layoutDevs, pins: layoutPins, nets } = layoutNetlist;

  // ─── 1. Device count check ──────────────────────────────────────────────────
  const schTypes = {};
  for (const d of schematic.devices) {
    schTypes[d.type] = (schTypes[d.type] || 0) + 1;
  }
  const layTypes = {};
  for (const d of layoutDevs) {
    layTypes[d.type] = (layTypes[d.type] || 0) + 1;
  }

  details.push('── Conteo de dispositivos ──────────────────────────────');
  for (const [type, count] of Object.entries(schTypes)) {
    const found = layTypes[type] || 0;
    const ok = found === count;
    details.push(`  ${type}: esquemático=${count}, layout=${found}  ${ok ? '✔' : '✘'}`);
    if (!ok) errors.push(`Conteo incorrecto de ${type}: se esperan ${count}, se encontraron ${found}`);
  }
  for (const [type, count] of Object.entries(layTypes)) {
    if (!schTypes[type]) {
      details.push(`  ${type}: layout=${count} (NO en esquemático) ✘`);
      errors.push(`Dispositivo extra en layout: ${type} x${count}`);
    }
  }

  // ─── 2. Pin check ───────────────────────────────────────────────────────────
  details.push('── Pines ───────────────────────────────────────────────');
  const pinNetMap = {}; // pinName -> netId
  for (const schPin of schematic.pins) {
    const layPin = layoutPins.find(p => p.name === schPin);
    if (!layPin) {
      details.push(`  PIN ${schPin}: NO ENCONTRADO ✘`);
      errors.push(`Pin faltante: "${schPin}"`);
    } else {
      pinNetMap[schPin] = layPin.netId;
      details.push(`  PIN ${schPin}: net #${layPin.netId}  ✔`);
    }
  }

  // Extra pins in layout not in schematic
  for (const lp of layoutPins) {
    if (!schematic.pins.includes(lp.name)) {
      warnings.push(`Pin extra en layout: "${lp.name}" (no está en el esquemático)`);
      details.push(`  PIN ${lp.name}: EXTRA en layout ⚠`);
    }
  }

  // ─── 3. Device connectivity check ──────────────────────────────────────────
  details.push('── Conectividad de dispositivos ────────────────────────');
  const usedLayoutDevs = new Set();

  for (const schDev of schematic.devices) {
    // Resolve schematic terminal names to layout netIds via pinNetMap
    const schResolved = {};
    let resolveOk = true;
    for (const [term, netName] of Object.entries(schDev.terminals)) {
      if (pinNetMap[netName] !== undefined) {
        schResolved[term] = pinNetMap[netName];
      } else {
        // Internal net - we can only partially check topology
        schResolved[term] = null;
        resolveOk = false;
      }
    }

    // Find a matching layout device
    const match = layoutDevs.find((ld, idx) => {
      if (usedLayoutDevs.has(idx)) return false;
      if (ld.type !== schDev.type) return false;
      // Check terminals that we could resolve to netIds
      for (const [term, expectedNetId] of Object.entries(schResolved)) {
        if (expectedNetId === null) continue; // skip unresolved internal nets
        const layoutNetId = ld[term];
        // Accept D/S swap (they're symmetric in a MOSFET)
        if (term === 'D' || term === 'S') {
          const match = layoutNetId === expectedNetId ||
                        ld.D === schResolved.S || ld.S === schResolved.D;
          if (!match) return false;
        } else {
          if (layoutNetId !== expectedNetId) return false;
        }
      }
      return true;
    });

    if (!match) {
      const termStr = Object.entries(schDev.terminals)
        .map(([t, n]) => `${t}=${n}(net#${pinNetMap[n] ?? '?'})`)
        .join(', ');
      errors.push(`${schDev.name} (${schDev.type}): no se encontró dispositivo coincidente`);
      details.push(`  ${schDev.name}: NO MATCH — esperado ${termStr} ✘`);
    } else {
      const idx = layoutDevs.indexOf(match);
      usedLayoutDevs.add(idx);
      details.push(
        `  ${schDev.name} (${schDev.type}): G=net#${match.G ?? '?'} D=net#${match.D ?? '?'} ` +
        `S=net#${match.S ?? '?'} B=net#${match.B ?? '?'}  ✔`
      );
    }
  }

  const pass = errors.length === 0;
  return { pass, errors, warnings, details };
}
