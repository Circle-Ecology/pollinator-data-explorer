import { describe, expect, it } from 'vitest'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import {
  buildChartRows,
  getChartYears,
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

  it('returns no rows for a year without data', () => {
    expect(
      buildChartRows(bySite, charts['occupancy-by-site'], { years, year: 2024 })
    ).toEqual([])
  })
})
