
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
// don't get its built-in keyboard handling.
const keyDownHandlersByElement = new WeakMap()

function openPopupOnActivate(layer, site, onSelectSite) {
  return (domEvent) => {
    if (domEvent.key === 'Enter' || domEvent.key === ' ') {
      domEvent.preventDefault()
      layer.openPopup()
      onSelectSite?.(site, layer.getElement?.())
    }
  }
}

function markAccessible(event, site, onSelectSite) {
  const layer = event.target
  const element = layer.getElement?.()

  if (element) {
    element.setAttribute('role', 'button')
    element.setAttribute('aria-label', site.propertyName)
    element.setAttribute('tabindex', '0')

    const handleKeyDown = openPopupOnActivate(layer, site, onSelectSite)
    keyDownHandlersByElement.set(element, handleKeyDown)
    element.addEventListener('keydown', handleKeyDown)
  }
}

function unmarkAccessible(event) {
  const element = event.target.getElement?.()
  const handleKeyDown = element && keyDownHandlersByElement.get(element)

  if (handleKeyDown) {
    element.removeEventListener('keydown', handleKeyDown)
    keyDownHandlersByElement.delete(element)
  }
}

function SiteMarker({ site, allCounts, trueToScale, onSelectSite }) {
  const eventHandlers = {
    add: (event) => markAccessible(event, site, onSelectSite),
    remove: unmarkAccessible,
    click: (event) => {
      onSelectSite?.(site, event.target.getElement?.())
    },
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
