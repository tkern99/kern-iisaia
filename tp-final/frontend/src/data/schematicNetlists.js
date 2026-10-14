/**
 * schematicNetlists.js
 * Reference netlists for LVS comparison.
 *
 * Each schematic defines:
 *   - id, name, description
 *   - pins: array of required named pin nets
 *   - devices: array of { type, name, terminals: { G, D, S, B } }
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
  },
  {
    id: 'nand_cmos',
    name: 'Compuerta NAND CMOS (2 PMOS par. + 2 NMOS serie)',
    description: 'NAND estática de 2 entradas. VDD-VSS-A-B-OUT.',
    pins: ['VDD', 'VSS', 'A', 'B', 'OUT'],
    devices: [
      {
        type: 'PMOS',
        name: 'MP0',
        terminals: { G: 'A', D: 'OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'PMOS',
        name: 'MP1',
        terminals: { G: 'B', D: 'OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN0',
        terminals: { G: 'A', D: 'OUT', S: 'NET_INT', B: 'VSS' }
      },
      {
        type: 'NMOS',
        name: 'MN1',
        terminals: { G: 'B', D: 'NET_INT', S: 'VSS', B: 'VSS' }
      }
    ]
  },
  {
    id: 'nor_cmos',
    name: 'Compuerta NOR CMOS (2 PMOS serie + 2 NMOS par.)',
    description: 'NOR estática de 2 entradas. VDD-VSS-A-B-OUT.',
    pins: ['VDD', 'VSS', 'A', 'B', 'OUT'],
    devices: [
      {
        type: 'PMOS',
        name: 'MP0',
        terminals: { G: 'A', D: 'NET_INT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'PMOS',
        name: 'MP1',
        terminals: { G: 'B', D: 'OUT', S: 'NET_INT', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN0',
        terminals: { G: 'A', D: 'OUT', S: 'VSS', B: 'VSS' }
      },
      {
        type: 'NMOS',
        name: 'MN1',
        terminals: { G: 'B', D: 'OUT', S: 'VSS', B: 'VSS' }
      }
    ]
  },
  {
    id: 'and_cmos',
    name: 'Compuerta AND CMOS (NAND + Inversor)',
    description: 'AND de 2 entradas: etapa NAND de 4 transistores + inversor de 2 transistores. VDD-VSS-A-B-OUT.',
    pins: ['VDD', 'VSS', 'A', 'B', 'OUT'],
    devices: [
      // Etapa NAND2
      {
        type: 'PMOS',
        name: 'MP_NAND0',
        terminals: { G: 'A', D: 'NET_NAND_OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'PMOS',
        name: 'MP_NAND1',
        terminals: { G: 'B', D: 'NET_NAND_OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN_NAND0',
        terminals: { G: 'A', D: 'NET_NAND_OUT', S: 'NET_NAND_INT', B: 'VSS' }
      },
      {
        type: 'NMOS',
        name: 'MN_NAND1',
        terminals: { G: 'B', D: 'NET_NAND_INT', S: 'VSS', B: 'VSS' }
      },
      // Etapa Inversora
      {
        type: 'PMOS',
        name: 'MP_INV',
        terminals: { G: 'NET_NAND_OUT', D: 'OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN_INV',
        terminals: { G: 'NET_NAND_OUT', D: 'OUT', S: 'VSS', B: 'VSS' }
      }
    ]
  },
  {
    id: 'or_cmos',
    name: 'Compuerta OR CMOS (NOR + Inversor)',
    description: 'OR de 2 entradas: etapa NOR de 4 transistores + inversor de 2 transistores. VDD-VSS-A-B-OUT.',
    pins: ['VDD', 'VSS', 'A', 'B', 'OUT'],
    devices: [
      // Etapa NOR2
      {
        type: 'PMOS',
        name: 'MP_NOR0',
        terminals: { G: 'A', D: 'NET_NOR_INT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'PMOS',
        name: 'MP_NOR1',
        terminals: { G: 'B', D: 'NET_NOR_OUT', S: 'NET_NOR_INT', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN_NOR0',
        terminals: { G: 'A', D: 'NET_NOR_OUT', S: 'VSS', B: 'VSS' }
      },
      {
        type: 'NMOS',
        name: 'MN_NOR1',
        terminals: { G: 'B', D: 'NET_NOR_OUT', S: 'VSS', B: 'VSS' }
      },
      // Etapa Inversora
      {
        type: 'PMOS',
        name: 'MP_INV',
        terminals: { G: 'NET_NOR_OUT', D: 'OUT', S: 'VDD', B: 'VDD' }
      },
      {
        type: 'NMOS',
        name: 'MN_INV',
        terminals: { G: 'NET_NOR_OUT', D: 'OUT', S: 'VSS', B: 'VSS' }
      }
    ]
  }
];
