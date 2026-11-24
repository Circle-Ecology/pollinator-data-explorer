// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import DashboardTabs from '../../src/components/DashboardTabs'
import { stubResizeObserver } from '../fixtures/dashboardData'

const tabs = ['Occupancy', 'Occupants', 'Season', 'Genus', 'Nest Sites', 'Nest Condition', 'Scorecard']
  .map((label, index) => ({ id: `tab-${index}`, label }))

// jsdom has no layout: give the tab strip a fixed visible width, a wider
// content width, and a scroll position the test can move.
function fakeLayout(strip, { clientWidth = 300, scrollWidth = 900, scrollLeft = 0 } = {}) {
  Object.defineProperty(strip, 'clientWidth', { configurable: true, value: clientWidth })
  Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: scrollWidth })
  let left = scrollLeft
  Object.defineProperty(strip, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (value) => { left = value },
  })
  strip.scrollTo = vi.fn(({ left: to }) => { left = to })
  strip.scrollBy = vi.fn(({ left: by }) => { left += by })
  act(() => { fireEvent.scroll(strip) })
}

function renderTabs(selectedTabId = 'tab-0', onSelectTab = () => {}) {
  const view = render(<DashboardTabs tabs={tabs} selectedTabId={selectedTabId} onSelectTab={onSelectTab} />)
  return { ...view, strip: screen.getByRole('tablist') }
}

beforeEach(() => {
  stubResizeObserver(vi)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('dashboard tab scroll cues', () => {
  it('shows no arrows or fades when every tab fits', () => {
    const { strip, container } = renderTabs()
    fakeLayout(strip, { clientWidth: 900, scrollWidth: 900 })

    expect(screen.queryByRole('button', { name: /more tabs/i })).not.toBeInTheDocument()
    expect(container.querySelector('.dashboard-tabs-scroller')).not.toHaveClass('has-more-left')
    expect(container.querySelector('.dashboard-tabs-scroller')).not.toHaveClass('has-more-right')
  })

  it('shows a right arrow and fade at the start when more tabs are off to the right', () => {
    const { strip, container } = renderTabs()
    fakeLayout(strip)

    expect(screen.getByRole('button', { name: 'Show more tabs to the right' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more tabs to the left' })).not.toBeInTheDocument()
    expect(container.querySelector('.dashboard-tabs-scroller')).toHaveClass('has-more-right')
  })

  it('shows both arrows in the middle and only the left one at the end', () => {
    const { strip } = renderTabs()
    fakeLayout(strip, { scrollLeft: 200 })

    expect(screen.getByRole('button', { name: 'Show more tabs to the left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show more tabs to the right' })).toBeInTheDocument()

    fakeLayout(strip, { scrollLeft: 600 })
    expect(screen.getByRole('button', { name: 'Show more tabs to the left' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more tabs to the right' })).not.toBeInTheDocument()
  })

  it('scrolls the strip by most of its width when an arrow is clicked', () => {
    const { strip } = renderTabs()
    fakeLayout(strip)

    fireEvent.click(screen.getByRole('button', { name: 'Show more tabs to the right' }))

    expect(strip.scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' })
  })

  it('keeps the arrows out of the tablist and out of the tab order', () => {
    const { strip } = renderTabs()
    fakeLayout(strip)
    const arrow = screen.getByRole('button', { name: 'Show more tabs to the right' })

    expect(strip).not.toContainElement(arrow)
    expect(arrow).toHaveAttribute('tabindex', '-1')
  })

  it('scrolls a newly selected tab into view, sideways only', () => {
    const { strip, rerender } = renderTabs()
    fakeLayout(strip)
    const last = screen.getByRole('tab', { name: 'Scorecard' })
    Object.defineProperty(last, 'offsetLeft', { configurable: true, value: 800 })
    Object.defineProperty(last, 'offsetWidth', { configurable: true, value: 100 })

    rerender(<DashboardTabs tabs={tabs} selectedTabId="tab-6" onSelectTab={() => {}} />)

    // 800 + 100 - 300, plus 40px so the tab clears the right arrow and fade.
    expect(strip.scrollTo).toHaveBeenCalledWith({ left: 640, behavior: 'smooth' })
  })

  it("keeps a wide first tab's start in view on a narrow screen", () => {
    const { strip, rerender } = renderTabs('tab-1')
    fakeLayout(strip, { clientWidth: 280 })
    const first = screen.getByRole('tab', { name: 'Occupancy' })
    Object.defineProperty(first, 'offsetLeft', { configurable: true, value: 16 })
    Object.defineProperty(first, 'offsetWidth', { configurable: true, value: 260 })

    rerender(<DashboardTabs tabs={tabs} selectedTabId="tab-0" onSelectTab={() => {}} />)

    expect(strip.scrollTo).not.toHaveBeenCalled()
    expect(strip.scrollLeft).toBe(0)
  })
})
