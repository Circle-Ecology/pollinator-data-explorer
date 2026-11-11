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

  it('has unique tab and chart ids', () => {
    const tabIds = dashboardConfig.map((tab) => tab.id)
    const chartIds = charts.map((chart) => chart.id)

    expect(new Set(tabIds).size).toBe(tabIds.length)
    expect(new Set(chartIds).size).toBe(chartIds.length)
  })

  it('only offers count and percent measures', () => {
    for (const chart of charts) {
      expect(chart.measures.length).toBeGreaterThan(0)
      for (const measure of chart.measures) {
        expect(['count', 'percent']).toContain(measure)
      }
    }
  })
})
