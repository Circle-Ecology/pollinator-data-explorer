import { useEffect, useState } from 'react'
import ObservationSelector from './ObservationSelector'
import ObservationDetailsPanel from './ObservationDetailsPanel'
import { getObservationId } from '../utils/getObservationId'

function ObservationExplorer({
  site,
  observations = [],
  markerSelectionCount = 0,
  onCloseDetails,
}) {
  const [selectedObservationId, setSelectedObservationId] =
    useState(undefined)

  useEffect(() => {
    setSelectedObservationId(undefined)
  }, [markerSelectionCount])

  const siteObservations = site
    ? observations.filter(
        (observation) => observation.siteId === site.siteId
      )
    : []

  const activeObservationId =
    selectedObservationId === undefined
      ? siteObservations.length > 0
        ? getObservationId(siteObservations[0], 0)
        : null
      : selectedObservationId

  const selectedObservation =
    siteObservations.find(
      (observation, index) =>
        getObservationId(observation, index) === activeObservationId
    ) ?? null

  const handleSelectObservation = (observationId) => {
    setSelectedObservationId(observationId)
  }

  const handleClose = () => {
    setSelectedObservationId(null)
    onCloseDetails?.()
  }

  return (
    <div className="observation-explorer">
      <ObservationSelector
        site={site}
        observations={observations}
        selectedObservationId={activeObservationId}
        onSelectObservation={handleSelectObservation}
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