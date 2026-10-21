
function ObservationDetailField({ label, value }) {
  const isMissing =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    (Array.isArray(value) && value.length === 0)

  let displayValue = 'Not recorded'

  if (!isMissing) {
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No'
    } else if (Array.isArray(value)) {
      displayValue = value.join(', ')
    } else {
      displayValue = String(value)
    }
  }

  return (
    <p>
      <strong>{label}:</strong> {displayValue}
    </p>
  )
}

export default ObservationDetailField
