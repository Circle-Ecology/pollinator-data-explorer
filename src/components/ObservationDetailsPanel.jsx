
import { useEffect, useId } from 'react'
import { formatObservationDate } from '../utils/formatSurveyDate'
import ObservationDetailField from './ObservationDetailField'
import './ObservationDetailsPanel.css'

const PUBLIC_FIELDS = [
  { label: 'Site ID', key: 'siteId' },
  { label: 'Tunnel ID', key: 'tunnelId' },
  { label: 'Observation status', key: 'observationStatus' },
  { label: 'Occupant type', key: 'occupantType' },
  { label: 'Nester family', key: 'nesterFamily' },
  { label: 'General ID', key: 'generalId' },
  { label: 'Plug depth', key: 'plugDepth' },
  { label: 'Plug composition', key: 'plugComposition' },
  { label: 'Plug color', key: 'plugColor' },
  { label: 'Plug confidence', key: 'plugConfidence' },
  { label: 'Whole or hole', key: 'wholeOrHole' },
  { label: 'Emergence year', key: 'emergenceYear' },
  { label: 'Manufactured empty', key: 'manufacturedEmpty' },
  { label: 'Record status', key: 'recordStatus' },
]

function ObservationDetailsPanel({
  observation,
  site,
  onClose,
}) {
  const headingId = useId()

  useEffect(() => {
    if (!observation || typeof onClose !== 'function') {
      return
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [observation, onClose])

  if (!observation) {
    return null
  }

  const speciesCommonName =
    observation.speciesCommonName ??
    observation.commonName ??
    'Not recorded'

  const speciesScientificName =
    observation.speciesScientificName ??
    'Not recorded'

  const observationDate =
    observation.observationDate ??
    observation.surveyDate

  const siteName =
    site?.propertyName ??
    observation.siteName ??
    'Not recorded'

  const latitude =
    site?.latitude ??
    observation.latitude ??
    'Not recorded'

  const longitude =
    site?.longitude ??
    observation.longitude ??
    'Not recorded'

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="observation-details-panel"
    >
      <div className="observation-details-panel-header">
        <h2 id={headingId}>Observation Details</h2>

        {typeof onClose === 'function' && (
          <button
            type="button"
            className="observation-details-panel-close"
            onClick={onClose}
            aria-label="Close observation details"
          >
            Close
          </button>
        )}
      </div>

      <ObservationDetailField
        label="Species common name"
        value={speciesCommonName}
      />

      <ObservationDetailField
        label="Species scientific name"
        value={speciesScientificName}
      />

      <ObservationDetailField
        label="Observation date"
        value={
          observationDate
            ? formatObservationDate(observationDate)
            : 'Not recorded'
        }
      />

      <ObservationDetailField
        label="Site name"
        value={siteName}
      />

      <ObservationDetailField
        label="Latitude"
        value={latitude}
      />

      <ObservationDetailField
        label="Longitude"
        value={longitude}
      />

      {site && (
        <>
          <ObservationDetailField
            label="City"
            value={site.city}
          />

          <ObservationDetailField
            label="State"
            value={site.state}
          />
        </>
      )}

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
