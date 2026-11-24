import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { strings } from '../content/strings'

// Arrows scroll most of the visible width, leaving one tab in view for context.
const ARROW_SCROLL_SHARE = 0.8
// Room kept beside a tab scrolled into view, so it clears the arrow and fade.
const EDGE_MARGIN_PX = 40

// Smooth scrolling, unless the visitor asked their system to reduce motion.
const scrollBehavior = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

// WAI-ARIA tabs pattern: arrow keys, Home and End move between tabs with a
// roving tabindex, and moving to a tab selects it.
//
// When the tabs are wider than the panel the strip scrolls sideways. A fade
// and an arrow button appear on each side that has more tabs, and selecting a
// tab (by click, keyboard or a shared link) scrolls it into view. The arrows
// sit outside the tablist and out of the tab order: keyboard users move with
// the arrow keys, which already bring each tab into view.
function DashboardTabs({ tabs, selectedTabId, onSelectTab }) {
  const tabRefs = useRef({})
  const stripRef = useRef(null)
  const [more, setMore] = useState({ left: false, right: false })

  const updateMore = useCallback(() => {
    const strip = stripRef.current
    if (!strip) return
    const maxScroll = strip.scrollWidth - strip.clientWidth
    const left = strip.scrollLeft > 1
    const right = strip.scrollLeft < maxScroll - 1
    setMore((current) =>
      current.left === left && current.right === right ? current : { left, right }
    )
  }, [])

  useLayoutEffect(() => {
    updateMore()
    const strip = stripRef.current
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateMore)
    if (strip) observer?.observe(strip)
    window.addEventListener('resize', updateMore)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateMore)
    }
  }, [updateMore, tabs])

  // Bring the selected tab fully into view, moving the strip sideways only
  // (scrollIntoView could also scroll the page down to the dashboard).
  useEffect(() => {
    const strip = stripRef.current
    const tab = tabRefs.current[selectedTabId]
    if (!strip || !tab || typeof strip.scrollTo !== 'function') return

    const viewStart = strip.scrollLeft
    const viewEnd = viewStart + strip.clientWidth
    const tabStart = tab.offsetLeft
    const tabEnd = tabStart + tab.offsetWidth

    if (tabEnd > viewEnd - EDGE_MARGIN_PX) {
      // A tab too wide to clear both arrows (e.g. on a phone) keeps its start
      // in view rather than its end.
      const target = Math.max(
        0,
        Math.min(tabEnd - strip.clientWidth + EDGE_MARGIN_PX, tabStart - EDGE_MARGIN_PX)
      )
      if (target > viewStart) strip.scrollTo({ left: target, behavior: scrollBehavior() })
    } else if (tabStart < viewStart + EDGE_MARGIN_PX && viewStart > 0) {
      strip.scrollTo({ left: Math.max(0, tabStart - EDGE_MARGIN_PX), behavior: scrollBehavior() })
    }
  }, [selectedTabId])

  const scrollStrip = (direction) => {
    const strip = stripRef.current
    if (!strip || typeof strip.scrollBy !== 'function') return
    strip.scrollBy({
      left: direction * Math.round(strip.clientWidth * ARROW_SCROLL_SHARE),
      behavior: scrollBehavior(),
    })
  }

  const focusTab = (index) => {
    const tab = tabs[(index + tabs.length) % tabs.length]
    onSelectTab(tab.id)
    tabRefs.current[tab.id]?.focus()
  }

  const handleKeyDown = (event, index) => {
    const moves = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }

    if (!(event.key in moves)) return

    event.preventDefault()
    focusTab(moves[event.key])
  }

  const scrollerClass = [
    'dashboard-tabs-scroller',
    more.left && 'has-more-left',
    more.right && 'has-more-right',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={scrollerClass}>
      {more.left && (
        <button
          type="button"
          className="dashboard-tabs-arrow dashboard-tabs-arrow-left"
          aria-label={strings.dashboardTabsMoreLeft}
          tabIndex={-1}
          onClick={() => scrollStrip(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}

      <div
        ref={stripRef}
        role="tablist"
        aria-label="Chart categories"
        className="dashboard-tabs"
        onScroll={updateMore}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedTabId

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element
              }}
              type="button"
              role="tab"
              id={`dashboard-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`dashboard-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className="dashboard-tab"
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {more.right && (
        <button
          type="button"
          className="dashboard-tabs-arrow dashboard-tabs-arrow-right"
          aria-label={strings.dashboardTabsMoreRight}
          tabIndex={-1}
          onClick={() => scrollStrip(1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  )
}

export default DashboardTabs
