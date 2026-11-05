import { describe, expect, it } from 'vitest'
import { CHART_IDS, generateDashboardDataset } from '../../src/pipeline/generateDashboardDataset.js'

const sites = [
  { siteId: 'S1', propertyName: 'Meadow' },
  { siteId: 'S2', propertyName: 'Creek' },
]
const tunnels = [
  { tunnelId: 'A', siteId: 'S1', coarseWoodyDebrisType: 'Log', observerNotes: 'secret' },
  { tunnelId: 'B', siteId: 'S1', coarseWoodyDebrisType: 'Snag' },
  { tunnelId: 'C', siteId: 'S1', coarseWoodyDebrisType: 'Log' },
  { tunnelId: 'D', siteId: 'S2', coarseWoodyDebrisType: 'Snag' },
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
        [CHART_IDS.sealedNestRateByLevel]: {
          2023: [{ level: 'Log', sealed: 0, available: 1, rate: 0 }],
          2025: [
            { level: 'Log', sealed: 1, available: 1, rate: 100 },
            { level: 'Snag', sealed: 0, available: 2, rate: 0 },
          ],
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
    expect(Object.keys(empty.charts)).toHaveLength(3)
  })
})
