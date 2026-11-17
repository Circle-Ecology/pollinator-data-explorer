
 // @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const twoTabConfig = [
  dashboardConfig[0],
  {
    id: 'second',
    label: 'Second Tab',
    charts: [{ ...dashboardConfig[0].charts[1], title: 'Second Tab Chart' }],
  },
]

const loadData = () => Promise.resolve(dashboardData)

// US-32: Add Genus chart data to the existing dashboard fixture.
// The original Occupancy data remains unchanged.
const loadIntegratedData = () =>
  Promise.resolve({
    ...dashboardData,
    charts: {
      ...dashboardData.charts,

      'occupants-by-type-genus': {
        2023: [
          {
            occupantType: 'Bee',
            generalId: 'Osmia',
            occupants: 3,
            typeTotal: 4,
          },
          {
            occupantType: 'Bee',
            generalId: 'Bombus',
            occupants: 1,
            typeTotal: 4,
          },
        ],
        2025: [
          {
            occupantType: 'Bee',
            generalId: 'Osmia',
            occupants: 5,
            typeTotal: 5,
          },
        ],
        2026: [
          {
            occupantType: 'Wasp',
            generalId: 'Vespula',
            occupants: 4,
            typeTotal: 4,
          },
        ],
      },

      'occupants-by-genus': {
        2023: [
          { generalId: 'Osmia', total: 3 },
          { generalId: 'Bombus', total: 1 },
        ],
        2025: [
          { generalId: 'Osmia', total: 5 },
        ],
        2026: [
          { generalId: 'Vespula', total: 4 },
        ],
      },

      'multi-genus-cavities-by-site': {
        2023: [
          {
            siteId: 'site-1',
            propertyName: 'Sandstone Ranch',
            multiGenus: 2,
            occupied: 10,
          },
        ],
        2025: [
          {
            siteId: 'site-1',
            propertyName: 'Sandstone Ranch',
            multiGenus: 3,
            occupied: 12,
          },
        ],
        2026: [
          {
            siteId: 'site-1',
            propertyName: 'Sandstone Ranch',
            multiGenus: 4,
            occupied: 15,
          },
        ],
      },
    },
  })

beforeEach(() => {
  stubResizeObserver(vi)
  window.history.replaceState(null, '', '/embed')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// --------------------------------------------------
// US-29: Existing dashboard tests
// --------------------------------------------------

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

  it('switches to the Occupants tab and its charts', async () => {
    render(<DashboardPanel loadData={loadData} />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Occupants' }))

    expect(screen.getByRole('tab', { name: 'Occupants' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(
      screen.getByRole('heading', { name: 'Occupants by Year and Type' })
    ).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Charts: Occupants' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Occupants by Year and Type',
      'Occupants by Site',
      'Occupants by Site and Type',
      'Other Occupants by Site and Type',
    ])
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

// --------------------------------------------------
// US-32: Genus charts integrated into existing dashboard
// --------------------------------------------------

describe('DashboardPanel - US-32 integration', () => {
  it('shows Occupancy, Occupants, and Genus as tabs in the same dashboard', async () => {
    render(<DashboardPanel loadData={loadIntegratedData} />)

    const tabs = await screen.findAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Occupancy',
      'Occupants',
      'Genus',
    ])

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('displays all three Genus charts in the existing dashboard', async () => {
    render(<DashboardPanel loadData={loadIntegratedData} />)

    fireEvent.click(
      await screen.findByRole('tab', { name: 'Genus' })
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Occupants by Occupant Type and General ID (2026)',
      })
    ).toBeInTheDocument()

    const nav = screen.getByRole('navigation', {
      name: 'Charts: Genus',
    })

    const chartNames = [
      'Occupants by Occupant Type and General ID',
      'Occupants by General ID',
      'Cavities Occupied by More Than One Genus, by Site',
    ]

    for (const name of chartNames) {
      expect(
        within(nav).getByRole('button', { name })
      ).toBeInTheDocument()
    }
  })

  it('switches between the three Genus charts', async () => {
    render(<DashboardPanel loadData={loadIntegratedData} />)

    fireEvent.click(
      await screen.findByRole('tab', { name: 'Genus' })
    )

    const nav = screen.getByRole('navigation', {
      name: 'Charts: Genus',
    })

    fireEvent.click(
      within(nav).getByRole('button', {
        name: 'Occupants by General ID',
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Occupants by General ID (2026)',
      })
    ).toBeInTheDocument()

    fireEvent.click(
      within(nav).getByRole('button', {
        name: 'Cavities Occupied by More Than One Genus, by Site',
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Cavities Occupied by More Than One Genus, by Site (2026)',
      })
    ).toBeInTheDocument()
  })

  it('supports year selection in the Genus tab', async () => {
    render(<DashboardPanel loadData={loadIntegratedData} />)

    fireEvent.click(
      await screen.findByRole('tab', { name: 'Genus' })
    )

    const yearGroup = screen.getByRole('group', {
      name: 'Year',
    })

    fireEvent.click(
      within(yearGroup).getByRole('button', {
        name: '2025',
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Occupants by Occupant Type and General ID (2025)',
      })
    ).toBeInTheDocument()
  })

  it('returns to Occupancy after viewing Genus charts', async () => {
    render(<DashboardPanel loadData={loadIntegratedData} />)

    fireEvent.click(
      await screen.findByRole('tab', { name: 'Genus' })
    )

    fireEvent.click(
      screen.getByRole('tab', { name: 'Occupancy' })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Occupied vs. Empty Nesting Holes by Year',
      })
    ).toBeInTheDocument()
  })
})
