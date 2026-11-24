import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { occupiedHolesPercent } from '../utils/formatOccupancyRate'
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

// US-39: sized by the share of the site's holes that were occupied, since
// sites have different numbers of holes. A site without the figures gets the
// smallest marker.
function SiteMarker({ site, allPercents, trueToScale, onSelectSite }) {
  const percent = occupiedHolesPercent(site) ?? 0

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
      {occupiedHolesPercent(site) === null
        ? 'Occupied holes not recorded'
        : `${occupiedHolesPercent(site)}% of holes occupied (${site.occupiedTunnelCount} of ${site.tunnelCount})`}
    </Popup>
  )

  if (trueToScale) {
    return (
      <Circle
        center={[site.latitude, site.longitude]}
        radius={computeMarkerRadiusMeters(percent, allPercents)}
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
      radius={computeMarkerSizePx(percent, allPercents)}
      pathOptions={PATH_OPTIONS}
      eventHandlers={eventHandlers}
    >
      {popup}
    </CircleMarker>
  )
}

export default SiteMarker
