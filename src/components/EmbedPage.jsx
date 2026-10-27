
import { useEffect, useRef, useState } from 'react'
import MapView from './MapView'
import ObservationExplorer from './ObservationExplorer'
import { getPublicObservations } from '../api/getPublicObservations'

function EmbedPage() {
  const [selectedSite, setSelectedSite] = useState(null)
  const [observations, setObservations] = useState([])
  const [observationsError, setObservationsError] = useState(false)
  const selectedMarkerRef = useRef(null)

  useEffect(() => {
    let active = true

    getPublicObservations()
      .then((data) => {
        if (active) setObservations(data)
      })
      .catch(() => {
        if (active) setObservationsError(true)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSelectSite = (site, markerElement) => {
    selectedMarkerRef.current = markerElement
    setSelectedSite(site)
  }

  const handleCloseDetails = () => {
    selectedMarkerRef.current?.focus?.()
  }

  return (
    <div data-testid="explorer-map">
      <MapView onSelectSite={handleSelectSite} />

      {observationsError && (
        <p role="status">
          Observation details are temporarily unavailable.
        </p>
      )}

      {!observationsError && (
        <ObservationExplorer
          site={selectedSite}
          observations={observations}
          onCloseDetails={handleCloseDetails}
        />
      )}
    </div>
  )
}

export default EmbedPage
