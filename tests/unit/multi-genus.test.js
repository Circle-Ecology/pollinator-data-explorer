import { describe, expect, it } from 'vitest'
import { CHART_IDS, generateDashboardDataset } from '../../src/pipeline/generateDashboardDataset.js'

// US-32: "Cavities with More Than One Genus" counts each cavity once per year,
// however many genera or nests it held.
describe('multi-genus cavities - US-32', () => {
  const sites = [{ siteId: 'S1', propertyName: 'Meadow' }]
  const tunnels = ['A', 'B', 'C'].map((tunnelId) => ({ tunnelId, siteId: 'S1' }))
  const g = (tunnelId, surveyDate, observationStatus, occupantType = null, generalId = null) =>
    ({ tunnelId, siteId: 'S1', surveyDate, observationStatus, occupantType, generalId, plugComposition: null, wholeOrHole: null })

  const observations = [
    // A: two genera, then a third nest of the first genus. Counts once.
    g('A', '2025-06-01', 'Complete', 'Bee', 'Megachile (Eutricharaea)'),
    g('A', '2025-07-01', 'Empty'),
    g('A', '2025-08-01', 'Complete', 'Wasp', 'Isodontia'),
    g('A', '2025-09-01', 'Empty'),
    g('A', '2025-10-01', 'Complete', 'Bee', 'Megachile (Eutricharaea)'),
    // B: two nests of one genus. Counts zero.
    g('B', '2025-06-01', 'Complete', 'Bee', 'Hylaeus'),
    g('B', '2025-07-01', 'Empty'),
    g('B', '2025-08-01', 'Complete', 'Bee', 'Hylaeus'),
    // C: one nest. Counts zero.
    g('C', '2025-06-01', 'Complete', 'Wasp', 'Trypoxylon'),
  ]
  const { charts } = generateDashboardDataset({ sites, observations }, tunnels, '2026-11-23T00:00:00.000Z')

  it('counts a cavity with two genera once, and one with a single genus as zero', () => {
    expect(charts[CHART_IDS.multiGenusCavitiesBySite][2025]).toEqual([
      { siteId: 'S1', propertyName: 'Meadow', multiGenus: 1, occupied: 3 },
    ])
  })
})
