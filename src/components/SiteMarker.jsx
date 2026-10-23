import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { computeMarkerRadiusMeters, computeMarkerSizePx } from '../utils/markerSize'

// Circle Ecology Dark Green.
const PATH_OPTIONS = {
  color: '#577253',
  fillColor: '#577253',
  fillOpacity: 0.45,
  weight: 2,
}

function markAccessible(event, propertyName) {
  const element = event.target.getElement?.()
  if (element) {
    element.setAttribute('role', 'button')
    element.setAttribute('aria-label', propertyName)
    // Don't rely on Leaflet's own keyboard-option default; guarantee it.
    element.setAttribute('tabindex', '0')
  }
}

function SiteMarker({ site, allCounts, trueToScale }) {
  const eventHandlers = {
    add: (event) => markAccessible(event, site.propertyName),
  }

  const popup = (
    <Popup>
      <strong>{site.propertyName}</strong>
      <br />
      {site.occupiedTunnelCount} occupied tunnel
      {site.occupiedTunnelCount === 1 ? '' : 's'}
    </Popup>
  )

  if (trueToScale) {
    return (
      <Circle
        center={[site.latitude, site.longitude]}
        radius={computeMarkerRadiusMeters(site.occupiedTunnelCount, allCounts)}
        pathOptions={PATH_OPTIONS}
        eventHandlers={eventHandlers}
      >
        {popup}
      </Circle>
    )
  }

  return (
    <CircleMarker
      center={[site.latitude, site.longitude]}
      radius={computeMarkerSizePx(site.occupiedTunnelCount, allCounts)}
      pathOptions={PATH_OPTIONS}
      eventHandlers={eventHandlers}
    >
      {popup}
    </CircleMarker>
  )
}

export default SiteMarker
