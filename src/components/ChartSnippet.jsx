import { strings } from '../content/strings'

// Plain-language explanation under a chart, plus an optional data note.
function ChartSnippet({ snippet, caveat }) {
  return (
    <div className="chart-snippet">
      <p>
        <strong>{strings.dashboardSnippetLabel}:</strong> {snippet}
      </p>

      {caveat && (
        <p className="chart-caveat" role="note">
          <strong>{strings.dashboardCaveatLabel}:</strong> {caveat}
        </p>
      )}
    </div>
  )
}

export default ChartSnippet
