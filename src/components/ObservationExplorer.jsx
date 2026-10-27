
import { useState } from 'react'
import ObservationSelector from './ObservationSelector'
import ObservationDetailsPanel from './ObservationDetailsPanel'

function getObservationId(observation) {
  return `${observation.tunnelId}:${observation.surveyDate}`
}

function ObservationExplorer({
  site,
  observations = [],
  onCloseDetails,
}) {
  const [selectedObservationId, setSelectedObservationId] = useState(null)

  const selectedObservation = site
    ? observations.find(
        (observation) =>
          observation.siteId === site.siteId &&
          getObservationId(observation) === selectedObservationId
      )
    : null

  const handleClose = () => {
    setSelectedObservationId(null)
    onCloseDetails?.()
  }

  return (
    <div className="observation-explorer">
      <ObservationSelector
        site={site}
        observations={observations}
        selectedObservationId={selectedObservationId}
        onSelectObservation={setSelectedObservationId}
      />

      <ObservationDetailsPanel
        observation={selectedObservation}
        site={site}
        onClose={handleClose}
      />
    </div>
  )
}

export default ObservationExplorer
