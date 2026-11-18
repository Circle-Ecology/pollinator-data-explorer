import { strings } from '../content/strings'

// Accessible alternative to the chart: every bar's count, plus its share
// when the chart offers a percentage view. Faceted charts (chart.facetLabel)
// get a leading column naming each row's panel.
function ChartDataTable({ chart, rows }) {
  const showPercent = chart.measures.includes('percent')
  const cellText = (row, key) => {
    const count = row.counts[key]
    if (count === null) return strings.dashboardNotRecorded
    return showPercent
      ? `${count.toLocaleString()} (${row.percents[key]}%)`
      : count.toLocaleString()
  }

  return (
    <details className="chart-data-table">
      <summary>{strings.dashboardTableToggle}</summary>

      <table>
        <caption>{chart.title}</caption>
        <thead>
          <tr>
            {chart.facetLabel && <th scope="col">{chart.facetLabel}</th>}
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
            <tr key={`${row.facet ?? ''}|${row.category}`}>
              {chart.facetLabel && (
                <td>
                  {row.facet}
                  {chart.facetUnit ?? ''}
                </td>
              )}
              <th scope="row">{row.category}</th>
              {chart.series.map((series) => (
                <td key={series.key}>{cellText(row, series.key)}</td>
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
