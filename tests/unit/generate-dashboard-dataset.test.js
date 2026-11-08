import { describe, expect, it } from 'vitest'
import { CHART_IDS, generateDashboardDataset } from '../../src/pipeline/generateDashboardDataset.js'

const sites = [
  { siteId: 'S1', propertyName: 'Meadow' },
  { siteId: 'S2', propertyName: 'Creek' },
]
const tunnels = [
  { tunnelId: 'A', siteId: 'S1', coarseWoodyDebrisType: 'Log', substrateType: 'Pine', direction: 'N', installationYear: 2023, tunnelDiameterInches: 0.25, observerNotes: 'secret' },
  { tunnelId: 'B', siteId: 'S1', coarseWoodyDebrisType: 'Snag', substrateType: 'Cottonwood', direction: 'S', installationYear: 2025, tunnelDiameterInches: 0.375 },
  { tunnelId: 'C', siteId: 'S1', coarseWoodyDebrisType: 'Log', substrateType: 'Pine', direction: 'N', installationYear: 2025, tunnelDiameterInches: 0.25 },
  { tunnelId: 'D', siteId: 'S2', coarseWoodyDebrisType: 'Snag', substrateType: 'Cottonwood', direction: 'S', installationYear: 2025, tunnelDiameterInches: 0.125 },
]
const o = (tunnelId, siteId, surveyDate, observationStatus, extra = {}) =>
  ({ tunnelId, siteId, surveyDate, observationStatus, occupantType: null, wholeOrHole: null, ...extra })

// Hand-checked 2025: A sealed bee (occupied), B empty, C retired (excluded), D occupied unsealed.
// 2023: A empty only.  No 2024 data.
const observations = [
  o('A', 'S1', '2023-07-01', 'Empty'),
  o('A', 'S1', '2025-07-01', 'Active', { occupantType: 'Bee', wholeOrHole: 'Sealed' }),
  o('B', 'S1', '2025-07-01', 'Empty'),
  o('C', 'S1', '2025-06-01', 'Empty'),
  o('C', 'S1', '2025-07-01', 'Retired hole'),
  o('D', 'S2', '2025-07-01', 'Complete', { occupantType: 'Bee', wholeOrHole: 'Not Sealed' }),
]
const row = (group, available, bee, wasp) => ({
  group, available,
  Bee: { sealed: bee, rate: Math.round((bee / available) * 100) },
  Wasp: { sealed: wasp, rate: Math.round((wasp / available) * 100) },
})
// The deck's fixed two-week calendar: 14-day periods starting 11 March, in every year.
const PERIOD_STARTS = ['03-11', '03-25', '04-08', '04-22', '05-06', '05-20', '06-03', '06-17', '07-01',
  '07-15', '07-29', '08-12', '08-26', '09-09', '09-23', '10-07', '10-21']
const PERIOD_ENDS = ['03-24', '04-07', '04-21', '05-05', '05-19', '06-02', '06-16', '06-30', '07-14',
  '07-28', '08-11', '08-25', '09-08', '09-22', '10-06', '10-20', '11-03']
// Rows for periods 0..last (one period past the last survey), with counts for the given periods.
const periodRows = (year, last, zeros, counts = {}) => Array.from({ length: last + 1 }, (_, i) => ({
  period: i, start: `${year}-${PERIOD_STARTS[i]}`, end: `${year}-${PERIOD_ENDS[i]}`, ...zeros, ...counts[i],
}))
const TYPES0 = { Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 }
const OTHERS0 = { Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 }
const generatedAt = '2026-10-17T12:00:00.000Z'

