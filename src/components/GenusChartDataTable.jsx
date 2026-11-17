
import { strings } from '../content/strings'

function GenusChartDataTable({ chart, rows }) {
  const isTypeGenus = chart.id === 'occupants-by-type-genus'
  const isMultiGenus = chart.id === 'multi-genus-cavities-by-site'

  return (
    <details className="chart-data-table">
      <summary>{strings.dashboardTableToggle}</summary>

      <table>
        <caption>{chart.title}</caption>

        <thead>
          <tr>
            {isTypeGenus && (
              <th scope="col">Occupant Type</th>
            )}

            <th scope="col">
              {isMultiGenus ? 'Site' : 'General ID'}
            </th>

            <th scope="col">
              {isMultiGenus ? 'Multi-genus Cavities' : 'Count'}
            </th>

            {!isMultiGenus && (
              <th scope="col">Percentage</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.occupantType || ''}-${row.category}-${index}`}>
              {isTypeGenus && (
                <td>{row.occupantType}</td>
              )}

              <th scope="row">{row.category}</th>

              <td>{row.total.toLocaleString()}</td>

              {!isMultiGenus && (
                <td>{row.percent}%</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export default GenusChartDataTable
