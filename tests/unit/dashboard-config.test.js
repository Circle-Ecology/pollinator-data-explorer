import { describe, expect, it } from 'vitest'
import {
  dashboardConfig,
  SNIPPET_MAX_LENGTH,
} from '../../src/content/dashboardConfig'
import { dashboardData } from '../fixtures/dashboardData'

const charts = dashboardConfig.flatMap((tab) => tab.charts)

describe('dashboardConfig - US-29', () => {
  it('gives every chart a snippet of at most 300 characters', () => {
    for (const chart of charts) {
      expect(chart.snippet.length).toBeGreaterThan(0)
      expect(chart.snippet.length).toBeLessThanOrEqual(SNIPPET_MAX_LENGTH)
    }
  })

  it('uses chart ids that exist in dashboard.json', () => {
    for (const chart of charts) {
      expect(dashboardData.charts).toHaveProperty([chart.id])
    }
  })

  it('limits year-specific data notes to study years', () => {
    for (const chart of charts) {
      if (chart.caveat === undefined || typeof chart.caveat === 'string') continue
      expect(typeof chart.caveat.text).toBe('string')
      expect(chart.caveat.years.length).toBeGreaterThan(0)
      for (const year of chart.caveat.years) {
        expect(dashboardData.years).toContain(year)
      }
    }
  })

  it('has unique tab and chart ids', () => {
    const tabIds = dashboardConfig.map((tab) => tab.id)
    const chartIds = charts.map((chart) => chart.id)

    expect(new Set(tabIds).size).toBe(tabIds.length)
    expect(new Set(chartIds).size).toBe(chartIds.length)
  })

  it('only offers count, percent or rate measures', () => {
    for (const chart of charts) {
      expect(chart.measures.length).toBeGreaterThan(0)
      for (const measure of chart.measures) {
        expect(['count', 'percent', 'rate']).toContain(measure)
      }
      // A rate chart shows only rates, so it has no measure toggle.
      if (chart.measures.includes('rate')) {
        expect(chart.measures).toEqual(['rate'])
      }
    }
  })

  // US-39: Georgia's 11/18 wording feedback.
  it('never calls occupants "creatures" in a snippet or data note', () => {
    for (const chart of charts) {
      const caveat = typeof chart.caveat === 'string' ? chart.caveat : chart.caveat?.text ?? ''
      expect(`${chart.snippet} ${caveat}`).not.toMatch(/creature/i)
    }
  })

  it('points Occupants by Site to the exact chart for comparing site use', () => {
    const chart = charts.find((item) => item.id === 'occupants-by-site')
    expect(chart.snippet).toContain('Occupied Fabricated Cavities by Site on the Occupied Fabricated Cavities tab')
  })
})