describe('US-28 generateDashboardDataset', () => {
  const result = generateDashboardDataset({ sites, observations }, tunnels, generatedAt)

  it('matches the hand-checked figures', () => {
    expect(result).toEqual({
      generatedAt,
      years: [2023, 2025],
      charts: {
        [CHART_IDS.occupancyByYear]: {
          2023: [{ occupied: 0, empty: 1, excluded: 0, available: 1 }],
          2025: [{ occupied: 2, empty: 1, excluded: 1, available: 3 }],
        },
        [CHART_IDS.occupancyBySite]: {
          2023: [{ siteId: 'S1', propertyName: 'Meadow', occupied: 0, empty: 1, excluded: 0, available: 1 }],
          2025: [
            { siteId: 'S1', propertyName: 'Meadow', occupied: 1, empty: 1, excluded: 1, available: 2 },
            { siteId: 'S2', propertyName: 'Creek', occupied: 1, empty: 0, excluded: 0, available: 1 },
          ],
        },
        // Hand-checked: only A (S1) and D (S2) are occupied in 2025, both by Bee.
        [CHART_IDS.occupantsByYearType]: {
          2023: [{ Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 }],
          2025: [{ Bee: 2, Wasp: 0, Unknown: 0, Other: 0, total: 2 }],
        },
        [CHART_IDS.occupantsBySite]: {
          2023: [{ siteId: 'S1', propertyName: 'Meadow', total: 0 }],
          2025: [{ siteId: 'S1', propertyName: 'Meadow', total: 1 }, { siteId: 'S2', propertyName: 'Creek', total: 1 }],
        },
        [CHART_IDS.occupantsBySiteType]: {
          2023: [{ siteId: 'S1', propertyName: 'Meadow', Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 }],
          2025: [
            { siteId: 'S1', propertyName: 'Meadow', Bee: 1, Wasp: 0, Unknown: 0, Other: 0, total: 1 },
            { siteId: 'S2', propertyName: 'Creek', Bee: 1, Wasp: 0, Unknown: 0, Other: 0, total: 1 },
          ],
        },
        [CHART_IDS.otherBySiteType]: {
          2023: [{ siteId: 'S1', propertyName: 'Meadow', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 }],
          2025: [
            { siteId: 'S1', propertyName: 'Meadow', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 },
            { siteId: 'S2', propertyName: 'Creek', Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 },
          ],
        },
        // Fixture occupants have no General ID, so no genus rows; occupied cavities per site still count.
        [CHART_IDS.occupantsByGenus]: { 2023: [], 2025: [] },
        [CHART_IDS.occupantsByTypeGenus]: { 2023: [], 2025: [] },
        [CHART_IDS.multiGenusCavitiesBySite]: {
          2023: [{ siteId: 'S1', propertyName: 'Meadow', multiGenus: 0, occupied: 0 }],
          2025: [
            { siteId: 'S1', propertyName: 'Meadow', multiGenus: 0, occupied: 1 },
            { siteId: 'S2', propertyName: 'Creek', multiGenus: 0, occupied: 1 },
          ],
        },
        [CHART_IDS.genusProfile]: {},
        // Surveys fall in period 8 (1-14 July) in both years, so periods 0-9 are shown; only 2025 has occupants (A and D, Bee).
        [CHART_IDS.occupantsByPeriodType]: {
          2023: periodRows(2023, 9, TYPES0),
          2025: periodRows(2025, 9, TYPES0, { 8: { Bee: 2, total: 2 } }),
        },
        [CHART_IDS.otherByPeriodType]: {
          2023: periodRows(2023, 9, OTHERS0),
          2025: periodRows(2025, 9, OTHERS0),
        },
        // No General IDs in this fixture, so no genera; a row per diameter and site that had cavities.
        [CHART_IDS.richnessByDiameterSite]: {
          2023: [{ diameter: '0.25', siteId: 'S1', propertyName: 'Meadow', Bee: 0, Wasp: 0 }],
          2025: [
            { diameter: '0.125', siteId: 'S2', propertyName: 'Creek', Bee: 0, Wasp: 0 },
            { diameter: '0.25', siteId: 'S1', propertyName: 'Meadow', Bee: 0, Wasp: 0 },
            { diameter: '0.375', siteId: 'S1', propertyName: 'Meadow', Bee: 0, Wasp: 0 },
          ],
        },
        [CHART_IDS.sealedRateByCwd]: {
          2023: [row('Log', 1, 0, 0)],
          2025: [row('Log', 1, 1, 0), row('Snag', 2, 0, 0)],
        },
        [CHART_IDS.sealedRateBySubstrate]: {
          2023: [row('Pine', 1, 0, 0)],
          2025: [row('Cottonwood', 2, 0, 0), row('Pine', 1, 1, 0)],
        },
        // Grouped by direction and Log/Snag, like the deck ("N Log", "S Snag").
        [CHART_IDS.sealedRateByDirection]: {
          2023: [row('N Log', 1, 0, 0)],
          2025: [row('N Log', 1, 1, 0), row('S Snag', 2, 0, 0)],
        },
        // Grouped by installation year and Log/Snag, like the deck. C is retired, so no "2025 Log".
        [CHART_IDS.sealedRateByInstallYear]: {
          2023: [row('2023 Log', 1, 0, 0)],
          2025: [row('2023 Log', 1, 1, 0), row('2025 Snag', 2, 0, 0)],
        },
        [CHART_IDS.sealedRateByDiameter]: {
          2023: [row('0.25', 1, 0, 0)],
          2025: [row('0.125', 1, 0, 0), row('0.25', 1, 1, 0), row('0.375', 1, 0, 0)],
        },
      },
    })
  })

  it('never lists a year with no observations', () => {
    expect(result.years).not.toContain(2024)
  })

  it('contains no staff-only fields or notes', () => {
    const text = JSON.stringify(result)
    expect(text).not.toContain('secret')
    expect(text).not.toContain('observerNotes')
  })

  it('produces empty charts for an empty dataset', () => {
    const empty = generateDashboardDataset({ sites: [], observations: [] }, [], generatedAt)
    expect(empty.years).toEqual([])
    expect(Object.keys(empty.charts)).toHaveLength(18)
  })
})

