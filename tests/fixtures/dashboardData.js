// Scorecard genera in the pipeline's order (alphabetical within each group).
const SCORECARD_GENERA = [
  ...['Anthidium', 'Ashmeadiella', 'Dianthidium', 'Heriades', 'Hoplitis', 'Hylaeus',
    'Megachile (Chelostomoides)', 'Megachile (Eutricharaea)', 'Megachile (multiple)',
    'Megachile (Sayapis)', 'Osmia (mud)', 'Osmia (vegetation)'].map((genus) => ({ genus, group: 'Bee' })),
  ...['Eumeninae', 'Isodontia', 'Passaloecus or Psenulus', 'Solierella', 'Spilomena', 'Trypoxylon']
    .map((genus) => ({ genus, group: 'Wasp' })),
  { genus: 'Unknown', group: 'Unknown' },
]

// One site-year scorecard as the pipeline writes it. `rates` are the condition
// percentages; `states` the conditions that are a bonus or a flag.
function scorecard({ siteId, siteNumber, presentGenera, uniqueGenera = [], rates, states, score, category }) {
  const conditions = {}
  for (const [id, rate] of Object.entries(rates)) {
    conditions[id] = id === 'emergence'
      ? { rate, recorded: states.emergence === 'bonus' }
      : { rate, state: states[id] ?? 'none' }
  }
  const flags = Object.keys(states).filter((id) => states[id] === 'flag')
  return {
    siteId, siteNumber, presentGenera, uniqueGenera, conditions,
    score, max: 24, category, flagged: flags.length > 0, flags,
  }
}

const SCORECARD_SITE_1_2026 = scorecard({
  siteId: 'Site 1', siteNumber: '1',
  presentGenera: ['Ashmeadiella', 'Eumeninae', 'Hoplitis', 'Hylaeus', 'Isodontia', 'Megachile (Eutricharaea)',
    'Megachile (multiple)', 'Solierella', 'Spilomena', 'Trypoxylon', 'Unknown'],
  rates: { parasitism: 4, chalkbrood: 11, multiGenus: 17, other: 4, megachile: 26, osmiaMud: 0, emergence: 31 },
  states: { parasitism: 'bonus', multiGenus: 'bonus', other: 'bonus', emergence: 'bonus' },
  score: 15, category: 'High',
})

const SCORECARD_SITE_3_2026 = scorecard({
  siteId: 'Site 3', siteNumber: '3',
  presentGenera: ['Dianthidium', 'Eumeninae', 'Isodontia', 'Megachile (Eutricharaea)', 'Megachile (multiple)',
    'Megachile (Sayapis)', 'Solierella', 'Spilomena', 'Trypoxylon', 'Unknown'],
  rates: { parasitism: 2, chalkbrood: 1, multiGenus: 5, other: 23, megachile: 8, osmiaMud: 0, emergence: 17 },
  states: { parasitism: 'bonus', multiGenus: 'bonus', other: 'bonus', emergence: 'bonus' },
  score: 14, category: 'High',
})

// Flagged (Megachile (Eutricharaea) 48%) but keeps its score: Very High.
const SCORECARD_SITE_5_2026 = scorecard({
  siteId: 'Sherwood OS', siteNumber: '5',
  presentGenera: ['Ashmeadiella', 'Eumeninae', 'Heriades', 'Isodontia', 'Megachile (Chelostomoides)',
    'Megachile (Eutricharaea)', 'Megachile (multiple)', 'Passaloecus or Psenulus', 'Solierella', 'Spilomena',
    'Unknown'],
  uniqueGenera: ['Megachile (Chelostomoides)'],
  rates: { parasitism: 6, chalkbrood: 8, multiGenus: 11, other: 2, megachile: 48, osmiaMud: 0, emergence: 19 },
  states: { parasitism: 'bonus', multiGenus: 'bonus', other: 'bonus', megachile: 'flag', emergence: 'bonus' },
  score: 16, category: 'Very High',
})

// Emergence before 2026 was estimated, so the scorecard shows it without a rate.
const SCORECARD_SITE_1_2025 = scorecard({
  siteId: 'Site 1', siteNumber: '1',
  presentGenera: ['Eumeninae', 'Hylaeus', 'Isodontia', 'Megachile (Eutricharaea)', 'Osmia (mud)', 'Solierella'],
  rates: { parasitism: 1, chalkbrood: 0, multiGenus: 2, other: 5, megachile: 82, osmiaMud: 1, emergence: 34 },
  states: { parasitism: 'bonus', multiGenus: 'bonus', other: 'bonus', megachile: 'flag', emergence: 'bonus' },
  score: 10, category: 'Medium',
})

