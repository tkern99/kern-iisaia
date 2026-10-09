export const GPDK045_LAYERS = [
  { id: 'Nwell', name: 'N-Well', shortName: 'NW', gds: 2, color: '#7B68EE', stipple: 'diagonal', type: 'base' },
  { id: 'Oxide', name: 'Active (OD)', shortName: 'OD', gds: 1, color: '#32CD32', stipple: 'solid', type: 'base' },
  { id: 'Nimp', name: 'N+ Implant', shortName: 'NI', gds: 4, color: '#00CED1', stipple: 'crosshatch', type: 'implant' },
  { id: 'Pimp', name: 'P+ Implant', shortName: 'PI', gds: 5, color: '#FF6347', stipple: 'crosshatch', type: 'implant' },
  { id: 'Poly', name: 'Poly', shortName: 'PO', gds: 3, color: '#FF8C00', stipple: 'solid', type: 'poly' },
  { id: 'Cont', name: 'Contact', shortName: 'CT', gds: 6, color: '#FFD700', stipple: 'solid', type: 'cut' },
  { id: 'Metal1', name: 'Metal 1', shortName: 'M1', gds: 7, color: '#4169E1', stipple: 'horizontal', type: 'metal' },
  { id: 'Via1', name: 'Via 1', shortName: 'V1', gds: 8, color: '#1E3A8A', stipple: 'x-mark', type: 'cut' },
  { id: 'Metal2', name: 'Metal 2', shortName: 'M2', gds: 9, color: '#DC143C', stipple: 'vertical', type: 'metal' },
  { id: 'PinM1', name: 'Pin M1', shortName: 'P1', gds: 70, color: '#00FFFF', stipple: 'solid', type: 'pin' },
  { id: 'PinM2', name: 'Pin M2', shortName: 'P2', gds: 90, color: '#FF69B4', stipple: 'solid', type: 'pin' }
];

export const getLayerById = (id) => GPDK045_LAYERS.find(l => l.id === id);
