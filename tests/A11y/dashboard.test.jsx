// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DashboardPanel from '../../src/components/DashboardPanel'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { dashboardData, stubResizeObserver } from '../fixtures/dashboardData'

const threeTabConfig = ['First', 'Second', 'Third'].map((label, index) => ({
  id: `tab-${index}`,
  label,
  charts: [{ ...dashboardConfig[0].charts[0], title: `${label} chart` }],
}))

const loadData = () => Promise.resolve(dashboardData)

beforeEach(() => {
  stubResizeObserver(vi)
  window.history.replaceState(null, '', '/embed')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('dashboard accessibility - US-29', () => {
  it('follows the tabs pattern with a roving tabindex and arrow keys', async () => {
    render(<DashboardPanel config={threeTabConfig} loadData={loadData} />)

    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1])

    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(tabs[1]).toHaveFocus()
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(tabs[1], { key: 'End' })
    expect(tabs[2]).toHaveFocus()

    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' })
    expect(tabs[0]).toHaveFocus()

    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(tabs[2]).toHaveFocus()

    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      tabs[2].id
    )
  })

  it('exposes every chart value in a data table', async () => {
    render(<DashboardPanel loadData={loadData} />)

    const table = await screen.findByRole('table', {
      name: 'Occupied vs. Empty Nesting Holes by Year',
    })
    const rows = within(table).getAllByRole('row')

    expect(rows).toHaveLength(4)
    expect(rows[1]).toHaveTextContent('2023')
    expect(rows[1]).toHaveTextContent('233 (37%)')
    expect(rows[1]).toHaveTextContent('630')
  })

  it('labels the chart list select for narrow screens', async () => {
    render(<DashboardPanel loadData={loadData} />)

    expect(
      await screen.findByRole('combobox', { name: 'Charts' })
    ).toBeInTheDocument()
  })
})
