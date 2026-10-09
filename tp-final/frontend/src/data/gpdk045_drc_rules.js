export const DRC_RULES = {
  // NWELL
  NW_W_1:   { layer: 'Nwell', type: 'minWidth',   value: 0.3,  msg: 'Ancho mínimo Nwell >= 0.3 µm' },
  NW_SP_1:  { layer: 'Nwell', type: 'minSpacing', value: 0.3,  msg: 'Spacing mínimo Nwell (mismo net) >= 0.3 µm' },
  NW_SP_2:  { layer: 'Nwell', type: 'minSpacing', value: 0.6,  msg: 'Spacing mínimo Nwell (dist. net) >= 0.6 µm' },
  
  // ACTIVE (OXIDE)
  OXIDE_W_1:  { layer: 'Oxide', type: 'minWidth',   value: 0.05, msg: 'Ancho mínimo Active >= 0.05 µm' },
  OXIDE_SP_1: { layer: 'Oxide', type: 'minSpacing', value: 0.08, msg: 'Spacing N+Active a N+Active >= 0.08 µm' },
  OXIDE_SP_3: { layer: 'Oxide', type: 'separation', value: 0.1,  msg: 'Spacing N+Active a P+Active >= 0.1 µm' },
  
  // POLY
  POLY_W_5:  { layer: 'Poly', type: 'minWidth',   value: 0.045, msg: 'Ancho mínimo Poly >= 0.045 µm' },
  POLY_SP_3: { layer: 'Poly', type: 'minSpacing', value: 0.06,  msg: 'Spacing Poly >= 0.06 µm' },
  POLY_E_1:  { type: 'enclosure', from: 'Poly', to: 'Oxide', value: 0.1,  msg: 'Extensión gate NMOS >= 0.1 µm' },
  POLY_E_2:  { type: 'enclosure', from: 'Poly', to: 'Oxide', value: 0.1,  msg: 'Extensión gate PMOS >= 0.1 µm' },
  
  // CONTACT
  CONT_W_1:  { layer: 'Cont', type: 'fixedSize', value: 0.06,  msg: 'Contact fijo: 0.06×0.06 µm' },
  CONT_SP_1: { layer: 'Cont', type: 'minSpacing', value: 0.06, msg: 'Spacing Contact >= 0.06 µm' },
  CONT_E_1:  { type: 'enclosure', from: 'Oxide', to: 'Cont', value: 0.03, msg: 'Active enclosure Contact >= 0.03 µm' },
  CONT_E_2:  { type: 'enclosure', from: 'Poly',  to: 'Cont', value: 0.02, msg: 'Poly enclosure Contact >= 0.02 µm' },
  
  // METAL 1
  M1_W_1:   { layer: 'Metal1', type: 'minWidth',   value: 0.06, msg: 'Ancho mínimo Metal1 >= 0.06 µm' },
  M1_SP_1:  { layer: 'Metal1', type: 'minSpacing', value: 0.06, msg: 'Spacing Metal1 >= 0.06 µm' },
  M1_E_2:   { type: 'enclosure', from: 'Metal1', to: 'Cont', value: 0.03, msg: 'Metal1 enclosure Contact >= 0.03 µm' },
  
  // VIA 1
  V1_E_M1:  { type: 'enclosure', from: 'Metal1', to: 'Via1', value: 0.005, msg: 'Metal1 enclosure Via1 >= 0.005 µm' },
  V1_E_M2:  { type: 'enclosure', from: 'Metal2', to: 'Via1', value: 0.005, msg: 'Metal2 enclosure Via1 >= 0.005 µm' },
  
  // METAL 2
  M2_W_1:   { layer: 'Metal2', type: 'minWidth',   value: 0.08, msg: 'Ancho mínimo Metal2 >= 0.08 µm' },
  M2_SP_1:  { layer: 'Metal2', type: 'minSpacing', value: 0.07, msg: 'Spacing Metal2 >= 0.07 µm' }
};
