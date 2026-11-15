import { useRef } from 'react'

// WAI-ARIA tabs pattern: arrow keys, Home and End move between tabs with a
// roving tabindex, and moving to a tab selects it.
function DashboardTabs({ tabs, selectedTabId, onSelectTab }) {
  const tabRefs = useRef({})

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

  return (
    <div
      role="tablist"
      aria-label="Chart categories"
      className="dashboard-tabs"
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
  )
}

export default DashboardTabs
