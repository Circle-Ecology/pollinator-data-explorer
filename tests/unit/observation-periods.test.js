import { describe, expect, it } from 'vitest'
import {
  CHART_IDS,
  generateDashboardDataset,
  OBSERVATION_PERIOD_DAYS,
  periodIndex,
} from '../../src/pipeline/generateDashboardDataset.js'

// US-31: two-week observation periods, starting 11 March each year
// (Circle Ecology's deck calendar).
describe('observation periods - US-31', () => {
  it('uses two-week periods', () => {
    expect(OBSERVATION_PERIOD_DAYS).toBe(14)
  })

  it('buckets dates into the correct two-week period', () => {
    expect(periodIndex('2025-03-10')).toBeNull() // before the season
    expect(periodIndex('2025-03-11')).toBe(0) // first day of period 0
    expect(periodIndex('2025-03-24')).toBe(0) // last day of period 0
    expect(periodIndex('2025-03-25')).toBe(1) // first day of period 1
    expect(periodIndex('2026-07-01')).toBe(8) // the deck's "Jul 1-Jul 14"
    expect(periodIndex('2026-07-14')).toBe(8)
    expect(periodIndex('2026-07-15')).toBe(9)
  })

  it('starts each year on 11 March, whatever the year', () => {
    expect(periodIndex('2023-03-11')).toBe(0)
    expect(periodIndex('2026-03-11')).toBe(0)
  })

  it('counts a cavity occupied for three periods three times', () => {
    const tunnels = [{ tunnelId: 'A', siteId: 'S1' }]
    const survey = (surveyDate) => ({
      tunnelId: 'A',
      siteId: 'S1',
      surveyDate,
      observationStatus: 'Active',
      occupantType: 'Bee',
      generalId: null,
      plugComposition: null,
      wholeOrHole: null,
    })
    const { charts } = generateDashboardDataset(
      {
        sites: [{ siteId: 'S1', propertyName: 'Meadow' }],
        // Periods 8, 9 and 10, plus a second survey in period 9.
        observations: [
          survey('2025-07-01'),
          survey('2025-07-15'),
          survey('2025-07-20'),
          survey('2025-07-29'),
        ],
      },
      tunnels,
      '2026-11-16T00:00:00.000Z'
    )

    const rows = charts[CHART_IDS.occupantsByPeriodType][2025]
    const beesByPeriod = Object.fromEntries(rows.map((row) => [row.period, row.Bee]))

    expect(beesByPeriod[8]).toBe(1)
    expect(beesByPeriod[9]).toBe(1) // two surveys in one period still count once
    expect(beesByPeriod[10]).toBe(1)
    expect(rows.reduce((sum, row) => sum + row.Bee, 0)).toBe(3)
  })
})
