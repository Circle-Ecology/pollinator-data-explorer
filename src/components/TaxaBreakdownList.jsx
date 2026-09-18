function TaxaBreakdownList({ taxaCounts = [] }) {
  if (taxaCounts.length === 0) {
    return <p>No identified occupants recorded.</p>
  }

  return (
    <div>
      <h3>Top taxa</h3>

      <ul>
        {taxaCounts.map((taxon, index) => {
          const label =
            taxon.commonName || taxon.nesterFamily || 'Not recorded'

          return (
            <li key={`${label}-${index}`}>
              {label}: {taxon.count}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TaxaBreakdownList