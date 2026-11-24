// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cloneElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import HorizontalBarChart from '../../src/components/HorizontalBarChart'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { getSiteNumbers } from '../../src/utils/facetedChartRows'
import {
  buildGenusRows,
  buildTypeGenusRows,
  genusLabel,
  largestRemainderPercents,
} from '../../src/utils/genusChartRows'
import { buildSiteRateRows } from '../../src/utils/rateChartRows'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

// jsdom has no layout, so Recharts' ResponsiveContainer measures 0 and draws
// nothing. Give the chart a fixed size so the real SVG renders in tests.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      cloneElement(children, { width: 800, height: 600 }),
  }
})

const tab = dashboardConfig.find((item) => item.id === 'genus')
const chartById = (id) => tab.charts.find((chart) => chart.id === id)
const loadData = () => Promise.resolve(dashboardData)

async function renderTable(chartId, year, measure = 'count') {
  window.history.replaceState(null, '', `/embed?tab=genus&chart=${chartId}&year=${year}&measure=${measure}`)
  render(<DashboardPanel loadData={loadData} />)
  return screen.findByRole('table', { name: chartById(chartId).title })
}

const sum = (values) => Math.round(values.reduce((total, value) => total + value, 0) * 10) / 10

beforeEach(() => {
  stubResizeObserver(vi)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Genus tab - US-32', () => {
  it("uses the deck's tab name and lists the three charts in deck order", () => {
    expect(tab.label).toBe('Occupants by Genus (General ID)')
    expect(tab.charts.map((chart) => chart.id)).toEqual([
      'occupants-by-type-genus',
      'occupants-by-genus',
      'multi-genus-cavities-by-site',
    ])
    expect(chartById('multi-genus-cavities-by-site').title)
      .toBe('Percentage of Occupied Fabricated Cavities with More Than One Genus, by Site')
  })

  it('sits after the Season tab and before Nest Sites, as in the deck', () => {
    const ids = dashboardConfig.map((item) => item.id)
    expect(ids.indexOf('genus')).toBe(ids.indexOf('season') + 1)
    expect(ids.indexOf('nest-sites')).toBe(ids.indexOf('genus') + 1)
  })
})

describe('genus labels and percentages - US-32', () => {
  it('labels a General ID of "Unknown" as "Unknown genus"', () => {
    expect(genusLabel('Unknown')).toBe('Unknown genus')
    expect(genusLabel('Hylaeus')).toBe('Hylaeus')
  })

  it('rounds shares so they still sum to exactly 100', () => {
    expect(largestRemainderPercents([1, 1, 1], 3)).toEqual([33.4, 33.3, 33.3])
    expect(sum(largestRemainderPercents([2, 1, 1, 1, 1, 1], 7))).toBe(100)
    expect(largestRemainderPercents([0, 0], 0)).toEqual([0, 0])
  })
})

describe('Occupants by Occupant Type and General ID - US-32', () => {
  const chart = chartById('occupants-by-type-genus')
  const rows = buildTypeGenusRows(chart, dashboardData.charts[chart.id], { year: 2026 })

  it('groups genera under Bee, Wasp, Unknown, Other, biggest first within each', () => {
    expect(rows.map((row) => `${row.facet}: ${row.category}`)).toEqual([
      'Bee: Megachile (Eutricharaea)',
      'Bee: Megachile (multiple)',
      'Bee: Unknown genus',
      'Wasp: Isodontia',
      'Wasp: Eumeninae',
      'Wasp: Unknown genus',
      'Unknown: Unknown genus',
      'Other: Other',
    ])
  })

  it('gives percentages within each occupant type that sum to 100', () => {
    for (const type of ['Bee', 'Wasp', 'Unknown', 'Other']) {
      const shares = rows.filter((row) => row.facet === type).map((row) => row.percents.occupants)
      expect(sum(shares)).toBe(100)
    }
    expect(rows[0].percents.occupants).toBe(62.1) // 309 of 498 Bees is 62.05%; it takes the spare 0.1 so Bees sum to 100
  })

  it('has no rows for a year without data', () => {
    expect(buildTypeGenusRows(chart, dashboardData.charts[chart.id], { year: 2024 })).toEqual([])
  })

  it('lists each occupant type with its genera in the data table', async () => {
    const table = await renderTable('occupants-by-type-genus', 2026, 'percent')

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['Occupant type', 'General ID', 'Occupants', 'Total'])
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('BeeMegachile (Eutricharaea)309 (62.1%)309')
  })

  it('colors each bar by its occupant type, with a key for the types', () => {
    const { container } = render(<HorizontalBarChart chart={chart} rows={rows} measure="count" />)
    const fills = [...container.querySelectorAll('.recharts-bar-rectangle path')]
      .map((bar) => bar.getAttribute('fill'))

    expect(new Set(fills)).toEqual(new Set(['#73966E', '#617EB3', '#7B6E9E', '#F1DDB5']))
    expect(container.querySelector('.faceted-chart-legend')).toHaveTextContent('BeeWaspUnknownOther')
  })
})

