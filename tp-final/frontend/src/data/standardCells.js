export const standardCells = [
  {
    id: 'lib_nmos_min',
    name: 'nmos_min',
    description: 'Minimum size NMOS (W=120n, L=45n) with Pwell body tie (DRC clean)',
    isLibrary: true,
    shapes: [
      // Active OD: W=0.12, L_total=0.1+0.045+0.1=0.245
      { id: 'nmos_act',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      // N+ Implant covers source/drain active
      { id: 'nmos_nimp',  layerId: 'Nimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      // Poly gate with >= 0.10um end-cap extensions (POLY.E.1)
      { id: 'nmos_poly',  layerId: 'Poly',   x: 0.1,   y: -0.10, width: 0.045, height: 0.32 },
      // Source Contact
      { id: 'nmos_cs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      // Drain Contact
      { id: 'nmos_cd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      // Metal1 Source
      { id: 'nmos_m1s',   layerId: 'Metal1', x: 0.01,  y: 0.02,  width: 0.08,  height: 0.08 },
      // Metal1 Drain
      { id: 'nmos_m1d',   layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.08 },
      // Pwell body tie: P+ active, contact, Metal1 for VSS connection (OXIDE.SP.1 & PIMP.W.1 compliant)
      { id: 'nmos_bact',  layerId: 'Oxide',  x: 0,     y: 0.25,  width: 0.245, height: 0.10 },
      { id: 'nmos_bpimp', layerId: 'Pimp',   x: -0.02, y: 0.23,  width: 0.285, height: 0.14 },
      { id: 'nmos_bct',   layerId: 'Cont',   x: 0.09,  y: 0.27,  width: 0.06,  height: 0.06 },
      { id: 'nmos_bm1',   layerId: 'Metal1', x: 0.08,  y: 0.26,  width: 0.08,  height: 0.08 }
    ]
  },
  {
    id: 'lib_pmos_min',
    name: 'pmos_min',
    description: 'Minimum size PMOS (W=120n, L=45n) with Nwell body tie (DRC clean)',
    isLibrary: true,
    shapes: [
      // N-Well enclosing PMOS and body tie
      { id: 'pmos_nwell', layerId: 'Nwell',  x: -0.1,  y: -0.32, width: 0.445, height: 0.58 },
      // Active
      { id: 'pmos_act',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      // P+ Implant covers source/drain active
      { id: 'pmos_pimp',  layerId: 'Pimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      // Poly gate with >= 0.10um end-cap extensions (POLY.E.1)
      { id: 'pmos_poly',  layerId: 'Poly',   x: 0.1,   y: -0.10, width: 0.045, height: 0.32 },
      // Source Contact
      { id: 'pmos_cs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      // Drain Contact
      { id: 'pmos_cd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      // Metal1 Source
      { id: 'pmos_m1s',   layerId: 'Metal1', x: 0.01,  y: 0.02,  width: 0.08,  height: 0.08 },
      // Metal1 Drain
      { id: 'pmos_m1d',   layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.08 },
      // Nwell body tie: N+ active, contact, Metal1 for VDD connection (OXIDE.SP.1 & NIMP.W.1 compliant)
      { id: 'pmos_bact',  layerId: 'Oxide',  x: 0,     y: -0.25, width: 0.245, height: 0.10 },
      { id: 'pmos_bnimp', layerId: 'Nimp',   x: -0.02, y: -0.27, width: 0.285, height: 0.14 },
      { id: 'pmos_bct',   layerId: 'Cont',   x: 0.09,  y: -0.23, width: 0.06,  height: 0.06 },
      { id: 'pmos_bm1',   layerId: 'Metal1', x: 0.08,  y: -0.24, width: 0.08,  height: 0.08 }
    ]
  },
  {
    id: 'lib_inv_cmos',
    name: 'inv_cmos',
    description: 'Inversor CMOS completo (DRC & LVS ready, 100% verificado)',
    isLibrary: true,
    shapes: [
      // ── PMOS en parte superior (y ~ 0) ──
      // Nwell cubre activo PMOS y activo de contacto a Nwell (VDD)
      { id: 'inv_nwell',  layerId: 'Nwell',  x: -0.10, y: -0.32, width: 0.445, height: 0.58 },
      // Activo PMOS
      { id: 'inv_pact',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      // P+ Implant para canal PMOS S/D
      { id: 'inv_ppimp',  layerId: 'Pimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      // Contacto de Source PMOS (a VDD)
      { id: 'inv_pcs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      // Contacto de Drain PMOS (a OUT)
      { id: 'inv_pcd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      // Activo de Body tie para Nwell (conectado a VDD)
      { id: 'inv_pbact',  layerId: 'Oxide',  x: 0,     y: -0.25, width: 0.245, height: 0.10 },
      // N+ Implant para body tie de Nwell
      { id: 'inv_pbnimp', layerId: 'Nimp',   x: -0.02, y: -0.27, width: 0.285, height: 0.14 },
      // Contacto de Body tie Nwell
      { id: 'inv_pbct',   layerId: 'Cont',   x: 0.02,  y: -0.23, width: 0.06,  height: 0.06 },

      // VDD Rail (Metal1): conecta Source PMOS y Body tie Nwell verticalmente a la izquierda
      { id: 'inv_vdd_m1', layerId: 'Metal1', x: 0.01,  y: -0.25, width: 0.08,  height: 0.36 },
      { id: 'inv_pin_vdd',layerId: 'PinM1',  x: 0.01,  y: -0.25, width: 0.08,  height: 0.08, label: 'VDD' },

      // ── NMOS en parte inferior (y ~ 0.60) ──
      // Activo NMOS
      { id: 'inv_nact',   layerId: 'Oxide',  x: 0,     y: 0.60,  width: 0.245, height: 0.12 },
      // N+ Implant para canal NMOS S/D
      { id: 'inv_nnimp',  layerId: 'Nimp',   x: -0.02, y: 0.58,  width: 0.285, height: 0.16 },
      // Contacto de Source NMOS (a VSS)
      { id: 'inv_ncs',    layerId: 'Cont',   x: 0.02,  y: 0.63,  width: 0.06,  height: 0.06 },
      // Contacto de Drain NMOS (a OUT)
      { id: 'inv_ncd',    layerId: 'Cont',   x: 0.165, y: 0.63,  width: 0.06,  height: 0.06 },
      // Activo de Body tie para Pwell / Substrato (conectado a VSS)
      { id: 'inv_nbact',  layerId: 'Oxide',  x: 0,     y: 0.85,  width: 0.245, height: 0.10 },
      // P+ Implant para body tie Pwell
      { id: 'inv_nbpimp', layerId: 'Pimp',   x: -0.02, y: 0.83,  width: 0.285, height: 0.14 },
      // Contacto de Body tie Pwell
      { id: 'inv_nbct',   layerId: 'Cont',   x: 0.02,  y: 0.87,  width: 0.06,  height: 0.06 },

      // VSS Rail (Metal1): conecta Source NMOS y Body tie Pwell verticalmente a la izquierda
      { id: 'inv_vss_m1', layerId: 'Metal1', x: 0.01,  y: 0.61,  width: 0.08,  height: 0.34 },
      { id: 'inv_pin_vss',layerId: 'PinM1',  x: 0.01,  y: 0.87,  width: 0.08,  height: 0.08, label: 'VSS' },

      // ── GATE & INPUT (IN) ──
      // Línea Poly vertical que conecta ambos gates con extensiones >= 0.10 um en extremos
      { id: 'inv_poly_v', layerId: 'Poly',   x: 0.10,  y: -0.10, width: 0.045, height: 0.92 },
      // Pad de Poly hacia la izquierda para ubicar el contacto de entrada
      { id: 'inv_poly_pad',layerId:'Poly',   x: -0.04, y: 0.32,  width: 0.185, height: 0.10 },
      // Contacto de entrada
      { id: 'inv_in_ct',  layerId: 'Cont',   x: -0.02, y: 0.34,  width: 0.06,  height: 0.06 },
      // Metal1 de entrada
      { id: 'inv_in_m1',  layerId: 'Metal1', x: -0.03, y: 0.33,  width: 0.08,  height: 0.08 },
      { id: 'inv_pin_in', layerId: 'PinM1',  x: -0.03, y: 0.33,  width: 0.08,  height: 0.08, label: 'IN' },

      // ── OUTPUT (OUT) ──
      // Metal1 vertical que conecta PMOS Drain y NMOS Drain
      { id: 'inv_out_m1', layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.69 },
      { id: 'inv_pin_out',layerId: 'PinM1',  x: 0.155, y: 0.33,  width: 0.08,  height: 0.08, label: 'OUT' }
    ]
  }
];
