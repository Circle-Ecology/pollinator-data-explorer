import { describe, expect, it } from 'vitest'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import {
  buildChartRows,
  getChartYears,
  getVisibleSeries,
} from '../../src/utils/buildChartRows'
import { dashboardData } from '../fixtures/dashboardData'

const [byYear, bySite] = dashboardConfig[0].charts
const { years, charts } = dashboardData

describe('buildChartRows - US-29', () => {
  it('lists only years with data, never 2024', () => {
    expect(getChartYears(charts['occupancy-by-site'], years)).toEqual([
      2023, 2025, 2026,
    ])
  })

  it('puts every year side by side for a chart without a year toggle', () => {
    const rows = buildChartRows(byYear, charts['occupancy-by-year'], { years })

    expect(rows.map((row) => row.category)).toEqual(['2023', '2025', '2026'])
    expect(rows[0].counts).toEqual({ occupied: 233, empty: 397 })
    expect(rows[0].total).toBe(630)
  })

  it('shows one year at a time for a chart with a year toggle', () => {
    const rows = buildChartRows(bySite, charts['occupancy-by-site'], {
      years,
      year: 2023,
    })

    expect(rows.map((row) => row.category)).toEqual(['Site 1', 'Site 2'])
  })

  it('makes each bar sum to 100 in percentage mode', () => {
    const rows = buildChartRows(bySite, charts['occupancy-by-site'], {
      years,
      year: 2023,
    })

    expect(rows[0].percents).toEqual({ occupied: 26.7, empty: 73.3 })
    for (const row of rows) {
      const sum = row.percents.occupied + row.percents.empty
      expect(sum).toBeCloseTo(100, 0)
    }
  })

  describe('getVisibleSeries', () => {
    const occupantCharts = dashboardConfig.find((tab) => tab.id === 'occupants').charts
    const chart = (id) => occupantCharts.find((c) => c.id === id)
    const keys = (id, yearsInView) =>
      getVisibleSeries(chart(id), yearsInView).map((s) => s.key)

    it('leaves out a series in years before it was tracked', () => {
      expect(keys('occupants-by-site-type', [2023])).toEqual(['Bee', 'Wasp', 'Other'])
      expect(keys('other-by-site-type', [2023])).toEqual(['Spider', 'Other'])
      expect(keys('other-by-site-type', [2025])).toEqual(['Spider', 'Ant(s)', 'Other'])
    })

    it('keeps a tracked series even when every count is zero', () => {
      // The 2026 fixture has no ants at its only site: a real "none found".
      expect(charts['other-by-site-type'][2026][0]['Ant(s)']).toBe(0)
      expect(keys('other-by-site-type', [2026])).toEqual([
        'Spider',
        'Ant(s)',
        'Pill Bug',
        'Other',
      ])
    })

    it('shows a series if any year side by side tracked it', () => {
      expect(keys('occupants-by-year-type', years)).toEqual([
        'Bee',
        'Wasp',
        'Unknown',
        'Other',
      ])
    })

    it('never hides a series without a trackedFrom year', () => {
      expect(keys('occupants-by-site', [2023])).toEqual(['total'])
    })

    it('reports a series as not recorded (null) for bars before it was tracked', () => {
      const rows = buildChartRows(
        chart('occupants-by-year-type'),
        charts['occupants-by-year-type'],
        { years }
      )
      const byYear = Object.fromEntries(rows.map((row) => [row.category, row]))

      expect(byYear['2023'].counts.Unknown).toBeNull()
      expect(byYear['2023'].percents.Unknown).toBeNull()
      expect(byYear['2025'].counts.Unknown).toBeNull()
      expect(byYear['2026'].counts.Unknown).toBe(29)
      // Not recorded is left out of the bar's total, so shares still add up.
      expect(byYear['2023'].total).toBe(278)
    })
  })

  it('returns no rows for a year without data', () => {
    expect(
      buildChartRows(bySite, charts['occupancy-by-site'], { years, year: 2024 })
    ).toEqual([])
  })
})
