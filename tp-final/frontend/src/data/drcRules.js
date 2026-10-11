/**
 * drcRules.js
 * Reglas de diseño (DRC) extraídas de assuraDRC.rul para el PDK GPDK045 (45nm).
 */

export const GPDK045_DRC_RULES = {
  // ── NWELL ───────────────────────────────────────────────────────────
  'NWELL.W.1': {
    code: 'NW.W.1',
    layer: 'Nwell',
    type: 'minWidth',
    value: 0.30,
    unit: 'µm',
    description: 'Ancho mínimo de Nwell >= 0.30 µm',
    source: 'assuraDRC.rul (NW.W.1)'
  },
  'NWELL.SP.1': {
    code: 'NW.SP.1',
    layer: 'Nwell',
    type: 'minSpacing',
    value: 0.30,
    unit: 'µm',
    description: 'Espaciado mínimo Nwell a Nwell >= 0.30 µm',
    source: 'assuraDRC.rul (NW.SP.1)'
  },

  // ── ACTIVE (OXIDE) ──────────────────────────────────────────────────
  'OXIDE.W.1': {
    code: 'OXIDE.W.1',
    layer: 'Oxide',
    type: 'minWidth',
    value: 0.05,
    unit: 'µm',
    description: 'Ancho mínimo de Región Activa (Oxide) >= 0.05 µm',
    source: 'assuraDRC.rul (OXIDE.W.1)'
  },
  'OXIDE.SP.1': {
    code: 'OXIDE.SP.1',
    layer: 'Oxide',
    type: 'minSpacing',
    value: 0.08,
    unit: 'µm',
    description: 'Espaciado mínimo entre regiones activas (Oxide) >= 0.08 µm',
    source: 'assuraDRC.rul (OXIDE.SP.1)'
  },

  // ── POLY (GATE & INTERCONNECT) ──────────────────────────────────────
  'POLY.W.1': {
    code: 'POLY.W.1',
    layer: 'Poly',
    type: 'minWidth',
    value: 0.045,
    unit: 'µm',
    description: 'Ancho mínimo de gate Poly / interconexión >= 0.045 µm (45nm)',
    source: 'assuraDRC.rul (POLY.W.1 / POLY.W.5)'
  },
  'POLY.SP.2': {
    code: 'POLY.SP.2',
    layer: 'Poly',
    type: 'minSpacing',
    value: 0.06,
    unit: 'µm',
    description: 'Espaciado mínimo entre líneas de Poly >= 0.06 µm',
    source: 'assuraDRC.rul (POLY.SP.2 / POLY.SP.3)'
  },
  'POLY.E.1': {
    code: 'POLY.E.1',
    layer: 'Poly',
    toLayer: 'Oxide',
    type: 'gateExtension',
    value: 0.10,
    unit: 'µm',
    description: 'Extensión mínima de gate Poly más allá de Oxide (end cap) >= 0.10 µm',
    source: 'assuraDRC.rul (POLY.E.1)'
  },
  'POLY.E.3': {
    code: 'POLY.E.3',
    layer: 'Oxide',
    toLayer: 'Poly',
    type: 'sdExtension',
    value: 0.08,
    unit: 'µm',
    description: 'Extensión mínima de Oxide (Source/Drain) más allá del gate >= 0.08 µm',
    source: 'assuraDRC.rul (POLY.E.3)'
  },

  // ── CONTACT (CONT) ──────────────────────────────────────────────────
  'CONT.W.1': {
    code: 'CONT.W.1',
    layer: 'Cont',
    type: 'fixedSize',
    width: 0.06,
    height: 0.06,
    unit: 'µm',
    description: 'Dimensiones fijas de Contacto == 0.06 x 0.06 µm',
    source: 'assuraDRC.rul (CONT.W.1)'
  },
  'CONT.SP.1': {
    code: 'CONT.SP.1',
    layer: 'Cont',
    type: 'minSpacing',
    value: 0.06,
    unit: 'µm',
    description: 'Espaciado mínimo entre Contactos >= 0.06 µm',
    source: 'assuraDRC.rul (CONT.SP.1)'
  },
  'CONT.E.1': {
    code: 'CONT.E.1',
    layer: 'Oxide',
    toLayer: 'Cont',
    type: 'enclosure',
    value: 0.02,
    unit: 'µm',
    description: 'Recubrimiento mínimo de Oxide sobre Contacto >= 0.02 µm',
    source: 'assuraDRC.rul (CONT.E.1)'
  },
  'CONT.E.2': {
    code: 'CONT.E.2',
    layer: 'Poly',
    toLayer: 'Cont',
    type: 'enclosure',
    value: 0.02,
    unit: 'µm',
    description: 'Recubrimiento mínimo de Poly sobre Contacto >= 0.02 µm',
    source: 'assuraDRC.rul (CONT.E.2)'
  },
  'CONT.X.1': {
    code: 'CONT.X.1',
    type: 'exclusion',
    description: 'Contacto directamente sobre el canal del transistor (cruce Poly/Oxide) prohibido',
    source: 'assuraDRC.rul (CONT.X.1)'
  },

  // ── METAL1 ──────────────────────────────────────────────────────────
  'METAL1.W.1': {
    code: 'METAL1.W.1',
    layer: 'Metal1',
    type: 'minWidth',
    value: 0.06,
    unit: 'µm',
    description: 'Ancho mínimo de Metal1 >= 0.06 µm',
    source: 'assuraDRC.rul (METAL1.W.1)'
  },
  'METAL1.SP.1': {
    code: 'METAL1.SP.1',
    layer: 'Metal1',
    type: 'minSpacing',
    value: 0.06,
    unit: 'µm',
    description: 'Espaciado mínimo entre Metal1 >= 0.06 µm',
    source: 'assuraDRC.rul (METAL1.SP.1.1)'
  },
  'METAL1.E.1': {
    code: 'METAL1.E.1',
    layer: 'Metal1',
    toLayer: 'Cont',
    type: 'enclosure',
    value: 0.005,
    unit: 'µm',
    description: 'Recubrimiento mínimo de Metal1 sobre Contacto >= 0.005 µm',
    source: 'assuraDRC.rul (METAL1.E.1)'
  },

  // ── VIA1 ────────────────────────────────────────────────────────────
  'VIA1.W.1': {
    code: 'VIA1.W.1',
    layer: 'Via1',
    type: 'fixedSize',
    width: 0.07,
    height: 0.07,
    unit: 'µm',
    description: 'Dimensiones fijas de Via1 == 0.07 x 0.07 µm',
    source: 'assuraDRC.rul (VIA1.W.1)'
  },
  'VIA1.SP.1': {
    code: 'VIA1.SP.1',
    layer: 'Via1',
    type: 'minSpacing',
    value: 0.07,
    unit: 'µm',
    description: 'Espaciado mínimo entre Via1 >= 0.07 µm',
    source: 'assuraDRC.rul (VIA1.SP.1)'
  },
  'VIA1.E.1': {
    code: 'VIA1.E.1',
    layer: 'Metal1',
    toLayer: 'Via1',
    type: 'enclosure',
    value: 0.005,
    unit: 'µm',
    description: 'Recubrimiento mínimo de Metal1 sobre Via1 >= 0.005 µm',
    source: 'assuraDRC.rul (VIA1.E.1)'
  },
  'METAL2.E.1': {
    code: 'METAL2.E.1',
    layer: 'Metal2',
    toLayer: 'Via1',
    type: 'enclosure',
    value: 0.005,
    unit: 'µm',
    description: 'Recubrimiento mínimo de Metal2 sobre Via1 >= 0.005 µm',
    source: 'assuraDRC.rul (METAL2.E.1)'
  },

  // ── METAL2 ──────────────────────────────────────────────────────────
  'METAL2.W.1': {
    code: 'METAL2.W.1',
    layer: 'Metal2',
    type: 'minWidth',
    value: 0.08,
    unit: 'µm',
    description: 'Ancho mínimo de Metal2 >= 0.08 µm',
    source: 'assuraDRC.rul (METAL2.W.1)'
  },
  'METAL2.SP.1': {
    code: 'METAL2.SP.1',
    layer: 'Metal2',
    type: 'minSpacing',
    value: 0.07,
    unit: 'µm',
    description: 'Espaciado mínimo entre Metal2 >= 0.07 µm',
    source: 'assuraDRC.rul (METAL2.SP.1.1)'
  },

  // ── IMPLANTS (NIMP & PIMP) ──────────────────────────────────────────
  'NIMP.W.1': {
    code: 'NIMP.W.1',
    layer: 'Nimp',
    type: 'minWidth',
    value: 0.12,
    unit: 'µm',
    description: 'Ancho mínimo de N+ Implant (Nimp) >= 0.12 µm',
    source: 'assuraDRC.rul (NIMP.W.1)'
  },
  'PIMP.W.1': {
    code: 'PIMP.W.1',
    layer: 'Pimp',
    type: 'minWidth',
    value: 0.12,
    unit: 'µm',
    description: 'Ancho mínimo de P+ Implant (Pimp) >= 0.12 µm',
    source: 'assuraDRC.rul (PIMP.W.1)'
  },
  'NIMP.X.1': {
    code: 'NIMP.X.1',
    type: 'overlapExclusion',
    layerA: 'Nimp',
    layerB: 'Pimp',
    description: 'Solapamiento directo entre Nimp y Pimp prohibido',
    source: 'assuraDRC.rul (NIMP.X.1)'
  }
};
