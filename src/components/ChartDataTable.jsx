import { strings } from '../content/strings'

// Accessible alternative to the chart: every bar's count and percentage.
function ChartDataTable({ chart, rows }) {
  return (
    <details className="chart-data-table">
      <summary>{strings.dashboardTableToggle}</summary>

      <table>
        <caption>{chart.title}</caption>
        <thead>
          <tr>
            <th scope="col">{chart.categoryLabel}</th>
            {chart.series.map((series) => (
              <th key={series.key} scope="col">
                {series.label}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row">{row.category}</th>
              {chart.series.map((series) => (
                <td key={series.key}>
                  {row.counts[series.key].toLocaleString()} (
                  {row.percents[series.key]}%)
                </td>
              ))}
              <td>{row.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export default ChartDataTable
