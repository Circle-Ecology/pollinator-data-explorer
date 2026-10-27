
import { useEffect, useRef, useState } from 'react'
import MapView from './MapView'
import ObservationExplorer from './ObservationExplorer'
import { getPublicObservations } from '../api/getPublicObservations'

function EmbedPage() {
  const [selectedSite, setSelectedSite] = useState(null)
  const [markerSelectionCount, setMarkerSelectionCount] = useState(0)
  const [observations, setObservations] = useState([])
  const [observationsError, setObservationsError] = useState(false)

  const selectedMarkerRef = useRef(null)
  const selectedSiteRef = useRef(null)
  const mapContainerRef = useRef(null)

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
    selectedSiteRef.current = site

    setSelectedSite(site)
    setMarkerSelectionCount((count) => count + 1)
  }

  const handleCloseDetails = () => {
    const previousMarker = selectedMarkerRef.current

    if (
      previousMarker?.isConnected &&
      typeof previousMarker.focus === 'function'
    ) {
      previousMarker.focus()
      return
    }

    const siteName = selectedSiteRef.current?.propertyName
    const container = mapContainerRef.current

    if (!siteName || !container) return

    const markers = container.querySelectorAll(
      '[role="button"][aria-label]'
    )

    const replacementMarker = Array.from(markers).find(
      (marker) => marker.getAttribute('aria-label') === siteName
    )

    if (replacementMarker) {
      replacementMarker.focus()
      selectedMarkerRef.current = replacementMarker
    }
  }

  return (
    <div data-testid="explorer-map" ref={mapContainerRef}>
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
          markerSelectionCount={markerSelectionCount}
          onCloseDetails={handleCloseDetails}
        />
      )}
    </div>
  )
}

export default EmbedPage
