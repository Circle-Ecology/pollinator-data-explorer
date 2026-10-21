
import ObservationDetailField from './ObservationDetailField'
import './ObservationDetailsPanel.css'

const PUBLIC_FIELDS = [
  { label: 'Site ID', key: 'siteId' },
  { label: 'Tunnel ID', key: 'tunnelId' },
  { label: 'Survey date', key: 'surveyDate' },
  { label: 'Observation status', key: 'observationStatus' },
  { label: 'Occupant type', key: 'occupantType' },
  { label: 'Nester family', key: 'nesterFamily' },
  { label: 'General ID', key: 'generalId' },
  { label: 'Common name', key: 'commonName' },
  { label: 'Plug depth', key: 'plugDepth' },
  { label: 'Plug composition', key: 'plugComposition' },
  { label: 'Plug color', key: 'plugColor' },
  { label: 'Plug confidence', key: 'plugConfidence' },
  { label: 'Whole or hole', key: 'wholeOrHole' },
  { label: 'Emergence year', key: 'emergenceYear' },
  { label: 'Manufactured empty', key: 'manufacturedEmpty' },
  { label: 'Record status', key: 'recordStatus' },
]

function ObservationDetailsPanel({ observation }) {
  if (!observation) {
    return null
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label="Observation details"
      className="observation-details-panel"
    >
      <h2>Observation Details</h2>

      {PUBLIC_FIELDS.map(({ label, key }) => (
        <ObservationDetailField
          key={key}
          label={label}
          value={observation[key]}
        />
      ))}
    </section>
  )
}

export default ObservationDetailsPanel
