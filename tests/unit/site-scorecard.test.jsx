// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import {
  buildAllSitesColumns,
  buildGenusGroups,
  buildSiteOverYearsSites,
  conditionCell,
  genusState,
  siteHeading,
} from '../../src/utils/scorecardRows'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const tab = dashboardConfig.find((item) => item.id === 'site-scorecard')
const allSites = tab.charts.find((chart) => chart.id === 'scorecard-all-sites')
const overYears = tab.charts.find((chart) => chart.id === 'scorecard-site-over-years')
const loadData = () => Promise.resolve(dashboardData)

async function renderScorecard(chartId, year = 2026) {
  window.history.replaceState(null, '', `/embed?tab=site-scorecard&chart=${chartId}&year=${year}`)
  render(<DashboardPanel loadData={loadData} />)
  return screen.findByRole('table')
}

const rowNamed = (table, name) => within(table).getByRole('row', { name: new RegExp(`^${name}`) })

beforeEach(() => {
  stubResizeObserver(vi)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Site Scorecard config - US-35', () => {
  it("uses the deck's tab name and has both views", () => {
    expect(tab.label).toBe('Site Scorecard')
    expect(tab.charts.map((chart) => chart.id)).toEqual(['scorecard-all-sites', 'scorecard-site-over-years'])
    expect(allSites.title).toBe('Site Scorecard: All Sites')
  })
})

describe('scorecard rows - US-35', () => {
  it('heads each site column with its number and property name', () => {
    expect(siteHeading({ siteId: 'Boulder Creek Estates OS (Site 1)', siteNumber: '1' }))
      .toEqual({ title: 'Site 1', subtitle: 'Boulder Creek Estates OS' })
    expect(siteHeading({ siteId: 'Sherwood OS', siteNumber: '5' }))
      .toEqual({ title: 'Site 5', subtitle: 'Sherwood OS' })
    expect(siteHeading({ siteId: 'Site 2 (retired in 2023)', siteNumber: '2' }))
      .toEqual({ title: 'Site 2', subtitle: '(retired in 2023)' })
  })

  it("groups genera Bee, Wasp, Unknown in the deck's order", () => {
    const groups = buildGenusGroups(allSites, dashboardData)

    expect(groups.map((group) => group.group)).toEqual(['Bee', 'Wasp', 'Unknown'])
    expect(groups[0].genera.slice(0, 3)).toEqual(['Hylaeus', 'Anthidium', 'Dianthidium'])
  })

  it('marks a genus found only at this site', () => {
    const [, , site5] = buildAllSitesColumns(allSites, dashboardData, 2026)

    expect(genusState(site5.entry, 'Megachile (Chelostomoides)')).toBe('unique')
    expect(genusState(site5.entry, 'Heriades')).toBe('present')
    expect(genusState(site5.entry, 'Hylaeus')).toBe('absent')
  })

  it('shows emergence as a rate only from 2026', () => {
    const [site1] = buildSiteOverYearsSites(overYears, dashboardData)
    const [y2025, y2026] = site1.columns

    expect(conditionCell(overYears, y2026, 'emergence')).toEqual({ state: 'bonus', text: '31%' })
    expect(conditionCell(overYears, y2025, 'emergence')).toEqual({ state: 'bonus', text: 'Recorded' })
  })

  it('lists sites for the across-years view in site number order', () => {
    const sites = buildSiteOverYearsSites(overYears, dashboardData)

    expect(sites.map((site) => site.title)).toEqual(['Site 1', 'Site 5'])
    expect(sites[0].columns.map((column) => column.title)).toEqual(['2025', '2026'])
  })
})

describe('All Sites scorecard - US-35', () => {
  it('shows a flagged risk factor with its rate and a flag marker', async () => {
    const table = await renderScorecard('scorecard-all-sites')
    const megachile = rowNamed(table, 'Megachile \\(Eutricharaea\\) >30%')

    expect(megachile).toHaveTextContent(/26%.*8%.*48%.*flagged/)
    expect(within(megachile).getAllByRole('cell')[2]).toHaveClass('scorecard-flag')
    expect(within(megachile).getAllByRole('cell')[0]).not.toHaveClass('scorecard-flag')
  })

  it('keeps a flagged site\'s score and category and adds "(flagged)"', async () => {
    const table = await renderScorecard('scorecard-all-sites')

    expect(rowNamed(table, 'Final Score')).toHaveTextContent('15 / 2414 / 2416 / 24')
    expect(rowNamed(table, 'Category')).toHaveTextContent('HighHighVery High (flagged)')
  })
})

describe('One Site Across Years scorecard - US-35', () => {
  it('shows one column per year for the chosen site', async () => {
    const table = await renderScorecard('scorecard-site-over-years')

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['2025', '2026'])
    expect(table).toHaveAccessibleName(/Site 1/)
  })

  it('switches site from the select', async () => {
    await renderScorecard('scorecard-site-over-years')

    fireEvent.change(screen.getByLabelText('Site'), { target: { value: 'Sherwood OS' } })

    const table = screen.getByRole('table')
    expect(table).toHaveAccessibleName(/Site 5, Sherwood OS/)
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['2026'])
  })
})
