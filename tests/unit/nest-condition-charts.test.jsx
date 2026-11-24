// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cloneElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import GroupedBarChart from '../../src/components/GroupedBarChart'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { buildChartRows } from '../../src/utils/buildChartRows'
import {
  buildGroupedCountRows,
  buildGroupedCountSummary,
} from '../../src/utils/groupedCountRows'
import { buildSiteRateRows } from '../../src/utils/rateChartRows'
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

const tab = dashboardConfig.find((item) => item.id === 'nest-condition')
const chartById = (id) => tab.charts.find((chart) => chart.id === id)
const loadData = () => Promise.resolve(dashboardData)

async function renderTable(chartId, year) {
  window.history.replaceState(
    null,
    '',
    `/embed?tab=nest-condition&chart=${chartId}&year=${year}`
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

describe('Nest Condition tab - US-34', () => {
  it("uses the deck's tab name and lists the three charts in deck order", () => {
    expect(tab.label).toBe('Nests by Observation Status and Plug Depth')
    expect(tab.charts.map((chart) => chart.id)).toEqual([
      'nest-status-by-type',
      'emergence-rate-by-site',
      'plug-depth-by-year',
    ])
  })
})

describe('Nests by Observation Status - US-34', () => {
  const chart = chartById('nest-status-by-type')

  it('groups bars by status, with a Bee and a Wasp bar in each', () => {
    const rows = buildGroupedCountRows(chart, dashboardData.charts[chart.id], { year: 2026 })

    expect(rows.map((row) => row.category)).toEqual([
      'Active', 'Complete', 'Emerged', 'Parasitized', 'Chalkbrood Characteristics',
    ])
    expect(rows[1].values).toEqual({ Bee: { count: 271 }, Wasp: { count: 137 } })
  })

  it('shows Chalkbrood Characteristics as a series, including real zeros', () => {
    const rows = buildGroupedCountRows(chart, dashboardData.charts[chart.id], { year: 2026 })
    const chalkbrood = rows.find((row) => row.category === 'Chalkbrood Characteristics')

    expect(chalkbrood.values).toEqual({ Bee: { count: 43 }, Wasp: { count: 0 } })
  })

  it('has no rows for a year without data', () => {
    expect(buildGroupedCountRows(chart, dashboardData.charts[chart.id], { year: 2025 })).toEqual([])
  })

  it('puts sealed nests and Parasitism % (parasitized / sealed) in the table', async () => {
    const table = await renderTable('nest-status-by-type', 2026)

    expect(within(table).getByRole('row', { name: /^Sealed nests/ })).toHaveTextContent('406158')
    expect(
      within(table).getByRole('row', { name: /^Parasitism \(% of sealed nests\)/ })
    ).toHaveTextContent('6.4%1.9%')
  })

  it('says "Not recorded" for a Parasitism % with no sealed nests', () => {
    const data = { 2026: [{ occupantType: 'Bee', sealed: 0, parasitizedRate: null }] }
    const [, rate] = buildGroupedCountSummary(chart, data, { year: 2026 })

    expect(rate.values.Bee).toBeNull()
  })

  it('draws counts, not rates, on the y-axis', () => {
    const rows = buildGroupedCountRows(chart, dashboardData.charts[chart.id], { year: 2026 })
    const { container } = render(<GroupedBarChart chart={chart} rows={rows} />)
    const ticks = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')]
      .map((tick) => tick.textContent)

    expect(ticks.some((text) => text.endsWith('%'))).toBe(false)
    expect(container.querySelector('.recharts-label')).toHaveTextContent('Nests')
    // 5 statuses x Bee and Wasp; Wasp's zero Chalkbrood bar draws nothing.
    expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThanOrEqual(9)
  })
})

describe('Emergence Rate by Site - US-34', () => {
  const chart = chartById('emergence-rate-by-site')

  it('labels bars by site number and keeps the full name for the table', () => {
    const rows = buildSiteRateRows(chart, dashboardData.charts[chart.id], { year: 2026 })

    expect(rows[0]).toEqual({
      category: 'Boulder Creek Estates OS (Site 1)',
      label: 'Site 1',
      available: 142,
      values: { emergence: { sealed: 44, rate: 31 } },
    })
  })

  it('offers 2026 only and explains why earlier years are not shown', async () => {
    const table = await renderTable('emergence-rate-by-site', 2023)

    expect(screen.getByRole('heading', { name: /Emergence Rate by Site \(2026\)/ })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('since 2026')
    expect(
      within(table).getByRole('row', { name: /^Boulder Creek Estates OS \(Site 1\)/ })
    ).toHaveTextContent('44 of 142 (31%)')
  })

  it('names the table columns for emergence, not sealed nest rate', async () => {
    const table = await renderTable('emergence-rate-by-site', 2026)
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent)

    expect(headers).toEqual(['Site', 'Sealed nests', 'Emerged nests'])
  })

  it('draws site numbers under the bars and an emergence axis label', () => {
    const rows = buildSiteRateRows(chart, dashboardData.charts[chart.id], { year: 2026 })
    const { container } = render(<GroupedBarChart chart={chart} rows={rows} />)
    const xLabels = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')]
      .map((tick) => tick.textContent)
      .filter((text) => !text.endsWith('%'))

    expect(xLabels).toEqual(['Site 1', 'Site 3'])
    expect(container.querySelector('.recharts-label')).toHaveTextContent('Emergence rate (%)')
  })
})

describe('Nested Fabricated Cavities by End-of-Season Plug Depth - US-34', () => {
  const chart = chartById('plug-depth-by-year')
  const rowsFor = (year) =>
    buildChartRows(chart, dashboardData.charts[chart.id], { years: dashboardData.years, year })

  it('shows only the two depths recorded in 2023', () => {
    expect(rowsFor(2023).map((row) => row.category)).toEqual(['1/2 inch', 'protruding'])
  })

  it('shows all six depths from 2025, keeping real zeros', () => {
    const rows = rowsFor(2025)

    expect(rows.map((row) => row.category)).toEqual([
      '1.1 inches', '1 inch', '1/2 inch', '1/16 inch', 'flush', 'protruding',
    ])
    expect(rows.find((row) => row.category === '1/2 inch').counts.nests).toBe(0)
  })

  it("gives each depth's percentage of the year's nested cavities", () => {
    const rows = rowsFor(2025)

    expect(rows.find((row) => row.category === '1 inch').percents.nests).toBe(42.7) // 327 / 765
    expect(rows.find((row) => row.category === 'flush').percents.nests).toBe(34) // 260 / 765
  })

  it('explains the two 2023 depths only in 2023', async () => {
    await renderTable('plug-depth-by-year', 2023)
    expect(screen.getByRole('note')).toHaveTextContent('Only two depths')
    cleanup()

    await renderTable('plug-depth-by-year', 2025)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
