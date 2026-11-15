import { strings } from '../content/strings'
import { buildChartRows, getChartYears } from '../utils/buildChartRows'
import ChartDataTable from './ChartDataTable'
import ChartSnippet from './ChartSnippet'
import MeasureToggle from './MeasureToggle'
import StackedBarChart from './StackedBarChart'
import YearToggle from './YearToggle'

// Chart types a config entry can name in its `component` field.
const CHART_COMPONENTS = {
  stackedBar: StackedBarChart,
}

function ChartView({ chart, data, year, measure, onChangeYear, onChangeMeasure }) {
  const chartData = data.charts[chart.id]
  const years = getChartYears(chartData, data.years)
  const rows = buildChartRows(chart, chartData, { years: data.years, year })
  const Chart = CHART_COMPONENTS[chart.component]

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

      {rows.length > 0 && Chart ? (
        <>
          <Chart chart={chart} rows={rows} measure={measure} />
          <ChartSnippet snippet={chart.snippet} caveat={chart.caveat} />
          <ChartDataTable chart={chart} rows={rows} />
        </>
      ) : (
        <>
          <p className="chart-view-empty">{strings.dashboardNoData}</p>
          <ChartSnippet snippet={chart.snippet} caveat={chart.caveat} />
        </>
      )}
    </section>
  )
}

export default ChartView
