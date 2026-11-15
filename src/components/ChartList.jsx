import { useId } from 'react'
import { strings } from '../content/strings'

// Side list of the charts in the selected tab. On narrow screens CSS swaps
// the list for a labelled select above the chart.
function ChartList({ tab, selectedChartId, onSelectChart }) {
  const selectId = useId()

  return (
    <div className="chart-list">
      <nav
        className="chart-list-nav"
        aria-label={`${strings.dashboardChartListLabel}: ${tab.label}`}
      >
        <h3 className="chart-list-heading">
          {strings.dashboardChartListLabel}
        </h3>

        <ul>
          {tab.charts.map((chart) => (
            <li key={chart.id}>
              <button
                type="button"
                className="chart-list-item"
                aria-current={chart.id === selectedChartId ? 'true' : undefined}
                onClick={() => onSelectChart(chart.id)}
              >
                {chart.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="chart-list-select">
        <label htmlFor={selectId}>{strings.dashboardChartListLabel}</label>
        <select
          id={selectId}
          value={selectedChartId}
          onChange={(event) => onSelectChart(event.target.value)}
        >
          {tab.charts.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default ChartList