describe('US-28 occupant charts', () => {
  const siteList = [{ siteId: 'S1', propertyName: 'Meadow' }, { siteId: 'S2', propertyName: 'Creek' }]
  const tunnelList = ['A', 'B', 'C', 'E'].map(tunnelId => ({ tunnelId, siteId: 'S1' }))
    .concat([{ tunnelId: 'D', siteId: 'S2' }])
  const t = (tunnelId, siteId, surveyDate, observationStatus, occupantType = null, plugComposition = null) =>
    ({ tunnelId, siteId, surveyDate, observationStatus, occupantType, plugComposition, wholeOrHole: null })
  const data = [
    // A: Complete -> Reopened -> Complete is two Bee occupants. B: one Wasp. C: one Spider.
    // E: an occupied cavity with no recorded type is not counted. D (S2) is empty in 2025.
    t('A', 'S1', '2025-06-01', 'Complete', 'Bee', 'mud'),
    t('A', 'S1', '2025-07-01', 'Reopened', 'Bee', 'mud'),
    t('A', 'S1', '2025-08-01', 'Complete', 'Bee', 'mud'),
    t('B', 'S1', '2025-06-01', 'Active', 'Wasp'),
    t('B', 'S1', '2025-07-01', 'Active', 'Wasp'),
    t('C', 'S1', '2025-06-01', 'Complete', 'Spider'),
    t('E', 'S1', '2025-06-01', 'Complete'),
    t('D', 'S2', '2025-06-01', 'Empty'),
    // 2026: Ant(s) counts as Other; Unknown only exists this year.
    t('A', 'S1', '2026-06-01', 'Complete', 'Ant(s)'),
    t('D', 'S2', '2026-06-01', 'Active', 'Unknown'),
    t('D', 'S2', '2026-07-01', 'Active'),
  ]
  const { charts } = generateDashboardDataset({ sites: siteList, observations: data }, tunnelList, generatedAt)
  const site = (siteId, propertyName, counts) => ({ siteId, propertyName, ...counts })

  it('counts occupants by year and type, with the total as the denominator', () => {
    expect(charts[CHART_IDS.occupantsByYearType]).toEqual({
      2025: [{ Bee: 2, Wasp: 1, Unknown: 0, Other: 1, total: 4 }],
      2026: [{ Bee: 0, Wasp: 0, Unknown: 1, Other: 1, total: 2 }],
    })
  })

  it('counts total occupants by site', () => {
    expect(charts[CHART_IDS.occupantsBySite]).toEqual({
      2025: [site('S1', 'Meadow', { total: 4 }), site('S2', 'Creek', { total: 0 })],
      2026: [site('S1', 'Meadow', { total: 1 }), site('S2', 'Creek', { total: 1 })],
    })
  })

  it('counts occupants by site and type', () => {
    expect(charts[CHART_IDS.occupantsBySiteType]).toEqual({
      2025: [
        site('S1', 'Meadow', { Bee: 2, Wasp: 1, Unknown: 0, Other: 1, total: 4 }),
        site('S2', 'Creek', { Bee: 0, Wasp: 0, Unknown: 0, Other: 0, total: 0 }),
      ],
      2026: [
        site('S1', 'Meadow', { Bee: 0, Wasp: 0, Unknown: 0, Other: 1, total: 1 }),
        site('S2', 'Creek', { Bee: 0, Wasp: 0, Unknown: 1, Other: 0, total: 1 }),
      ],
    })
  })

  it('breaks the Other occupants down by site and Other type', () => {
    expect(charts[CHART_IDS.otherBySiteType]).toEqual({
      2025: [
        site('S1', 'Meadow', { Spider: 1, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 1 }),
        site('S2', 'Creek', { Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 }),
      ],
      2026: [
        site('S1', 'Meadow', { Spider: 0, 'Ant(s)': 1, 'Pill Bug': 0, Other: 0, total: 1 }),
        site('S2', 'Creek', { Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0, total: 0 }),
      ],
    })
  })
})


