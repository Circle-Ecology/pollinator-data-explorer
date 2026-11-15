import { getChartYears } from './buildChartRows'

// US-29: which tab, chart, year and measure are selected, kept in the URL as
// ?tab=&chart=&year=&measure= so a reload (or a shared link) restores the view.
const PARAM_NAMES = ['tab', 'chart', 'year', 'measure']

export function readDashboardParams(search) {
  const params = new URLSearchParams(search)

  return {
    tab: params.get('tab'),
    chart: params.get('chart'),
    year: params.get('year'),
    measure: params.get('measure'),
  }
}

// Returns a query string with the dashboard params replaced and any other
// params (for example ones the embed page uses) left untouched.
export function writeDashboardParams(search, selection) {
  const params = new URLSearchParams(search)

  for (const name of PARAM_NAMES) {
    const value = selection[name]

    if (value === null || value === undefined || value === '') {
      params.delete(name)
    } else {
      params.set(name, String(value))
    }
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

// Turns requested values (from the URL or a click) into a valid selection,
// falling back to the first tab, its first chart, the latest year with data
// and the chart's first measure.
export function resolveSelection(config, requested, data) {
  const tab = config.find((item) => item.id === requested.tab) ?? config[0]

  if (!tab) {
    return { tab: null, chart: null, year: null, measure: null }
  }

  const chart =
    tab.charts.find((item) => item.id === requested.chart) ?? tab.charts[0]

  const years = getChartYears(data?.charts?.[chart.id], data?.years ?? [])
  const requestedYear = Number(requested.year)

  let year = null

  if (chart.supportsYears && years.length > 0) {
    year = years.includes(requestedYear) ? requestedYear : years.at(-1)
  }

  const measure = chart.measures.includes(requested.measure)
    ? requested.measure
    : chart.measures[0]

  return { tab: tab.id, chart: chart.id, year, measure }
}
