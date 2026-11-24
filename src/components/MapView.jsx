import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'
import { getPublicSites } from '../api/getPublicSites'
import { DEFAULT_CENTER, DEFAULT_ZOOM, computeMapBounds } from '../utils/mapBounds'
import SiteMarker from './SiteMarker'
import MapLoadingState from './MapLoadingState'
import MapEmptyState from './MapEmptyState'
import MapErrorState from './MapErrorState'
import MapAttribution from './MapAttribution'
import MapLegend from './MapLegend'
import { occupiedHolesPercent } from '../utils/formatOccupancyRate'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// Below this zoom, meter-accurate circles shrink to near-invisible dots, so we
// switch to fixed-pixel markers for visibility; at/above it, circles are large
// enough on screen that true-to-scale (meter) sizing is more useful.
const ZOOM_SWITCH_THRESHOLD = 13

function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend: (event) => onZoomChange(event.target.getZoom()),
  })
  return null
}

// react-leaflet only reads MapContainer's center/zoom/bounds props on first
// mount - it never re-applies them when they change later. MapContainer is
// mounted immediately (during loading, before real sites exist), so without
// this the map would stay on the loading-time default forever once data
// arrives. Keyed on a content-stable string, not the viewport object itself,
// so this only re-fits when the computed viewport actually changes - not on
// every render (e.g. from ZoomWatcher's own zoom-state updates), which would
// otherwise fight the visitor's own pan/zoom.
function ViewportFitter({ viewport }) {
  const map = useMap()
  const viewportKey = JSON.stringify(viewport)

  useEffect(() => {
    if (viewport.bounds) {
      map.fitBounds(viewport.bounds, viewport.boundsOptions)
    } else if (viewport.center) {
      map.setView(viewport.center, viewport.zoom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- viewportKey is viewport's content, deliberately not viewport itself.
  }, [map, viewportKey])

  return null
}

// Zoom used when a site is selected: close enough to see the site's own
// markers, with some of the surrounding open space for context.
export const SITE_FOCUS_ZOOM = 16

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// US-41: zoom in on the selected site, and back out to the default view (every
// site in frame) when it is cleared. `focusKey` changes on every selection, so
// selecting the same site again after panning away zooms back in.
//
// Reports a popup closed by its × (or by clicking the map) through
// onPopupDismissed. Leaflet keeps one popup open, so two other closes are
// ignored: clicking another marker (its popup opens right after the old one
// closes, cancelling the pending dismiss), and zooming past
// ZOOM_SWITCH_THRESHOLD, where the focused marker's new layer opens its popup
// first and the old layer's popup closes after it (not the open popup).
function SiteFocus({ site, focusKey, viewport, onPopupDismissed }) {
  const map = useMap()
  const wasFocused = useRef(false)
  const pendingDismiss = useRef(null)
  const openPopup = useRef(null)

  useMapEvents({
    popupopen: (event) => {
      openPopup.current = event?.popup
      clearTimeout(pendingDismiss.current)
    },
    popupclose: (event) => {
      if (event?.popup !== openPopup.current) return
      clearTimeout(pendingDismiss.current)
      pendingDismiss.current = setTimeout(() => onPopupDismissed?.(), 0)
    },
  })

  useEffect(() => () => clearTimeout(pendingDismiss.current), [])

  useEffect(() => {
    const animate = !prefersReducedMotion()

    if (site) {
      wasFocused.current = true
      map.flyTo([site.latitude, site.longitude], SITE_FOCUS_ZOOM, { animate, duration: 0.8 })
      return
    }

    if (!wasFocused.current) return
    wasFocused.current = false
    map.closePopup()
    if (viewport.bounds) {
      map.flyToBounds(viewport.bounds, { ...viewport.boundsOptions, animate, duration: 0.8 })
    } else if (viewport.center) {
      map.flyTo(viewport.center, viewport.zoom, { animate, duration: 0.8 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per selection, not per viewport object.
  }, [map, site, focusKey])

  return null
}

// US-15: onSelectSite is optional, preserving existing MapView usage.
// US-41: focusedSite/focusKey zoom the map to a selected site; clearing
// focusedSite zooms back out. onPopupDismissed reports the popup's ×.
function MapView({
  loadSites = getPublicSites,
  onSelectSite,
  focusedSite = null,
  focusKey = 0,
  onPopupDismissed,
}) {
  const [state, setState] = useState({ status: 'loading' })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  const load = useCallback(() => {
    setState({ status: 'loading' })
    loadSites()
      .then((sites) => setState({ status: 'ready', sites }))
      .catch(() => setState({ status: 'error' }))
  }, [loadSites])

  useEffect(() => {
    load()
  }, [load])

  const rawSites = state.status === 'ready' ? state.sites : []

  // Defense in depth: the map never places a marker at a fallback/zero
  // coordinate, regardless of whether the data source already filtered.
  const sites = rawSites.filter(
    (site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude),
  )

  const viewport = computeMapBounds(sites) ?? {
    center: [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude],
    zoom: DEFAULT_ZOOM,
  }

  // US-39: markers and the legend use each site's occupied share of its holes.
  const allPercents = sites.map(occupiedHolesPercent).filter((percent) => percent !== null)
  const trueToScale = zoom >= ZOOM_SWITCH_THRESHOLD

  return (
    // The embed page is a scrollable dashboard, not a map-only viewport - this
    // is its bounded top section, not the whole page, so the dashboard content
    // below (see EmbedPage) is reachable by scrolling rather than hidden behind it.
    <div
      className="site-map"
      data-testid="site-map"
    >
      {state.status === 'loading' && <MapLoadingState />}
      {state.status === 'error' && <MapErrorState onRetry={load} />}
      {state.status === 'ready' && sites.length === 0 && <MapEmptyState />}

      <div className="site-map-frame">
        <MapContainer
          center={viewport.center ?? [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude]}
          zoom={viewport.zoom ?? DEFAULT_ZOOM}
          bounds={viewport.bounds}
          boundsOptions={viewport.boundsOptions}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <ZoomWatcher onZoomChange={setZoom} />
          <ViewportFitter viewport={viewport} />
          <SiteFocus
            site={focusedSite}
            focusKey={focusKey}
            viewport={viewport}
            onPopupDismissed={onPopupDismissed}
          />
          <TileLayer url={TILE_URL} />

          {sites.map((site) => (
            <SiteMarker
              key={site.siteId}
              site={site}
              allPercents={allPercents}
              trueToScale={trueToScale}
              isFocused={focusedSite?.siteId === site.siteId}
              onSelectSite={onSelectSite}
            />
          ))}
        </MapContainer>

        <MapLegend percents={allPercents} trueToScale={trueToScale} />
      </div>

      <MapAttribution />
    </div>
  )
}

export default MapView
