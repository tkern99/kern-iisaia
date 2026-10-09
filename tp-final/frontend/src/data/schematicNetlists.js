/**
 * schematicNetlists.js
 * Reference netlists for LVS comparison.
 *
 * Each schematic defines:
 *   - id, name
 *   - devices: array of { type, terminals: { G, D, S, B } } using net names
 *   - pins: array of { name } (required named nets)
 *   - nets: all unique net names used
 */

export const schematicNetlists = [
  {
    id: 'inv_cmos',
    name: 'Inversor CMOS (1 NMOS + 1 PMOS)',
    description: 'Inversor estático CMOS clásico. VDD-VSS-IN-OUT.',
    pins: ['VDD', 'VSS', 'IN', 'OUT'],
    devices: [
      {
        type: 'PMOS',
        name: 'MP0',
        terminals: { G: 'IN', D: 'OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN0',
        terminals: { G: 'IN', D: 'OUT', S: 'VSS', B: 'VSS' }
      }
    ]
  }
];
