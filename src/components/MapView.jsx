import { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
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

function MapView({ loadSites = getPublicSites }) {
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
  const allCounts = sites.map((site) => site.occupiedTunnelCount)
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
          <TileLayer url={TILE_URL} />
          {sites.map((site) => (
            <SiteMarker
              key={site.siteId}
              site={site}
              allCounts={allCounts}
              trueToScale={trueToScale}
            />
          ))}
        </MapContainer>
        <MapLegend counts={allCounts} trueToScale={trueToScale} />
      </div>
      <MapAttribution />
    </div>
  )
}

export default MapView