describe('US-28 genus charts', () => {
  const siteList = [{ siteId: 'S1', propertyName: 'Meadow' }, { siteId: 'S2', propertyName: 'Creek' }]
  const place = { A: 'S1', B: 'S1', E: 'S1', C: 'S2', F: 'S2', G: 'S2' }
  const tunnelList = Object.entries(place).map(([tunnelId, siteId]) => ({ tunnelId, siteId }))
  const g = (tunnelId, surveyDate, observationStatus, occupantType = null, generalId = null) =>
    ({ tunnelId, siteId: place[tunnelId], surveyDate, observationStatus, occupantType, generalId, plugComposition: null, wholeOrHole: null })
  const data = [
    // A holds two genera in two occupant runs; E has no General ID so it is left out of the genus charts;
    // F is a wasp whose General ID is "Other"; G is a spider, which rolls up to "Other".
    g('A', '2025-06-01', 'Complete', 'Bee', 'Megachile (Eutricharaea)'),
    g('A', '2025-07-01', 'Empty'),
    g('A', '2025-08-01', 'Complete', 'Bee', 'Hylaeus'),
    g('B', '2025-06-01', 'Complete', 'Bee', 'Hylaeus'),
    g('E', '2025-06-01', 'Complete', 'Bee'),
    g('C', '2025-06-01', 'Complete', 'Wasp', 'Isodontia'),
    g('F', '2025-06-01', 'Complete', 'Wasp', 'Other'),
    g('G', '2025-06-01', 'Complete', 'Spider', 'Spider'),
  ]
  const { charts } = generateDashboardDataset({ sites: siteList, observations: data }, tunnelList, generatedAt)

  it('ranks occupants by General ID, biggest first, with the type breakdown', () => {
    const r = (generalId, counts) => ({ generalId, Bee: 0, Wasp: 0, Unknown: 0, Other: 0, ...counts })
    expect(charts[CHART_IDS.occupantsByGenus][2025]).toEqual([
      { ...r('Hylaeus', { Bee: 2 }), total: 2 },
      { ...r('Isodontia', { Wasp: 1 }), total: 1 },
      { ...r('Megachile (Eutricharaea)', { Bee: 1 }), total: 1 },
      { ...r('Other', { Other: 1 }), total: 1 },
      { ...r('Other (Wasp)', { Wasp: 1 }), total: 1 },
    ])
  })

  it('groups General IDs under their occupant type with the type total as the denominator', () => {
    expect(charts[CHART_IDS.occupantsByTypeGenus][2025]).toEqual([
      { occupantType: 'Bee', generalId: 'Hylaeus', occupants: 2, typeTotal: 3 },
      { occupantType: 'Bee', generalId: 'Megachile (Eutricharaea)', occupants: 1, typeTotal: 3 },
      { occupantType: 'Wasp', generalId: 'Isodontia', occupants: 1, typeTotal: 2 },
      { occupantType: 'Wasp', generalId: 'Other (Wasp)', occupants: 1, typeTotal: 2 },
      { occupantType: 'Other', generalId: 'Other', occupants: 1, typeTotal: 1 },
    ])
  })

  it('counts a cavity with two General IDs once for its site', () => {
    expect(charts[CHART_IDS.multiGenusCavitiesBySite][2025]).toEqual([
      { siteId: 'S1', propertyName: 'Meadow', multiGenus: 1, occupied: 3 },
      { siteId: 'S2', propertyName: 'Creek', multiGenus: 0, occupied: 3 },
    ])
  })
})


