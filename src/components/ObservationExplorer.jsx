
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
  const [selection, setSelection] = useState(null)

  useEffect(() => {
    setSelection(null)
  }, [markerSelectionCount])

  const siteObservations = site
    ? observations.filter(
        (observation) => observation.siteId === site.siteId
      )
    : []

  const isCurrentSite =
    selection !== null &&
    site !== null &&
    selection.siteId === site.siteId

  const selectedObservationId = isCurrentSite
    ? selection.observationId
    : null

  const activeObservationId =
    isCurrentSite && selection.closed
      ? null
      : selectedObservationId ??
        (siteObservations.length > 0
          ? getObservationId(siteObservations[0], 0)
          : null)

  const selectedObservation =
    siteObservations.find(
      (observation, index) =>
        getObservationId(observation, index) === activeObservationId
    ) ?? null

  const handleSelectObservation = (observationId) => {
    if (!site) return

    setSelection({
      siteId: site.siteId,
      observationId,
      closed: false,
    })
  }

  const handleClose = () => {
    if (!site) return

    setSelection({
      siteId: site.siteId,
      observationId: null,
      closed: true,
    })

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
