// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

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

describe('Site Scorecard accessibility - US-35', () => {
  it('is a real table with site columns and genus and condition row headers', async () => {
    const table = await renderScorecard('scorecard-all-sites')
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent)

    expect(headers).toEqual(['Site 1', 'Site 3', 'Site 5Sherwood OS'])
    expect(within(table).getByRole('rowheader', { name: 'Hylaeus' })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: 'Parasitism' })).toBeInTheDocument()
  })

  it('states present, only-at-this-site and absent in text, not color alone', async () => {
    const table = await renderScorecard('scorecard-all-sites')

    expect(rowNamed(table, 'Hylaeus')).toHaveTextContent(/Present.*Absent/)
    expect(rowNamed(table, 'Megachile \\(Chelostomoides\\)'))
      .toHaveTextContent(/Absent.*Present, only observed at this site/)
  })

  it('explains every cell state in a legend', async () => {
    await renderScorecard('scorecard-all-sites')
    const legend = screen.getByRole('list', { name: 'Scorecard key' })

    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '✓Genus present (+1 point)',
      '★Only observed at this site (+1 bonus)',
      '+1Bonus: 30% or less, or Emergence recorded (+1 point)',
      '⚑Flag: over 30% (flagged for evaluation)',
      'Absent or not applicable',
    ])
  })

  it('lets the table scroll sideways with the row labels fixed', async () => {
    const table = await renderScorecard('scorecard-all-sites')
    const region = screen.getByRole('region', { name: 'Site Scorecard: All Sites (2026), scrolls sideways' })

    expect(region).toContainElement(table)
    expect(region).toHaveAttribute('tabindex', '0')
    expect(within(table).getByRole('rowheader', { name: 'Hylaeus' })).toHaveClass('scorecard-label')
  })
})
