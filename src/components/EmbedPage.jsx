import MapView from './MapView'

// The embed is a scrollable dashboard page, not a map-only viewport: the map is
// a bounded section at the top (see MapView), and the data-visualization
// dashboard section below it is reachable by scrolling past the map. That
// section has no ticket/design yet, so only its placement is reserved here.
function EmbedPage() {
  return (
    <div data-testid="explorer-map">
      <MapView />
      {/* Data visualization dashboard mounts here, below the map, once that story lands */}
    </div>
  )
}

export default EmbedPage
