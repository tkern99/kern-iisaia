export const standardCells = [
  {
    id: 'lib_nmos_min',
    name: 'nmos_min',
    description: 'Minimum size NMOS (W=120n, L=45n) with Pwell body tie',
    isLibrary: true,
    shapes: [
      // Active OD: W=0.12, L_total=0.1+0.045+0.1=0.245
      { id: 'nmos_act',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      // N+ Implant covers source/drain active
      { id: 'nmos_nimp',  layerId: 'Nimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      // Poly gate
      { id: 'nmos_poly',  layerId: 'Poly',   x: 0.1,   y: -0.06, width: 0.045, height: 0.24 },
      // Source Contact
      { id: 'nmos_cs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      // Drain Contact
      { id: 'nmos_cd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      // Metal1 Source
      { id: 'nmos_m1s',   layerId: 'Metal1', x: 0.01,  y: 0.02,  width: 0.08,  height: 0.08 },
      // Metal1 Drain
      { id: 'nmos_m1d',   layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.08 },
      // Pwell body tie: P+ active, contact, Metal1 for VSS connection
      { id: 'nmos_bact',  layerId: 'Oxide',  x: 0,     y: 0.18,  width: 0.245, height: 0.07 },
      { id: 'nmos_bpimp', layerId: 'Pimp',   x: -0.02, y: 0.16,  width: 0.285, height: 0.11 },
      { id: 'nmos_bct',   layerId: 'Cont',   x: 0.09,  y: 0.195, width: 0.06,  height: 0.06 },
      { id: 'nmos_bm1',   layerId: 'Metal1', x: 0.07,  y: 0.185, width: 0.1,   height: 0.08 }
    ]
  },
  {
    id: 'lib_pmos_min',
    name: 'pmos_min',
    description: 'Minimum size PMOS (W=120n, L=45n) with Nwell body tie',
    isLibrary: true,
    shapes: [
      // N-Well enclosing PMOS
      { id: 'pmos_nwell', layerId: 'Nwell',  x: -0.1,  y: -0.25,  width: 0.445, height: 0.45 },
      // Active
      { id: 'pmos_act',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      // P+ Implant covers source/drain active
      { id: 'pmos_pimp',  layerId: 'Pimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      // Poly gate
      { id: 'pmos_poly',  layerId: 'Poly',   x: 0.1,   y: -0.06, width: 0.045, height: 0.24 },
      // Source Contact
      { id: 'pmos_cs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      // Drain Contact
      { id: 'pmos_cd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      // Metal1 Source
      { id: 'pmos_m1s',   layerId: 'Metal1', x: 0.01,  y: 0.02,  width: 0.08,  height: 0.08 },
      // Metal1 Drain
      { id: 'pmos_m1d',   layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.08 },
      // Nwell body tie: N+ active, contact, Metal1 for VDD connection
      { id: 'pmos_bact',  layerId: 'Oxide',  x: 0,     y: -0.18,  width: 0.245, height: 0.07 },
      { id: 'pmos_bnimp', layerId: 'Nimp',   x: -0.02, y: -0.20,  width: 0.285, height: 0.11 },
      { id: 'pmos_bct',   layerId: 'Cont',   x: 0.09,  y: -0.165, width: 0.06,  height: 0.06 },
      { id: 'pmos_bm1',   layerId: 'Metal1', x: 0.07,  y: -0.175, width: 0.1,   height: 0.08 }
    ]
  },
  {
    id: 'lib_inv_cmos',
    name: 'inv_cmos',
    description: 'Inversor CMOS completo (DRC & LVS ready)',
    isLibrary: true,
    shapes: [
      // PMOS
      { id: 'inv_nwell',  layerId: 'Nwell',  x: -0.1,  y: -0.25,  width: 0.445, height: 0.45 },
      { id: 'inv_pact',   layerId: 'Oxide',  x: 0,     y: 0,     width: 0.245, height: 0.12 },
      { id: 'inv_ppimp',  layerId: 'Pimp',   x: -0.02, y: -0.02, width: 0.285, height: 0.16 },
      { id: 'inv_ppoly',  layerId: 'Poly',   x: 0.1,   y: -0.06, width: 0.045, height: 0.24 },
      { id: 'inv_pcs',    layerId: 'Cont',   x: 0.02,  y: 0.03,  width: 0.06,  height: 0.06 },
      { id: 'inv_pcd',    layerId: 'Cont',   x: 0.165, y: 0.03,  width: 0.06,  height: 0.06 },
      { id: 'inv_pm1s',   layerId: 'Metal1', x: 0.01,  y: 0.02,  width: 0.08,  height: 0.08 },
      { id: 'inv_pm1d',   layerId: 'Metal1', x: 0.155, y: 0.02,  width: 0.08,  height: 0.08 },
      { id: 'inv_pbact',  layerId: 'Oxide',  x: 0,     y: -0.18,  width: 0.245, height: 0.07 },
      { id: 'inv_pbnimp', layerId: 'Nimp',   x: -0.02, y: -0.20,  width: 0.285, height: 0.11 },
      { id: 'inv_pbct',   layerId: 'Cont',   x: 0.09,  y: -0.165, width: 0.06,  height: 0.06 },
      { id: 'inv_pbm1',   layerId: 'Metal1', x: 0.07,  y: -0.175, width: 0.1,   height: 0.08 },

      // NMOS
      { id: 'inv_nact',   layerId: 'Oxide',  x: 0,     y: 0.8,   width: 0.245, height: 0.12 },
      { id: 'inv_nnimp',  layerId: 'Nimp',   x: -0.02, y: 0.78,  width: 0.285, height: 0.16 },
      { id: 'inv_npoly',  layerId: 'Poly',   x: 0.1,   y: 0.74,  width: 0.045, height: 0.24 },
      { id: 'inv_ncs',    layerId: 'Cont',   x: 0.02,  y: 0.83,  width: 0.06,  height: 0.06 },
      { id: 'inv_ncd',    layerId: 'Cont',   x: 0.165, y: 0.83,  width: 0.06,  height: 0.06 },
      { id: 'inv_nm1s',   layerId: 'Metal1', x: 0.01,  y: 0.82,  width: 0.08,  height: 0.08 },
      { id: 'inv_nm1d',   layerId: 'Metal1', x: 0.155, y: 0.82,  width: 0.08,  height: 0.08 },
      { id: 'inv_nbact',  layerId: 'Oxide',  x: 0,     y: 0.98,  width: 0.245, height: 0.07 },
      { id: 'inv_nbpimp', layerId: 'Pimp',   x: -0.02, y: 0.96,  width: 0.285, height: 0.11 },
      { id: 'inv_nbct',   layerId: 'Cont',   x: 0.09,  y: 0.995, width: 0.06,  height: 0.06 },
      { id: 'inv_nbm1',   layerId: 'Metal1', x: 0.07,  y: 0.985, width: 0.1,   height: 0.08 },

      // Routing
      // VDD connect (PMOS Source to Body Tie)
      { id: 'inv_vdd_m1', layerId: 'Metal1', x: 0.01,  y: -0.175,width: 0.16,  height: 0.275 },
      // VSS connect (NMOS Source to Body Tie)
      { id: 'inv_vss_m1', layerId: 'Metal1', x: 0.01,  y: 0.82,  width: 0.16,  height: 0.245 },
      // IN gate route (Poly) + contact
      { id: 'inv_in_poly',layerId: 'Poly',   x: 0.1,   y: 0.18,  width: 0.045, height: 0.56 },
      { id: 'inv_in_ct',  layerId: 'Cont',   x: 0.0925,y: 0.43,  width: 0.06,  height: 0.06 },
      { id: 'inv_in_m1',  layerId: 'Metal1', x: 0.08,  y: 0.42,  width: 0.07,  height: 0.08 },
      // OUT drain route (Metal1)
      { id: 'inv_out_m1', layerId: 'Metal1', x: 0.165, y: 0.02,  width: 0.06,  height: 0.88 },

      // Pins
      { id: 'inv_pin_vdd',layerId: 'PinM1',  x: 0.01,  y: -0.175,width: 0.16,  height: 0.275, label: 'VDD' },
      { id: 'inv_pin_vss',layerId: 'PinM1',  x: 0.01,  y: 0.82,  width: 0.16,  height: 0.245, label: 'VSS' },
      { id: 'inv_pin_in', layerId: 'PinM1',  x: 0.08,  y: 0.42,  width: 0.07,  height: 0.08,  label: 'IN' },
      { id: 'inv_pin_out',layerId: 'PinM1',  x: 0.165, y: 0.4,   width: 0.06,  height: 0.08,  label: 'OUT' }
    ]
  }
];
