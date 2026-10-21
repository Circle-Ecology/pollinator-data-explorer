
import ObservationDetailField from './ObservationDetailField'
import './ObservationDetailsPanel.css'

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

      <ObservationDetailField
        label="Site ID"
        value={observation.siteId}
      />

      <ObservationDetailField
        label="Tunnel ID"
        value={observation.tunnelId}
      />

      <ObservationDetailField
        label="Survey date"
        value={observation.surveyDate}
      />

      <ObservationDetailField
        label="Observation status"
        value={observation.observationStatus}
      />

      <ObservationDetailField
        label="Occupant type"
        value={observation.occupantType}
      />

      <ObservationDetailField
        label="Nester family"
        value={observation.nesterFamily}
      />

      <ObservationDetailField
        label="General ID"
        value={observation.generalId}
      />

      <ObservationDetailField
        label="Common name"
        value={observation.commonName}
      />

      <ObservationDetailField
        label="Plug depth"
        value={observation.plugDepth}
      />

      <ObservationDetailField
        label="Plug composition"
        value={observation.plugComposition}
      />

      <ObservationDetailField
        label="Plug color"
        value={observation.plugColor}
      />

      <ObservationDetailField
        label="Plug confidence"
        value={observation.plugConfidence}
      />

      <ObservationDetailField
        label="Whole or hole"
        value={observation.wholeOrHole}
      />

      <ObservationDetailField
        label="Emergence year"
        value={observation.emergenceYear}
      />

      <ObservationDetailField
        label="Manufactured empty"
        value={observation.manufacturedEmpty}
      />

      <ObservationDetailField
        label="Record status"
        value={observation.recordStatus}
      />
    </section>
  )
}

export default ObservationDetailsPanel
