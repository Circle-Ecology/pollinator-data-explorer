// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cloneElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import FacetedStackedBarChart from '../../src/components/FacetedStackedBarChart'
import GroupedBarChart from '../../src/components/GroupedBarChart'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { strings } from '../../src/content/strings'
import {
  buildFacetedRows,
  getFacets,
  getSharedAxis,
  getSharedMax,
  getSiteNumbers,
} from '../../src/utils/facetedChartRows'
import { buildRateRows, formatRateTooltip } from '../../src/utils/rateChartRows'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

// jsdom has no layout, so Recharts' ResponsiveContainer measures 0 and draws
// nothing. Give the chart a fixed size so the real SVG renders in tests.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      cloneElement(children, { width: 800, height: 400 }),
  }
})

const nestTab = dashboardConfig.find((tab) => tab.id === 'nest-sites')
const chartById = (id) => nestTab.charts.find((chart) => chart.id === id)
const loadData = () => Promise.resolve(dashboardData)

async function renderTable(chartId, year) {
  window.history.replaceState(
    null,
    '',
    `/embed?tab=nest-sites&chart=${chartId}&year=${year}`
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

describe('Nest Sites tab - US-33', () => {
  it('lists the six charts from the ticket', () => {
    expect(nestTab.charts.map((chart) => chart.id)).toEqual([
      'sealed-rate-by-cwd',
      'sealed-rate-by-substrate',
      'sealed-rate-by-direction',
      'sealed-rate-by-install-year',
      'sealed-rate-by-diameter',
      'richness-by-diameter-site',
    ])
  })

  it('explains "sealed nest rate" in one sentence above the charts', async () => {
    window.history.replaceState(null, '', '/embed?tab=nest-sites')
    render(<DashboardPanel loadData={loadData} />)

    const note = await screen.findByText(/^Sealed nest rate is the share/)
    // Exactly one sentence: one terminal mark, at the very end.
    expect(note.textContent.trim().match(/[.!?]/g)).toHaveLength(1)
    expect(note.textContent.trim()).toMatch(/[.!?]$/)
  })

  it('labels the rate charts as a rate, not a count', () => {
    expect(strings.dashboardRateAxisLabel).toBe('Sealed nest rate (%)')
    for (const chart of nestTab.charts.filter((c) => c.component === 'groupedRate')) {
      expect(chart.measures).toEqual(['rate'])
    }
  })

  it('shows sealed nests and available holes for each bar in the table', async () => {
    const table = await renderTable('sealed-rate-by-cwd', 2025)
    const snag = within(table).getByRole('row', { name: /^Snag/ })

    expect(snag).toHaveTextContent('1,048') // available
    expect(snag).toHaveTextContent('155 of 1,048 (15%)') // Bee
    expect(snag).toHaveTextContent('48 of 1,048 (5%)') // Wasp
  })

  it('renders no Snag bar in 2023, when only logs existed, and says why', async () => {
    const table = await renderTable('sealed-rate-by-cwd', 2023)

    expect(within(table).queryByRole('row', { name: /^Snag/ })).not.toBeInTheDocument()
    expect(within(table).getByRole('row', { name: /^Log/ })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Snags were first installed in 2025')
  })

  it('puts directions in compass order, logs before snags', () => {
    const rows = buildRateRows(
      chartById('sealed-rate-by-direction'),
      dashboardData.charts['sealed-rate-by-direction'],
      { year: 2025 }
    )

    expect(rows.map((row) => row.category)).toEqual(['N Log', 'S Log', 'NE Snag'])
  })
})

describe('Genus richness panels - US-33', () => {
  const chart = chartById('richness-by-diameter-site')
  const rows = buildFacetedRows(chart, dashboardData.charts[chart.id], {
    year: 2026,
    siteNumbers: getSiteNumbers(dashboardData),
  })

  it('splits the chart into one panel per diameter', () => {
    expect(getFacets(rows)).toEqual(['0.125', '0.25', '0.375'])
  })

  it('shares one y-axis across the panels', () => {
    // The tallest bar in any panel: Site 1 at 0.375 in (4 + 5 genera).
    expect(getSharedMax(rows)).toBe(9)
    // Rounded up to four whole steps: 0, 3, 6, 9, 12.
    expect(getSharedAxis(rows)).toEqual({ domain: [0, 12], ticks: [0, 3, 6, 9, 12] })
  })

  it('orders sites by site number within each panel', () => {
    const shuffled = {
      2026: [
        { diameter: '0.125', siteId: 'Site 3', propertyName: 'Site 3', Bee: 0, Wasp: 1 },
        { diameter: '0.125', siteId: 'Site 1', propertyName: 'Site 1', Bee: 2, Wasp: 1 },
      ],
    }
    const ordered = buildFacetedRows(chart, shuffled, {
      year: 2026,
      siteNumbers: getSiteNumbers(dashboardData),
    })

    expect(ordered.map((row) => row.label)).toEqual(['1', '3'])
  })

  it('labels bars by site number and keeps the full name for the table', () => {
    const first = rows[0]
    expect(first.label).toBe('1')
    expect(first.category).toBe('Site 1')
  })

  it('renders three side-by-side panels with one legend', () => {
    const { container } = render(<FacetedStackedBarChart chart={chart} rows={rows} />)

    const headings = [...container.querySelectorAll('.faceted-chart-heading')]
    expect(headings.map((h) => h.textContent)).toEqual(['0.125 in', '0.25 in', '0.375 in'])
    expect(container.querySelectorAll('.faceted-chart-legend li')).toHaveLength(2)
  })

  it('lists diameter, full site name and genus counts in the table', async () => {
    const table = await renderTable('richness-by-diameter-site', 2026)
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual(['Diameter', 'Site', 'Bee', 'Wasp', 'Total'])
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('0.125 inSite 121')
  })
})

describe('GroupedBarChart rendering - US-33', () => {
  const rateCharts = nestTab.charts.filter((chart) => chart.component === 'groupedRate')

  function renderRateChart(chart, year) {
    const rows = buildRateRows(chart, dashboardData.charts[chart.id], { year })
    const { container } = render(<GroupedBarChart chart={chart} rows={rows} />)
    const ticks = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')]
    return {
      rows,
      bars: container.querySelectorAll('.recharts-bar-rectangle'),
      xLabels: ticks.map((tick) => tick.textContent).filter((text) => !text.endsWith('%')),
      yLabels: ticks.map((tick) => tick.textContent).filter((text) => text.endsWith('%')),
      axisLabel: container.querySelector('.recharts-label')?.textContent,
      ticks,
    }
  }

  it.each(rateCharts.map((chart) => chart.id))(
    '%s renders a Bee and a Wasp bar per level on a rate axis',
    (id) => {
      const chart = chartById(id)
      const year = Number(Object.keys(dashboardData.charts[chart.id])[0])
      const { rows, bars, xLabels, yLabels, axisLabel } = renderRateChart(chart, year)

      expect(rows.length).toBeGreaterThan(0)
      expect(bars).toHaveLength(rows.length * 2)
      expect(xLabels).toEqual(rows.map((row) => row.category))
      expect(axisLabel).toBe('Sealed nest rate (%)')
      expect(yLabels.length).toBeGreaterThan(1)
    }
  )

  it('draws no Snag bar in 2023, when only logs existed', () => {
    const { bars, xLabels } = renderRateChart(chartById('sealed-rate-by-cwd'), 2023)

    expect(xLabels).toEqual(['Log'])
    expect(bars).toHaveLength(2)
  })

  it('angles the labels once there are more than four levels', () => {
    const chart = chartById('sealed-rate-by-direction')
    const rows = ['N', 'NE', 'E', 'SE', 'S', 'SW'].map((dir) => ({
      category: `${dir} Log`,
      available: 100,
      values: { Bee: { sealed: 10, rate: 10 }, Wasp: { sealed: 5, rate: 5 } },
    }))
    const { container } = render(<GroupedBarChart chart={chart} rows={rows} />)
    const label = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')]
      .find((tick) => tick.textContent === 'N Log')

    expect(label.getAttribute('transform')).toMatch(/rotate\(-45/)
  })

  it('formats the tooltip with the counts behind the rate', () => {
    const item = { dataKey: 'Bee', payload: { BeeSealed: 1344, WaspSealed: 48, available: 4200 } }

    expect(formatRateTooltip(32, item)).toBe('32% (1,344 of 4,200)')
    expect(formatRateTooltip(1, { ...item, dataKey: 'Wasp' })).toBe('1% (48 of 4,200)')
  })
})