describe('Occupants by General ID - US-32', () => {
  const chart = chartById('occupants-by-genus')
  const rowsFor = (year) =>
    buildGenusRows(chart, dashboardData.charts[chart.id], { years: dashboardData.years, year })

  it('ranks genera by count, biggest first', () => {
    const totals = rowsFor(2026).map((row) => row.total)
    expect(totals).toEqual([...totals].sort((a, b) => b - a))
    expect(rowsFor(2026)[0].category).toBe('Megachile (Eutricharaea)')
  })

  it('shows "Unknown" as its own bar labelled "Unknown genus", split by occupant type', () => {
    const unknown = rowsFor(2026).find((row) => row.category === 'Unknown genus')

    expect(unknown.counts).toEqual({ Bee: 9, Wasp: 9, Unknown: 29, Other: 0 })
    expect(unknown.total).toBe(47)
  })

  it("gives each genus's share of the year's occupants", () => {
    const rows = rowsFor(2026)
    const yearTotal = rows.reduce((total, row) => total + row.total, 0)
    const top = rows[0]

    expect(sum(Object.values(top.percents))).toBe(Math.round((top.total / yearTotal) * 1000) / 10)
  })

  it('leaves Unknown occupants out before 2026, when they were first recorded', async () => {
    const table = await renderTable('occupants-by-genus', 2023)

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['General ID', 'Bee', 'Wasp', 'Other', 'Total'])
  })

  it('draws horizontal bars with every genus label readable', () => {
    const rows = rowsFor(2026)
    const { container } = render(<HorizontalBarChart chart={chart} rows={rows} measure="count" />)
    const labels = [...container.querySelectorAll('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value')]
      .map((tick) => tick.textContent)

    expect(labels).toEqual(rows.map((row) => row.category))
  })

  it('prints each genus total at the end of its bar', () => {
    const rows = rowsFor(2026)
    const { container } = render(<HorizontalBarChart chart={chart} rows={rows} measure="count" />)
    const totals = [...container.querySelectorAll('.horizontal-bar-total')].map((label) => label.textContent)

    expect(totals.sort()).toEqual(rows.map((row) => row.total.toLocaleString()).sort())
  })

  it('switches the axis to percentages in percent mode', () => {
    const rows = rowsFor(2026)
    const { container } = render(<HorizontalBarChart chart={chart} rows={rows} measure="percent" />)
    const ticks = [...container.querySelectorAll('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value')]
      .map((tick) => tick.textContent)

    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.every((text) => text.endsWith('%'))).toBe(true)
  })
})

describe('Percentage of Occupied Fabricated Cavities with More Than One Genus, by Site - US-32', () => {
  const chart = chartById('multi-genus-cavities-by-site')

  it("is each site's multi-genus cavities as a share of its occupied cavities, in site order", () => {
    const rows = buildSiteRateRows(chart, dashboardData.charts[chart.id], {
      year: 2026,
      siteNumbers: getSiteNumbers(dashboardData),
    })

    expect(rows.map((row) => row.label)).toEqual(['Site 1', 'Site 3'])
    expect(rows[0]).toMatchObject({ available: 192, values: { multiGenus: { sealed: 32, rate: 17 } } })
  })

  it('shows the count and occupied cavities behind each percentage in the table', async () => {
    const table = await renderTable('multi-genus-cavities-by-site', 2026)

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['Site', 'Occupied cavities', 'Cavities with more than one genus'])
    expect(within(table).getByRole('row', { name: /^Site 1/ })).toHaveTextContent('32 of 192 (17%)')
  })
})