describe('US-28 genus profiles', () => {
  const siteList = [{ siteId: 'S1', propertyName: 'Meadow' }, { siteId: 'S2', propertyName: 'Creek' }]
  const tunnelList = [
    { tunnelId: 'A', siteId: 'S1', direction: 'N', coarseWoodyDebrisType: 'Log', substrateType: 'Cottonwood', tunnelDiameterInches: 0.125, installationYear: 2023 },
    { tunnelId: 'B', siteId: 'S1', direction: 'S', coarseWoodyDebrisType: 'Snag', substrateType: 'Pine', tunnelDiameterInches: 0.25, installationYear: 2025 },
    { tunnelId: 'C', siteId: 'S2', direction: 'N', coarseWoodyDebrisType: 'Log', substrateType: 'Cottonwood', tunnelDiameterInches: 0.125, installationYear: 2023 },
    { tunnelId: 'D', siteId: 'S2', direction: 'S', coarseWoodyDebrisType: 'Log', substrateType: 'Pine', tunnelDiameterInches: 0.25, installationYear: 2025 },
  ]
  const siteOf = { A: 'S1', B: 'S1', C: 'S2', D: 'S2' }
  const n = (tunnelId, surveyDate, observationStatus, extra = {}) => ({
    tunnelId, siteId: siteOf[tunnelId], surveyDate, observationStatus,
    occupantType: null, generalId: null, plugComposition: null, plugDepth: null, wholeOrHole: null, ...extra,
  })
  const hyl = (tunnelId, date, status, wholeOrHole, plugDepth = null) =>
    n(tunnelId, date, status, { occupantType: 'Bee', generalId: 'Hylaeus', wholeOrHole, plugDepth })
  const data = [
    // 2023 (excluded from plug depth): A holds Hylaeus, C is empty.
    hyl('A', '2023-07-01', 'Complete', 'Sealed', '1 inch'),
    n('C', '2023-07-01', 'Empty'),
    // 2025: A has two Hylaeus nests (Reopened then Complete again). B's nest is parasitized.
    hyl('A', '2025-06-01', 'Complete', 'Sealed', 'flush'),
    hyl('A', '2025-07-01', 'Reopened', 'Emergence', 'flush'),
    hyl('A', '2025-08-01', 'Complete', 'Sealed', '1/2 inch'),
    hyl('B', '2025-06-01', 'Complete', 'Sealed', 'protruding'),
    hyl('B', '2025-07-01', 'Reopened', 'Parasitism'),
    // C holds Anthidium and then Hylaeus in the same year (competition); D holds a spider (no profile).
    n('C', '2025-06-01', 'Complete', { occupantType: 'Bee', generalId: 'Anthidium', wholeOrHole: 'Sealed', plugDepth: 'flush' }),
    n('C', '2025-07-01', 'Empty'),
    hyl('C', '2025-08-01', 'Complete', 'Sealed', 'flush'),
    n('D', '2025-06-01', 'Complete', { occupantType: 'Spider', generalId: 'Spider' }),
  ]
  const { charts } = generateDashboardDataset({ sites: siteList, observations: data }, tunnelList, generatedAt)
  const profiles = charts[CHART_IDS.genusProfile]

  it('has a profile for each bee or wasp General ID, but not for Other occupants', () => {
    expect(Object.keys(profiles).sort()).toEqual(['Anthidium', 'Hylaeus'])
  })

  it('counts nests, years, sites, parasitism and competition across all years', () => {
    expect(profiles.Hylaeus).toMatchObject({
      generalId: 'Hylaeus',
      nests: 5,
      years: [2023, 2025],
      sites: 2,
      sealedNests: 5,
      parasitized: 1,
      competition: { cavities: 4, shared: 1, sharedWith: [{ generalId: 'Anthidium', cavities: 1 }] },
    })
    expect(profiles.Anthidium).toMatchObject({
      nests: 1, sealedNests: 1, parasitized: 0,
      competition: { cavities: 1, shared: 1, sharedWith: [{ generalId: 'Hylaeus', cavities: 1 }] },
    })
  })

  it('counts plug depth at the last recorded depth, leaves out 2023, and has no availability', () => {
    expect(profiles.Hylaeus.panels.plugDepth).toEqual({
      nests: 4,
      rows: [
        { level: '1.1 inches', nests: 0 }, { level: '1 inch', nests: 0 }, { level: '1/2 inch', nests: 1 },
        { level: '1/16 inch', nests: 0 }, { level: 'flush', nests: 2 }, { level: 'protruding', nests: 1 },
      ],
    })
  })

  it('shows nests against the available cavities at each level, with 0 kept for unused levels', () => {
    const { panels } = profiles.Anthidium
    // Anthidium has one nest, in C (S2, N, Log, Cottonwood, 0.125 in), 3rd season in 2025.
    expect(panels.direction).toEqual({ nests: 1, availableTotal: 6, rows: [
      { level: 'N', nests: 1, available: 4 }, { level: 'S', nests: 0, available: 2 }] })
    expect(panels.cwd.rows).toEqual([{ level: 'Log', nests: 1, available: 5 }, { level: 'Snag', nests: 0, available: 1 }])
    expect(panels.substrate.rows).toEqual([{ level: 'Cottonwood', nests: 1, available: 4 }, { level: 'Pine', nests: 0, available: 2 }])
    expect(panels.diameter.rows).toEqual([{ level: '0.125', nests: 1, available: 4 }, { level: '0.25', nests: 0, available: 2 }])
  })

  it('counts age in seasons since installation, with the installation year as the 1st season', () => {
    expect(profiles.Hylaeus.panels.age).toEqual({ nests: 5, availableTotal: 6, rows: [
      { level: '1st season', nests: 2, available: 4 }, { level: '3rd season', nests: 3, available: 2 }] })
  })

  it('splits Hylaeus nests across the other panels', () => {
    const { panels } = profiles.Hylaeus
    expect(panels.direction.rows).toEqual([{ level: 'N', nests: 4, available: 4 }, { level: 'S', nests: 1, available: 2 }])
    expect(panels.cwd.rows).toEqual([{ level: 'Log', nests: 4, available: 5 }, { level: 'Snag', nests: 1, available: 1 }])
    expect(panels.substrate.rows).toEqual([{ level: 'Cottonwood', nests: 4, available: 4 }, { level: 'Pine', nests: 1, available: 2 }])
    expect(panels.diameter.rows).toEqual([{ level: '0.125', nests: 4, available: 4 }, { level: '0.25', nests: 1, available: 2 }])
  })

  it('counts distinct bee and wasp genera by diameter and site', () => {
    const richness = charts[CHART_IDS.richnessByDiameterSite]
    const rowOf = (diameter, siteId, propertyName, Bee, Wasp = 0) => ({ diameter, siteId, propertyName, Bee, Wasp })
    // C holds Anthidium and Hylaeus (two genera); D holds only a spider, which is not a bee or wasp genus.
    expect(richness[2023]).toEqual([rowOf('0.125', 'S1', 'Meadow', 1), rowOf('0.125', 'S2', 'Creek', 0)])
    expect(richness[2025]).toEqual([
      rowOf('0.125', 'S1', 'Meadow', 1), rowOf('0.125', 'S2', 'Creek', 2),
      rowOf('0.25', 'S1', 'Meadow', 1), rowOf('0.25', 'S2', 'Creek', 0),
    ])
  })
})


