
import { formatSurveyDate } from '../utils/formatSurveyDate'
import { getObservationId } from '../utils/getObservationId'

function ObservationSelector({
  site,
  observations = [],
  selectedObservationId,
  onSelectObservation,
}) {
  if (!site) {
    return null
  }

  const siteObservations = observations.filter(
    (observation) => observation.siteId === site.siteId
  )

  return (
    <section
      className="observation-selector"
      aria-label="Select an observation"
    >
      <h2>Observations at {site.propertyName}</h2>

      {siteObservations.length === 0 ? (
        <p>No observations available for this site.</p>
      ) : (
        <ul>
          {siteObservations.map((observation, index) => {
            const observationId = getObservationId(
              observation,
              index
            )

            return (
              <li key={observationId}>
                <button
                  type="button"
                  aria-pressed={
                    selectedObservationId === observationId
                  }
                  onClick={() =>
                    onSelectObservation?.(observationId)
                  }
                >
                  {observation.commonName || 'Not recorded'}
                  {' — '}
                  {formatSurveyDate(observation.surveyDate)}
                  {' — '}
                  Tunnel {observation.tunnelId}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ObservationSelector
