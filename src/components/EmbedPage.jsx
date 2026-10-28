import './EmbedPage.css'
import MapView from './MapView'

// The embed is a scrollable dashboard page, not a map-only viewport: the map is
// a bounded section at the top (see MapView), and the data-visualization
// dashboard section below it is reachable by scrolling past the map. That
// section has no ticket/design yet, so only its placement is reserved here.
// Capped to a centered max-width rather than full browser width, so it reads
// as a dashboard column instead of a full-bleed map on wide screens.
function EmbedPage() {
  return (
    <div className="embed-page" data-testid="explorer-map">
      <MapView />
      {/* Data visualization dashboard mounts here, below the map, once that story lands */}
    </div>
  )
}

export default EmbedPage
