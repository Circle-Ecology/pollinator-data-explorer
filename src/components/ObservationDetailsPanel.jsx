
import { useEffect, useId } from 'react'
import { formatObservationDate } from '../utils/formatSurveyDate'
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

      {site && (
        <>
          <ObservationDetailField
            label="Site name"
            value={site.propertyName}
          />

          <ObservationDetailField
            label="City"
            value={site.city}
          />

          <ObservationDetailField
            label="State"
            value={site.state}
          />

          <ObservationDetailField
            label="Latitude"
            value={site.latitude}
          />

          <ObservationDetailField
            label="Longitude"
            value={site.longitude}
          />
        </>
      )}

      {PUBLIC_FIELDS.map(({ label, key }) => (
        <ObservationDetailField
          key={key}
          label={label}
          value={
            key === 'surveyDate'
              ? formatObservationDate(observation[key])
              : observation[key]
          }
        />
      ))}
    </section>
  )
}

export default ObservationDetailsPanel
