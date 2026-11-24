import { useEffect, useRef } from 'react'
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
// US-41: `isFocused` marks the site the map is zoomed in on. Zooming in past
// ZOOM_SWITCH_THRESHOLD swaps the dot for a true-to-scale circle, a new layer
// whose popup starts closed, so the focused site's popup is reopened on it,
// one tick later: opened any sooner, react-leaflet's layer swap closes it again.
function SiteMarker({ site, allPercents, trueToScale, isFocused = false, onSelectSite }) {
  const percent = occupiedHolesPercent(site) ?? 0
  const layerRef = useRef(null)

  useEffect(() => {
    if (!isFocused) return undefined
    // After react-leaflet has finished swapping layers and binding the popup.
    const timer = setTimeout(() => layerRef.current?.openPopup(), 0)
    return () => clearTimeout(timer)
  }, [isFocused, trueToScale])

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
        ref={layerRef}
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
      ref={layerRef}
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
