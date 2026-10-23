import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { computeMarkerRadiusMeters, computeMarkerSizePx } from '../utils/markerSize'

// Circle Ecology Dark Green.
const PATH_OPTIONS = {
  color: '#577253',
  fillColor: '#577253',
  fillOpacity: 0.45,
  weight: 2,
}

// Circle/CircleMarker are SVG path layers, not Leaflet's Marker class, so they
// don't get its built-in keyboard handling (Enter opening the popup) - that
// only exists on Marker. tabindex/role make the element focusable, but Enter
// does nothing without this listener, wired up and torn down alongside it.
const keyDownHandlersByElement = new WeakMap()

function openPopupOnActivate(layer) {
  return (domEvent) => {
    if (domEvent.key === 'Enter' || domEvent.key === ' ') {
      domEvent.preventDefault()
      layer.openPopup()
    }
  }
}

function markAccessible(event, propertyName) {
  const layer = event.target
  const element = layer.getElement?.()
  if (element) {
    element.setAttribute('role', 'button')
    element.setAttribute('aria-label', propertyName)
    // Don't rely on Leaflet's own keyboard-option default; guarantee it.
    element.setAttribute('tabindex', '0')
    const handleKeyDown = openPopupOnActivate(layer)
    keyDownHandlersByElement.set(element, handleKeyDown)
    element.addEventListener('keydown', handleKeyDown)
  }
}

function unmarkAccessible(event) {
  const element = event.target.getElement?.()
  const handleKeyDown = element && keyDownHandlersByElement.get(element)
  if (handleKeyDown) element.removeEventListener('keydown', handleKeyDown)
}

function SiteMarker({ site, allCounts, trueToScale }) {
  const eventHandlers = {
    add: (event) => markAccessible(event, site.propertyName),
    remove: unmarkAccessible,
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
