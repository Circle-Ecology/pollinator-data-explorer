import { useEffect, useState } from 'react'
import { getDashboardData } from '../api/getDashboardData'
import { dashboardConfig } from '../content/dashboardConfig'
import { strings } from '../content/strings'
import {
  readDashboardParams,
  resolveSelection,
  writeDashboardParams,
} from '../utils/dashboardSelection'
import ChartList from './ChartList'
import ChartView from './ChartView'
import DashboardTabs from './DashboardTabs'
import './DashboardPanel.css'

// US-29: the data visualization dashboard below the map. Tabs come from
// dashboardConfig; every figure comes from /data/dashboard.json.
function DashboardPanel({
  config = dashboardConfig,
  loadData = getDashboardData,
}) {
  const [state, setState] = useState({ status: 'loading', data: null })
  const [requested, setRequested] = useState(() =>
    readDashboardParams(window.location.search)
  )

  useEffect(() => {
    let cancelled = false

    loadData()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null })
      })

    return () => {
      cancelled = true
    }
  }, [loadData])

  const selection = resolveSelection(config, requested, state.data)
  const isReady = state.status === 'ready'

  useEffect(() => {
    if (!isReady) return

    const { pathname, search, hash } = window.location
    const query = writeDashboardParams(search, selection)

    if (query !== search) {
      window.history.replaceState(null, '', `${pathname}${query}${hash}`)
    }
  }, [isReady, selection.tab, selection.chart, selection.year, selection.measure]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (changes) => setRequested({ ...selection, ...changes })

  let body

  if (state.status === 'loading') {
    body = (
      <p role="status" className="dashboard-message">
        {strings.dashboardLoadingLabel}
      </p>
    )
  } else if (state.status === 'error') {
    // A polite status, not an alert: when all data is down the map already
    // raises the alert, and the dashboard is the secondary section.
    body = (
      <div role="status" className="dashboard-message">
        <h3>{strings.dashboardErrorTitle}</h3>
        <p>{strings.dashboardErrorMessage}</p>
      </div>
    )
  } else {
    const tab = config.find((item) => item.id === selection.tab)
    const chart = tab.charts.find((item) => item.id === selection.chart)

    body = (
      <>
        <DashboardTabs
          tabs={config}
          selectedTabId={tab.id}
          onSelectTab={(tabId) => update({ tab: tabId, chart: null })}
        />

        <div
          role="tabpanel"
          id={`dashboard-panel-${tab.id}`}
          aria-labelledby={`dashboard-tab-${tab.id}`}
          className="dashboard-tabpanel"
        >
          <ChartList
            tab={tab}
            selectedChartId={chart.id}
            onSelectChart={(chartId) => update({ chart: chartId })}
          />

          <ChartView
            chart={chart}
            data={state.data}
            year={selection.year}
            measure={selection.measure}
            onChangeYear={(year) => update({ year })}
            onChangeMeasure={(measure) => update({ measure })}
          />
        </div>
      </>
    )
  }

  return (
    <section className="dashboard-panel" aria-labelledby="dashboard-title">
      <h2 id="dashboard-title" className="dashboard-title">
        {strings.dashboardTitle}
      </h2>
      {body}
    </section>
  )
}

export default DashboardPanel
