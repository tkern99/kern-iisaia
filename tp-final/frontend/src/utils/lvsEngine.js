/**
 * lvsEngine.js
 * Compares extracted layout netlist against a schematic reference.
 *
 * Algorithm:
 * 1. Count devices by type in layout vs schematic
 * 2. Match layout pins (by name from PinM1/PinM2 shapes) to schematic pins
 * 3. Match devices and connectivity:
 *    - Resolves known pins (VDD, VSS, IN, OUT, A, B)
 *    - Automatically tracks internal nets (e.g. intermediate node in series transistors)
 *    - Handles Drain/Source MOSFET symmetry
 *    - Supports symmetric input pin permutations (A/B interchangeability in logic gates)
 * 4. Build a detailed educational report
 */

function matchTopology(layoutDevs, schDevices, basePinNetMap) {
  const pinNetMap = { ...basePinNetMap };
  const usedLayoutDevs = new Set();
  const matchedList = [];
  const errors = [];
  const details = [];

  for (const schDev of schDevices) {
    let bestMatch = null;
    let bestIdx = -1;
    let newlyMappedInternalNets = {};

    for (let idx = 0; idx < layoutDevs.length; idx++) {
      if (usedLayoutDevs.has(idx)) continue;
      const ld = layoutDevs[idx];
      if (ld.type !== schDev.type) continue;

      // Gate and Body check
      const expectedG = pinNetMap[schDev.terminals.G];
      const expectedB = pinNetMap[schDev.terminals.B];

      if (expectedG !== undefined && expectedG !== null && ld.G !== expectedG) continue;
      if (expectedB !== undefined && expectedB !== null && ld.B !== expectedB) continue;

      // Drain and Source check (MOSFET D/S are symmetric)
      const expectedD = pinNetMap[schDev.terminals.D];
      const expectedS = pinNetMap[schDev.terminals.S];

      let dsMatch = false;
      let discoveredInternal = {};

      // Case 1: direct (ld.D matches D, ld.S matches S)
      const dMatches = (expectedD === undefined || expectedD === null) || (ld.D === expectedD);
      const sMatches = (expectedS === undefined || expectedS === null) || (ld.S === expectedS);

      // Case 2: swapped (ld.D matches S, ld.S matches D)
      const dSwappedMatches = (expectedS === undefined || expectedS === null) || (ld.D === expectedS);
      const sSwappedMatches = (expectedD === undefined || expectedD === null) || (ld.S === expectedD);

      if (dMatches && sMatches) {
        dsMatch = true;
        if ((expectedD === undefined || expectedD === null) && ld.D !== undefined) {
          discoveredInternal[schDev.terminals.D] = ld.D;
        }
        if ((expectedS === undefined || expectedS === null) && ld.S !== undefined) {
          discoveredInternal[schDev.terminals.S] = ld.S;
        }
      } else if (dSwappedMatches && sSwappedMatches) {
        dsMatch = true;
        if ((expectedS === undefined || expectedS === null) && ld.D !== undefined) {
          discoveredInternal[schDev.terminals.S] = ld.D;
        }
        if ((expectedD === undefined || expectedD === null) && ld.S !== undefined) {
          discoveredInternal[schDev.terminals.D] = ld.S;
        }
      }

      if (dsMatch) {
        bestMatch = ld;
        bestIdx = idx;
        newlyMappedInternalNets = discoveredInternal;
        break;
      }
    }

    if (bestMatch) {
      usedLayoutDevs.add(bestIdx);
      Object.assign(pinNetMap, newlyMappedInternalNets);
      matchedList.push({ schDev, ld: bestMatch });
      details.push(
        `  ${schDev.name} (${schDev.type}): G=net#${bestMatch.G ?? '?'} D=net#${bestMatch.D ?? '?'} ` +
        `S=net#${bestMatch.S ?? '?'} B=net#${bestMatch.B ?? '?'}  ✔`
      );
    } else {
      const termStr = Object.entries(schDev.terminals)
        .map(([t, n]) => `${t}=${n}(net#${pinNetMap[n] ?? '?'})`)
        .join(', ');
      errors.push(`${schDev.name} (${schDev.type}): no se encontró dispositivo coincidente`);
      details.push(`  ${schDev.name}: NO MATCH — esperado ${termStr} ✘`);
    }
  }

  return { pass: errors.length === 0, errors, details, matchedList };
}

/**
 * @param {{ devices, pins, nets }} layoutNetlist
 * @param {Object} schematic  - entry from schematicNetlists
 * @returns {{ pass: boolean, errors: string[], warnings: string[], details: string[] }}
 */
export function runLVS(layoutNetlist, schematic) {
  const errors   = [];
  const warnings = [];
  const details  = [];

  const { devices: layoutDevs, pins: layoutPins } = layoutNetlist;

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

  // Try direct pin match
  let result = matchTopology(layoutDevs, schematic.devices, pinNetMap);

  // If failed and schematic has symmetric inputs 'A' and 'B', try swapped permutation
  if (!result.pass && pinNetMap['A'] !== undefined && pinNetMap['B'] !== undefined) {
    const swappedPins = { ...pinNetMap, A: pinNetMap['B'], B: pinNetMap['A'] };
    const altResult = matchTopology(layoutDevs, schematic.devices, swappedPins);
    if (altResult.pass || altResult.errors.length < result.errors.length) {
      result = altResult;
    }
  }

  details.push(...result.details);
  errors.push(...result.errors);

  const pass = errors.length === 0;
  return { pass, errors, warnings, details };
}
