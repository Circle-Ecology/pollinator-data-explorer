// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import StackedBarChart from '../../src/components/StackedBarChart'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { buildChartRows } from '../../src/utils/buildChartRows'
import { getChartMinWidth } from '../../src/utils/stackedBarOptions'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const seasonTab = dashboardConfig.find((tab) => tab.id === 'season')
const chartById = (id) => seasonTab.charts.find((chart) => chart.id === id)
const loadData = () => Promise.resolve(dashboardData)

async function renderTable(chartId, year) {
  window.history.replaceState(
    null,
    '',
    `/embed?tab=season&chart=${chartId}&year=${year}`
  )
  render(<DashboardPanel loadData={loadData} />)

  return screen.findByRole('table', { name: chartById(chartId).title })
}

beforeEach(() => {
  stubResizeObserver(vi)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Season tab - US-31', () => {
  it('lists both period charts', () => {
    expect(seasonTab.charts.map((chart) => chart.id)).toEqual([
      'occupants-by-period-type',
      'other-by-period-type',
    ])
  })

  it('labels each period by its date range', async () => {
    const table = await renderTable('occupants-by-period-type', 2026)

    expect(within(table).getByRole('rowheader', { name: 'Jun 17–Jun 30' })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: 'Jul 1–Jul 14' })).toBeInTheDocument()
  })

  it('keeps a period with no occupants as an empty bar', async () => {
    const rows = buildChartRows(
      chartById('occupants-by-period-type'),
      dashboardData.charts['occupants-by-period-type'],
      { years: dashboardData.years, year: 2026 }
    )
    const empty = rows.find((row) => row.category === 'Jun 17–Jun 30')

    // Zero height: every series is 0, in counts and in percentages.
    expect(empty.total).toBe(0)
    expect(Object.values(empty.counts).every((value) => value === 0)).toBe(true)
    expect(Object.values(empty.percents).every((value) => value === 0)).toBe(true)

    const table = await renderTable('occupants-by-period-type', 2026)
    const emptyRow = within(table).getByRole('row', { name: /Jun 17–Jun 30/ })
    expect(within(emptyRow).getAllByRole('cell').at(-1)).toHaveTextContent('0')
  })

  it('applies tracking years to the Other-types period chart', async () => {
    const table = await renderTable('other-by-period-type', 2023)
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual(['Period', 'Spider', 'Other', 'Total'])
  })
})

describe('scrolling for charts with many bars - US-31', () => {
  it('gives a 16-period chart a minimum width and keeps short charts fluid', () => {
    expect(getChartMinWidth(16)).toBe(16 * 24 + 140)
    expect(getChartMinWidth(7)).toBeUndefined()
  })

  it('makes a wide chart scroll inside its own focusable box', () => {
    const chart = chartById('occupants-by-period-type')
    const rows = Array.from({ length: 16 }, (_, i) => ({
      category: `P${i}`,
      counts: { Bee: 1, Wasp: 0, Unknown: 0, Other: 0 },
      percents: { Bee: 100, Wasp: 0, Unknown: 0, Other: 0 },
      total: 1,
    }))
    const { container } = render(
      <StackedBarChart chart={chart} rows={rows} measure="count" />
    )

    const box = container.querySelector('.stacked-bar-chart')
    expect(box).toHaveAttribute('tabindex', '0')
    expect(container.querySelector('.stacked-bar-chart-inner')).toHaveStyle({
      minWidth: `${getChartMinWidth(16)}px`,
    })
  })
})
