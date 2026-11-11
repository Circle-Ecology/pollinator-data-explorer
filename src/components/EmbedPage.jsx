
import { useCallback, useRef, useState } from 'react'
import './EmbedPage.css'
import DashboardPanel from './DashboardPanel'
import MapView from './MapView'
import ObservationExplorer from './ObservationExplorer'

// The embed is a scrollable dashboard page, not a map-only viewport: the map is
// a bounded section at the top (see MapView), and the data-visualization
// dashboard (US-29, DashboardPanel) below it is reachable by scrolling past
// the map.
// Capped to a centered max-width rather than full browser width, so it reads
// as a dashboard column instead of a full-bleed map on wide screens.

function EmbedPage() {
  const [selectedSite, setSelectedSite] = useState(null)
  const [markerSelectionCount, setMarkerSelectionCount] = useState(0)

  const selectedMarkerRef = useRef(null)
  const selectedSiteRef = useRef(null)
  const mapContainerRef = useRef(null)

  const handleSelectSite = (site, markerElement) => {
    selectedMarkerRef.current = markerElement
    selectedSiteRef.current = site

    setSelectedSite(site)
    setMarkerSelectionCount((count) => count + 1)
  }

  // Stable identity: ObservationExplorer re-subscribes its Escape listener
  // whenever this changes.
  const handleCloseDetails = useCallback(() => {
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
  }, [])

  return (
    <div
      className="embed-page"
      data-testid="explorer-map"
      ref={mapContainerRef}
    >
      <MapView onSelectSite={handleSelectSite} />

      <ObservationExplorer
        site={selectedSite}
        markerSelectionCount={markerSelectionCount}
        onCloseDetails={handleCloseDetails}
      />

      <DashboardPanel />
    </div>
  )
}

export default EmbedPage
