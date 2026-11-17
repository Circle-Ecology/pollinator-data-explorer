// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { brandColors } from '../../src/content/brandColors'
import { buildChartRows } from '../../src/utils/buildChartRows'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const occupantsTab = dashboardConfig.find((tab) => tab.id === 'occupants')
const chartById = (id) => occupantsTab.charts.find((chart) => chart.id === id)
const loadData = () => Promise.resolve(dashboardData)

async function renderTable(chartId, year) {
  window.history.replaceState(
    null,
    '',
    `/embed?tab=occupants&chart=${chartId}&year=${year}`
  )
  render(<DashboardPanel loadData={loadData} />)

  return screen.findByRole('table', { name: chartById(chartId).title })
}

const headersOf = (table) =>
  within(table)
    .getAllByRole('columnheader')
    .map((cell) => cell.textContent)

beforeEach(() => {
  stubResizeObserver(vi)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Occupants tab - US-30', () => {
  it('lists all four charts with titles and snippets from config', () => {
    expect(occupantsTab.charts.map((chart) => chart.id)).toEqual([
      'occupants-by-year-type',
      'occupants-by-site',
      'occupants-by-site-type',
      'other-by-site-type',
    ])
    for (const chart of occupantsTab.charts) {
      expect(chart.title).toBeTruthy()
      expect(chart.snippet).toBeTruthy()
    }
  })

  it('renders no Unknown series for 2025', async () => {
    const table = await renderTable('occupants-by-site-type', 2025)

    expect(headersOf(table)).toEqual(['Site', 'Bee', 'Wasp', 'Total'])
  })

  it('renders only Spider and Other in the Other-types chart for 2023', async () => {
    const table = await renderTable('other-by-site-type', 2023)

    expect(headersOf(table)).toEqual(['Site', 'Spider', 'Other', 'Total'])
  })

  it('omits a site with no data in the selected year', async () => {
    const table = await renderTable('occupants-by-site', 2025)

    expect(table).not.toHaveTextContent('Site 2')
    expect(table).toHaveTextContent('Site 1')
  })

  it('shows a site that has data in the selected year', async () => {
    const table = await renderTable('occupants-by-site', 2023)

    expect(table).toHaveTextContent('Site 2')
  })

  it('makes every stacked bar sum to 100 in percentage mode', () => {
    for (const chart of occupantsTab.charts) {
      if (!chart.measures.includes('percent')) continue

      for (const year of dashboardData.years) {
        const rows = buildChartRows(chart, dashboardData.charts[chart.id], {
          years: dashboardData.years,
          year,
        })

        for (const row of rows) {
          if (row.total === 0) continue
          const sum = Object.values(row.percents).reduce((a, b) => a + b, 0)
          expect(sum).toBeCloseTo(100, 0)
        }
      }
    }
  })

  it('uses the shared occupant-type colors', () => {
    const colors = Object.fromEntries(
      chartById('occupants-by-site-type').series.map((s) => [s.key, s.color])
    )

    expect(colors).toEqual({
      Bee: brandColors.bee,
      Wasp: brandColors.wasp,
      Unknown: brandColors.unknown,
      Other: brandColors.other,
    })
  })
})
