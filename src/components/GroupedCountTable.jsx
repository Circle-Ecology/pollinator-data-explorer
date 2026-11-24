import { strings } from '../content/strings'

// US-34: accessible alternative to a grouped count chart: one row per group
// of bars (e.g. nest status) with a column per series, then any summary rows
// from chart.summaryRows (e.g. sealed nests and Parasitism %), which have a
// `unit` shown after each value.
function GroupedCountTable({ chart, rows, summary = [] }) {
  const summaryText = (value, unit = '') =>
    value === null ? strings.dashboardNotRecorded : `${value.toLocaleString()}${unit}`

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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row">{row.category}</th>
              {chart.series.map((series) => (
                <td key={series.key}>
                  {row.values[series.key].count.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
          {summary.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {chart.series.map((series) => (
                <td key={series.key}>
                  {summaryText(row.values[series.key], row.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export default GroupedCountTable