// A small dashboard.json in the US-28 shape. Site totals agree across the
// occupant charts, as they do in the real pipeline output. No 2024: the study skipped it.
export const dashboardData = {
  generatedAt: '2026-11-11T00:00:00.000Z',
  years: [2023, 2025, 2026],
  charts: {
    'occupancy-by-year': {
      2023: [{ occupied: 233, empty: 397, excluded: 0, available: 630 }],
      2025: [{ occupied: 780, empty: 1606, excluded: 0, available: 2386 }],
      2026: [{ occupied: 760, empty: 1423, excluded: 0, available: 2183 }],
    },
    'occupancy-by-site': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 24, empty: 66, excluded: 0, available: 90 },
        { siteId: 'Site 2', propertyName: 'Site 2', occupied: 18, empty: 72, excluded: 0, available: 90 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 100, empty: 300, excluded: 0, available: 400 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 200, empty: 200, excluded: 0, available: 400 },
      ],
    },
    // Unknown only exists from 2026, so earlier years have it at zero.
    'occupants-by-year-type': {
      2023: [{ Bee: 40, Wasp: 18, Unknown: 0, Other: 220, total: 278 }],
      2025: [{ Bee: 678, Wasp: 298, Unknown: 0, Other: 127, total: 1103 }],
      2026: [{ Bee: 533, Wasp: 241, Unknown: 29, Other: 77, total: 880 }],
    },
    // Site 2 was only monitored in 2023, so later years leave it out.
    'occupants-by-site': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', total: 28 },
        { siteId: 'Site 2', propertyName: 'Site 2', total: 20 },
      ],
      2025: [{ siteId: 'Site 1', propertyName: 'Site 1', total: 209 }],
      2026: [{ siteId: 'Site 1', propertyName: 'Site 1', total: 243 }],
    },
    // Ants and pill bugs were not recorded separately in 2023.
    'other-by-site-type': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 20, 'Ant(s)': 0, 'Pill Bug': 0, Other: 4, total: 24 },
        { siteId: 'Site 2', propertyName: 'Site 2', Spider: 5, 'Ant(s)': 0, 'Pill Bug': 0, Other: 1, total: 6 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 5, 'Ant(s)': 0, 'Pill Bug': 0, Other: 3, total: 8 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 9, 'Ant(s)': 0, 'Pill Bug': 1, Other: 0, total: 10 },
      ],
    },
    // Two-week periods from 11 March; period 7 has no occupants and is kept
    // so the season's shape stays honest.
    'occupants-by-period-type': {
      2023: [
        { period: 7, start: '2023-06-17', end: '2023-06-30', Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 },
        { period: 8, start: '2023-07-01', end: '2023-07-14', Bee: 3, Wasp: 1, Unknown: 0, Other: 40, total: 44 },
      ],
      2025: [
        { period: 7, start: '2025-06-17', end: '2025-06-30', Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 },
        { period: 8, start: '2025-07-01', end: '2025-07-14', Bee: 300, Wasp: 90, Unknown: 0, Other: 30, total: 420 },
      ],
      2026: [
        { period: 7, start: '2026-06-17', end: '2026-06-30', Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 },
        { period: 8, start: '2026-07-01', end: '2026-07-14', Bee: 315, Wasp: 108, Unknown: 18, Other: 17, total: 458 },
      ],
    },
    'other-by-period-type': {
      2023: [
        { period: 7, start: '2023-06-17', end: '2023-06-30', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 },
        { period: 8, start: '2023-07-01', end: '2023-07-14', Spider: 10, 'Ant(s)': 0, 'Pill Bug': 0, Other: 30, total: 40 },
      ],
      2025: [
        { period: 7, start: '2025-06-17', end: '2025-06-30', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 },
        { period: 8, start: '2025-07-01', end: '2025-07-14', Spider: 20, 'Ant(s)': 5, 'Pill Bug': 0, Other: 5, total: 30 },
      ],
      2026: [
        { period: 7, start: '2026-06-17', end: '2026-06-30', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 },
        { period: 8, start: '2026-07-01', end: '2026-07-14', Spider: 12, 'Ant(s)': 3, 'Pill Bug': 1, Other: 1, total: 17 },
      ],
    },
    // Sealed nest rates: snags were first installed in 2025, so 2023 has
    // logs only. rate = sealed / available, as a whole-number percentage.
    'sealed-rate-by-cwd': {
      2023: [{ group: 'Log', available: 630, Bee: { sealed: 19, rate: 3 }, Wasp: { sealed: 13, rate: 2 } }],
      2025: [
        { group: 'Log', available: 1338, Bee: { sealed: 430, rate: 32 }, Wasp: { sealed: 194, rate: 14 } },
        { group: 'Snag', available: 1048, Bee: { sealed: 155, rate: 15 }, Wasp: { sealed: 48, rate: 5 } },
      ],
      2026: [
        { group: 'Log', available: 1200, Bee: { sealed: 288, rate: 24 }, Wasp: { sealed: 144, rate: 12 } },
        { group: 'Snag', available: 983, Bee: { sealed: 118, rate: 12 }, Wasp: { sealed: 10, rate: 1 } },
      ],
    },
    'sealed-rate-by-substrate': {
      2023: [{ group: 'Pine', available: 630, Bee: { sealed: 19, rate: 3 }, Wasp: { sealed: 13, rate: 2 } }],
      2025: [{ group: 'Cottonwood', available: 2000, Bee: { sealed: 500, rate: 25 }, Wasp: { sealed: 220, rate: 11 } }],
      2026: [{ group: 'Cottonwood', available: 1900, Bee: { sealed: 342, rate: 18 }, Wasp: { sealed: 133, rate: 7 } }],
    },
    // Alphabetical, as the pipeline writes it; the config puts it in compass order.
    'sealed-rate-by-direction': {
      2023: [
        { group: 'N Log', available: 300, Bee: { sealed: 9, rate: 3 }, Wasp: { sealed: 6, rate: 2 } },
        { group: 'S Log', available: 330, Bee: { sealed: 10, rate: 3 }, Wasp: { sealed: 7, rate: 2 } },
      ],
      2025: [
        { group: 'N Log', available: 600, Bee: { sealed: 162, rate: 27 }, Wasp: { sealed: 84, rate: 14 } },
        { group: 'NE Snag', available: 250, Bee: { sealed: 30, rate: 12 }, Wasp: { sealed: 13, rate: 5 } },
        { group: 'S Log', available: 738, Bee: { sealed: 273, rate: 37 }, Wasp: { sealed: 111, rate: 15 } },
      ],
    },
    'sealed-rate-by-install-year': {
      2023: [{ group: '2023 Log', available: 630, Bee: { sealed: 19, rate: 3 }, Wasp: { sealed: 13, rate: 2 } }],
      2025: [{ group: '2023 Log', available: 630, Bee: { sealed: 120, rate: 19 }, Wasp: { sealed: 60, rate: 10 } }],
    },
    'sealed-rate-by-diameter': {
      2026: [
        { group: '0.125', available: 700, Bee: { sealed: 7, rate: 1 }, Wasp: { sealed: 14, rate: 2 } },
        { group: '0.25', available: 750, Bee: { sealed: 263, rate: 35 }, Wasp: { sealed: 30, rate: 4 } },
      ],
    },
    // Distinct genera per diameter and site.
    'richness-by-diameter-site': {
      2026: [
        { diameter: '0.125', siteId: 'Site 1', propertyName: 'Site 1', Bee: 2, Wasp: 1 },
        { diameter: '0.125', siteId: 'Site 3', propertyName: 'Site 3', Bee: 0, Wasp: 1 },
        { diameter: '0.25', siteId: 'Site 1', propertyName: 'Site 1', Bee: 3, Wasp: 5 },
        { diameter: '0.25', siteId: 'Site 3', propertyName: 'Site 3', Bee: 3, Wasp: 5 },
        { diameter: '0.375', siteId: 'Site 1', propertyName: 'Site 1', Bee: 4, Wasp: 5 },
        { diameter: '0.375', siteId: 'Site 3', propertyName: 'Site 3', Bee: 2, Wasp: 2 },
      ],
    },
    // Nest statuses per occupant type (report_v04's 2023 and 2026 figures).
    'nest-status-by-type': {
      2023: [
        { occupantType: 'Bee', Active: 3, Complete: 22, Emerged: 3, Parasitized: 3, Chalkbrood: 0, sealed: 22, parasitizedRate: 13.6 },
        { occupantType: 'Wasp', Active: 5, Complete: 12, Emerged: 2, Parasitized: 0, Chalkbrood: 0, sealed: 12, parasitizedRate: 0 },
      ],
      2026: [
        { occupantType: 'Bee', Active: 185, Complete: 271, Emerged: 94, Parasitized: 26, Chalkbrood: 43, sealed: 406, parasitizedRate: 6.4 },
        { occupantType: 'Wasp', Active: 94, Complete: 137, Emerged: 37, Parasitized: 3, Chalkbrood: 0, sealed: 158, parasitizedRate: 1.9 },
      ],
    },
    // Emergence is only shown from 2026.
    'emergence-rate-by-site': {
      2026: [
        { siteId: 'Site 1', siteNumber: '1', propertyName: 'Boulder Creek Estates OS (Site 1)', emerged: 44, sealed: 142, rate: 31 },
        { siteId: 'Site 3', siteNumber: '3', propertyName: 'Boulder Creek Estates OS (Site 3)', emerged: 11, sealed: 64, rate: 17 },
      ],
    },
    // 2023 recorded only 1/2 inch and protruding; the pipeline still lists all six at zero.
    'plug-depth-by-year': {
      2023: [{
        total: 38, unrecognized: 0,
        rows: [
          { level: '1.1 inches', nests: 0 }, { level: '1 inch', nests: 0 }, { level: '1/2 inch', nests: 28 },
          { level: '1/16 inch', nests: 0 }, { level: 'flush', nests: 0 }, { level: 'protruding', nests: 10 },
        ],
      }],
      2025: [{
        total: 765, unrecognized: 0,
        rows: [
          { level: '1.1 inches', nests: 85 }, { level: '1 inch', nests: 327 }, { level: '1/2 inch', nests: 0 },
          { level: '1/16 inch', nests: 0 }, { level: 'flush', nests: 260 }, { level: 'protruding', nests: 93 },
        ],
      }],
    },
    // Genus charts, from report_v04 (2026; 2023 for occupants-by-genus), trimmed
    // to a few genera. Rows are deliberately not in display order.
    'occupants-by-type-genus': {
      2026: [
        { occupantType: 'Bee', generalId: 'Megachile (multiple)', occupants: 180, typeTotal: 498 },
        { occupantType: 'Bee', generalId: 'Megachile (Eutricharaea)', occupants: 309, typeTotal: 498 },
        { occupantType: 'Bee', generalId: 'Unknown', occupants: 9, typeTotal: 498 },
        { occupantType: 'Wasp', generalId: 'Isodontia', occupants: 136, typeTotal: 173 },
        { occupantType: 'Wasp', generalId: 'Eumeninae', occupants: 28, typeTotal: 173 },
        { occupantType: 'Wasp', generalId: 'Unknown', occupants: 9, typeTotal: 173 },
        { occupantType: 'Unknown', generalId: 'Unknown', occupants: 29, typeTotal: 29 },
        { occupantType: 'Other', generalId: 'Other', occupants: 77, typeTotal: 77 },
      ],
    },
    'occupants-by-genus': {
      2023: [
        { generalId: 'Other', Bee: 0, Wasp: 0, Unknown: 0, Other: 220, total: 220 },
        { generalId: 'Megachile (Eutricharaea)', Bee: 19, Wasp: 0, Unknown: 0, Other: 0, total: 19 },
        { generalId: 'Isodontia', Bee: 0, Wasp: 13, Unknown: 0, Other: 0, total: 13 },
        { generalId: 'Unknown', Bee: 10, Wasp: 1, Unknown: 0, Other: 0, total: 11 },
      ],
      2026: [
        { generalId: 'Megachile (Eutricharaea)', Bee: 309, Wasp: 0, Unknown: 0, Other: 0, total: 309 },
        { generalId: 'Eumeninae', Bee: 0, Wasp: 28, Unknown: 0, Other: 0, total: 28 },
        { generalId: 'Megachile (multiple)', Bee: 180, Wasp: 0, Unknown: 0, Other: 0, total: 180 },
        { generalId: 'Isodontia', Bee: 0, Wasp: 136, Unknown: 0, Other: 0, total: 136 },
        { generalId: 'Other', Bee: 0, Wasp: 0, Unknown: 0, Other: 77, total: 77 },
        { generalId: 'Unknown', Bee: 9, Wasp: 9, Unknown: 29, Other: 0, total: 47 },
      ],
    },
    'multi-genus-cavities-by-site': {
      2026: [
        { siteId: 'Site 3', propertyName: 'Site 3', multiGenus: 5, occupied: 92 },
        { siteId: 'Site 1', propertyName: 'Site 1', multiGenus: 32, occupied: 192 },
      ],
    },
    // Site scorecards, from report_v04 (2026 Sites 1, 3 and 5; 2025 Site 1).
    // The faceted charts also read the site numbers from here.
    'scorecard-genera': { all: SCORECARD_GENERA },
    'scorecard-all-sites': {
      2026: [SCORECARD_SITE_1_2026, SCORECARD_SITE_3_2026, SCORECARD_SITE_5_2026],
    },
    'scorecard-site-over-years': {
      'Site 1': { 2025: SCORECARD_SITE_1_2025, 2026: SCORECARD_SITE_1_2026 },
      'Sherwood OS': { 2026: SCORECARD_SITE_5_2026 },
    },
    'occupants-by-site-type': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 2, Wasp: 2, Unknown: 0, Other: 24, total: 28 },
        { siteId: 'Site 2', propertyName: 'Site 2', Bee: 6, Wasp: 8, Unknown: 0, Other: 6, total: 20 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 181, Wasp: 20, Unknown: 0, Other: 8, total: 209 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 175, Wasp: 44, Unknown: 14, Other: 10, total: 243 },
      ],
    },
  },
}

export function stubResizeObserver(vi) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
}
