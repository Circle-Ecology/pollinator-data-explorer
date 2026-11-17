import { strings } from '../content/strings'

// US-33: accessible alternative to a sealed nest rate chart. Each cell shows
// the numerator and denominator behind the rate, e.g. "430 of 1,338 (32%)".
function RateDataTable({ chart, rows }) {
  return (
    <details className="chart-data-table">
      <summary>{strings.dashboardTableToggle}</summary>

      <table>
        <caption>{chart.title}</caption>
        <thead>
          <tr>
            <th scope="col">{chart.categoryLabel}</th>
            <th scope="col">{strings.dashboardAvailableCavities}</th>
            {chart.series.map((series) => (
              <th key={series.key} scope="col">
                {series.label} {strings.dashboardSealedNests}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row">{row.category}</th>
              <td>{row.available.toLocaleString()}</td>
              {chart.series.map((series) => {
                const { sealed, rate } = row.values[series.key]
                return (
                  <td key={series.key}>
                    {`${sealed.toLocaleString()} of ${row.available.toLocaleString()} (${rate}%)`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export default RateDataTable