describe('US-28 period charts', () => {
  const place = { A: 'S1', B: 'S1', C: 'S1', D: 'S1', E: 'S1' }
  const tunnelList = Object.entries(place).map(([tunnelId, siteId]) => ({ tunnelId, siteId }))
  const q = (tunnelId, surveyDate, observationStatus, occupantType = null) => ({
    tunnelId, siteId: place[tunnelId], surveyDate, observationStatus, occupantType,
    generalId: null, plugComposition: null, wholeOrHole: null,
  })
  const data = [
    q('A', '2025-03-14', 'Complete', 'Bee'),   // period 0
    q('A', '2025-04-10', 'Active', 'Bee'),     // period 2 (8-21 April)
    q('B', '2025-04-12', 'Active', 'Wasp'),
    q('B', '2025-04-13', 'Active', 'Wasp'),    // same cavity, same period: counts once
    q('C', '2025-04-12', 'Complete', 'Spider'),
    q('D', '2025-04-12', 'Empty'),
    q('E', '2025-04-12', 'Complete'),          // occupied but no type: not counted
    q('D', '2025-05-10', 'Empty'),             // last survey, period 4
  ]
  const { charts } = generateDashboardDataset({ sites: [{ siteId: 'S1', propertyName: 'Meadow' }], observations: data }, tunnelList, generatedAt)

  it('counts each cavity once per period it is occupied, by occupant type, and keeps empty periods', () => {
    // Periods 0-5: the season starts 11 March and runs one period past the last survey (period 4).
    expect(charts[CHART_IDS.occupantsByPeriodType][2025]).toEqual(periodRows(2025, 5, TYPES0, {
      0: { Bee: 1, total: 1 },
      2: { Bee: 1, Wasp: 1, Other: 1, total: 3 },
    }))
  })

  it('splits the Other occupants by period and Other type', () => {
    expect(charts[CHART_IDS.otherByPeriodType][2025]).toEqual(periodRows(2025, 5, OTHERS0, {
      2: { Spider: 1, total: 1 },
    }))
  })
})
