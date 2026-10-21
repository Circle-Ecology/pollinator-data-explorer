
function ObservationDetailField({ label, value }) {
  const displayValue =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
      ? 'Not recorded'
      : String(value)

  return (
    <p>
      <strong>{label}:</strong> {displayValue}
    </p>
  )
}

export default ObservationDetailField
