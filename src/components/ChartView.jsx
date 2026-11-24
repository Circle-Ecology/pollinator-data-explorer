import { strings } from '../content/strings'
import {
  buildChartRows,
  getChartYears,
  getVisibleSeries,
} from '../utils/buildChartRows'
import { getCaveatText } from '../utils/chartCaveat'
import { buildFacetedRows, getSiteNumbers } from '../utils/facetedChartRows'
import {
  buildGroupedCountRows,
  buildGroupedCountSummary,
} from '../utils/groupedCountRows'
import { buildRateRows, buildSiteRateRows } from '../utils/rateChartRows'
import ChartDataTable from './ChartDataTable'
import ChartSnippet from './ChartSnippet'
import FacetedStackedBarChart from './FacetedStackedBarChart'
import GroupedBarChart from './GroupedBarChart'
import GroupedCountTable from './GroupedCountTable'
import MeasureToggle from './MeasureToggle'
import RateDataTable from './RateDataTable'
import StackedBarChart from './StackedBarChart'
import YearToggle from './YearToggle'

// Chart types a config entry can name in its `component` field: how its rows
// are built from dashboard.json, which chart draws them, and which table
// lists them. `buildSummary`, when present, adds rows only the table shows.
const CHART_TYPES = {
  stackedBar: {
    Chart: StackedBarChart,
    Table: ChartDataTable,
    buildRows: (chart, data, year) =>
      buildChartRows(chart, data.charts[chart.id], { years: data.years, year }),
  },
  groupedRate: {
    Chart: GroupedBarChart,
    Table: RateDataTable,
    buildRows: (chart, data, year) =>
      buildRateRows(chart, data.charts[chart.id], { year }),
  },
  groupedCount: {
    Chart: GroupedBarChart,
    Table: GroupedCountTable,
    buildRows: (chart, data, year) =>
      buildGroupedCountRows(chart, data.charts[chart.id], { year }),
    buildSummary: (chart, data, year) =>
      buildGroupedCountSummary(chart, data.charts[chart.id], { year }),
  },
  siteRate: {
    Chart: GroupedBarChart,
    Table: RateDataTable,
    buildRows: (chart, data, year) =>
      buildSiteRateRows(chart, data.charts[chart.id], { year }),
  },
  facetedStackedBar: {
    Chart: FacetedStackedBarChart,
    Table: ChartDataTable,
    buildRows: (chart, data, year) =>
      buildFacetedRows(chart, data.charts[chart.id], {
        year,
        siteNumbers: getSiteNumbers(data),
      }),
  },
}

function ChartView({ chart, data, year, measure, onChangeYear, onChangeMeasure }) {
  const chartData = data.charts[chart.id]
  const years = getChartYears(chartData, data.years)
  const type = CHART_TYPES[chart.component]
  const caveat = getCaveatText(chart.caveat, chart.supportsYears ? year : null)
  const rows = type ? type.buildRows(chart, data, year) : []
  const summary = type?.buildSummary?.(chart, data, year)
  const yearsInView = chart.supportsYears ? [year] : years
  const visibleChart = {
    ...chart,
    series: getVisibleSeries(chart, yearsInView),
  }

  return (
    <section className="chart-view" aria-labelledby={`chart-title-${chart.id}`}>
      <h3 id={`chart-title-${chart.id}`} className="chart-view-title">
        {chart.title}
        {chart.supportsYears && year ? ` (${year})` : ''}
      </h3>

      <div className="chart-view-controls">
        {chart.supportsYears && years.length > 0 && (
          <YearToggle years={years} value={year} onChange={onChangeYear} />
        )}

        {chart.measures.length > 1 && (
          <MeasureToggle
            measures={chart.measures}
            value={measure}
            onChange={onChangeMeasure}
          />
        )}
      </div>

      {rows.length > 0 ? (
        <>
          <type.Chart chart={visibleChart} rows={rows} measure={measure} />
          <ChartSnippet snippet={chart.snippet} caveat={caveat} />
          <type.Table chart={visibleChart} rows={rows} summary={summary} />
        </>
      ) : (
        <>
          <p className="chart-view-empty">{strings.dashboardNoData}</p>
          <ChartSnippet snippet={chart.snippet} caveat={caveat} />
        </>
      )}
    </section>
  )
}

export default ChartView
