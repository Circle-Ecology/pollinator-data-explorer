
import { strings } from '../content/strings'
import {
  buildChartRows,
  getChartYears,
  getVisibleSeries,
} from '../utils/buildChartRows'
import {
  buildGenusRows,
  buildTypeGenusRows,
  buildMultiGenusRows,
} from '../utils/genusChartRows'

import ChartDataTable from './ChartDataTable'
import GenusChartDataTable from './GenusChartDataTable'
import ChartSnippet from './ChartSnippet'
import MeasureToggle from './MeasureToggle'
import StackedBarChart from './StackedBarChart'
import HorizontalBarChart from './HorizontalBarChart'
import TypeGenusBarChart from './TypeGenusBarChart'
import MultiGenusBarChart from './MultiGenusBarChart'
import YearToggle from './YearToggle'

// Chart types supported by the dashboard.
const CHART_COMPONENTS = {
  stackedBar: StackedBarChart,
  horizontalBar: HorizontalBarChart,
  typeGenusBar: TypeGenusBarChart,
  multiGenusBar: MultiGenusBarChart,
}

// US-32: Genus-specific data preparation.
const GENUS_ROW_BUILDERS = {
  'occupants-by-type-genus': buildTypeGenusRows,
  'occupants-by-genus': buildGenusRows,
  'multi-genus-cavities-by-site': buildMultiGenusRows,
}

function ChartView({ chart, data, year, measure, onChangeYear, onChangeMeasure }) {
  const chartData = data.charts[chart.id]
  const years = getChartYears(chartData, data.years)

  // US-32: Use the appropriate row builder for Genus charts.
  const genusRowBuilder = GENUS_ROW_BUILDERS[chart.id]
  const isGenusChart = Boolean(genusRowBuilder)

  const rows = isGenusChart
    ? genusRowBuilder(chartData?.[year] ?? [])
    : buildChartRows(chart, chartData, { years: data.years, year })

  // PR #73: Show only series relevant to the selected year.
  const yearsInView = chart.supportsYears ? [year] : years
  const visibleChart = isGenusChart
    ? chart
    : {
        ...chart,
        series: getVisibleSeries(chart, yearsInView),
      }

  const Chart = CHART_COMPONENTS[chart.component]
  const DataTable = isGenusChart ? GenusChartDataTable : ChartDataTable

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
          <Chart chart={visibleChart} rows={rows} measure={measure} />
          <ChartSnippet snippet={chart.snippet} caveat={chart.caveat} />
          <DataTable chart={visibleChart} rows={rows} />
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
