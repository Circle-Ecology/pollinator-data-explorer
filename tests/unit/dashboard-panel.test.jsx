// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const twoTabConfig = [
  ...dashboardConfig,
  {
    id: 'second',
    label: 'Second Tab',
    charts: [{ ...dashboardConfig[0].charts[1], title: 'Second Tab Chart' }],
  },
]

const loadData = () => Promise.resolve(dashboardData)

beforeEach(() => {
  stubResizeObserver(vi)
  window.history.replaceState(null, '', '/embed')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DashboardPanel - US-29', () => {
  it('renders one tab per category in config order, first selected', async () => {
    render(<DashboardPanel config={twoTabConfig} loadData={loadData} />)

    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Occupancy', 'Second Tab'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { name: 'Occupied vs. Empty Nesting Holes by Year' })
    ).toBeInTheDocument()
  })

  it('lists the charts in the tab and swaps chart and snippet on select', async () => {
    render(<DashboardPanel loadData={loadData} />)

    const nav = await screen.findByRole('navigation', { name: 'Charts: Occupancy' })
    const item = within(nav).getByRole('button', {
      name: 'Occupied vs. Empty Nesting Holes by Site',
    })

    fireEvent.click(item)

    expect(item).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('heading', {
        name: 'Occupied vs. Empty Nesting Holes by Site (2026)',
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/Each bar is one monitoring site/)).toBeInTheDocument()
  })

  it('offers only years with data and never 2024', async () => {
    window.history.replaceState(null, '', '/embed?chart=occupancy-by-site')
    render(<DashboardPanel loadData={loadData} />)

    const group = await screen.findByRole('group', { name: 'Year' })
    const years = within(group).getAllByRole('button').map((b) => b.textContent)

    expect(years).toEqual(['2023', '2025', '2026'])
  })

  it('keeps the selected year when switching measure', async () => {
    window.history.replaceState(null, '', '/embed?chart=occupancy-by-site')
    render(<DashboardPanel loadData={loadData} />)

    const yearGroup = await screen.findByRole('group', { name: 'Year' })
    fireEvent.click(within(yearGroup).getByRole('button', { name: '2023' }))
    fireEvent.click(screen.getByRole('button', { name: 'Percentage' }))

    expect(within(yearGroup).getByRole('button', { name: '2023' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Percentage' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('restores the view from the URL and writes changes back', async () => {
    window.history.replaceState(
      null,
      '',
      '/embed?tab=occupancy&chart=occupancy-by-site&year=2025&measure=percent'
    )
    render(<DashboardPanel loadData={loadData} />)

    expect(
      await screen.findByRole('heading', {
        name: 'Occupied vs. Empty Nesting Holes by Site (2025)',
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Percentage' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: '2023' }))
    expect(window.location.search).toContain('year=2023')
  })

  it('shows the caveat when the chart has one', async () => {
    render(<DashboardPanel loadData={loadData} />)

    expect(await screen.findByRole('note')).toHaveTextContent(
      'tracked on a separate sheet'
    )
  })

  it('omits the caveat when the chart has none', async () => {
    const config = [
      {
        ...dashboardConfig[0],
        charts: [{ ...dashboardConfig[0].charts[0], caveat: undefined }],
      },
    ]
    render(<DashboardPanel config={config} loadData={loadData} />)

    await screen.findByRole('tab')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows a friendly message when dashboard.json fails to load', async () => {
    render(
      <DashboardPanel loadData={() => Promise.reject(new Error('404'))} />
    )

    expect(
      await screen.findByText('Charts are temporarily unavailable')
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
