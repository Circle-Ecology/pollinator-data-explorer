
import { useEffect, useRef, useState } from 'react'
import './EmbedPage.css'
import MapView from './MapView'
import ObservationExplorer from './ObservationExplorer'
import { getPublicObservations } from '../api/getPublicObservations'

// The embed is a scrollable dashboard page, not a map-only viewport: the map is
// a bounded section at the top (see MapView), and the data-visualization
// dashboard section below it is reachable by scrolling past the map. That
// section has no ticket/design yet, so only its placement is reserved here.
// Capped to a centered max-width rather than full browser width, so it reads
// as a dashboard column instead of a full-bleed map on wide screens.

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
    <div
      className="embed-page"
      data-testid="explorer-map"
      ref={mapContainerRef}
    >
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

      {/* Data visualization dashboard mounts here, below the map, once that story lands */}
    </div>
  )
}

export default EmbedPage
