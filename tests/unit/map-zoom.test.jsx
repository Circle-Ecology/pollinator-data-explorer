// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapView, { SITE_FOCUS_ZOOM } from '../../src/components/MapView'

// Leaflet is mocked: `fakeMap` records view changes and `mapEvents` holds the
// handlers MapView registers with useMapEvents, so tests can fire them.
const { fakeMap, mapEvents, openedPopups } = vi.hoisted(() => ({
  fakeMap: { fitBounds: vi.fn(), setView: vi.fn(), flyTo: vi.fn(), flyToBounds: vi.fn(), closePopup: vi.fn() },
  mapEvents: [],
  // "<marker type>:<lat>" each time a marker layer's popup is opened in code.
  openedPopups: [],
}))

// A marker whose ref is a fake Leaflet layer that records openPopup calls.
function fakeMarker(type) {
  return function Marker({ center, children, ref }) {
    if (ref) ref.current = { openPopup: () => openedPopups.push(`${type}:${center[0]}`) }
    return <div data-testid="site-marker">{children}</div>
  }
}

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  useMap: () => fakeMap,
  useMapEvents: (handlers) => {
    mapEvents.push(handlers)
    return fakeMap
  },
  CircleMarker: fakeMarker('dot'),
  Circle: fakeMarker('circle'),
  Popup: ({ children }) => <div>{children}</div>,
}))

const sites = [
  { siteId: 'S1', propertyName: 'Sherwood OS (Site 5)', latitude: 40.2, longitude: -105.09, tunnelCount: 10, occupiedTunnelCount: 5 },
  { siteId: 'S2', propertyName: 'Rogers Grove OS (Site 6)', latitude: 40.15, longitude: -105.12, tunnelCount: 10, occupiedTunnelCount: 2 },
]
const loadSites = () => Promise.resolve(sites)
const DEFAULT_BOUNDS = [[40.15, -105.12], [40.2, -105.09]]

// Fire a Leaflet map event on every handler MapView registered for it.
function fireMapEvent(name, event) {
  for (const handlers of mapEvents) handlers[name]?.(event)
}

async function renderMap(props = {}) {
  const view = render(<MapView loadSites={loadSites} {...props} />)
  await waitFor(() => expect(screen.getAllByTestId('site-marker')).toHaveLength(2))
  return view
}

beforeEach(() => {
  for (const spy of Object.values(fakeMap)) spy.mockClear()
  mapEvents.length = 0
  openedPopups.length = 0
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('map zoom to a selected site', () => {
  it('zooms in on a site when it is selected', async () => {
    const { rerender } = await renderMap()

    rerender(<MapView loadSites={loadSites} focusedSite={sites[0]} focusKey={1} />)

    expect(fakeMap.flyTo).toHaveBeenCalledWith([40.2, -105.09], SITE_FOCUS_ZOOM, expect.any(Object))
  })

  it('zooms in again when the same site is selected a second time', async () => {
    const { rerender } = await renderMap()
    rerender(<MapView loadSites={loadSites} focusedSite={sites[0]} focusKey={1} />)
    rerender(<MapView loadSites={loadSites} focusedSite={sites[0]} focusKey={2} />)

    expect(fakeMap.flyTo).toHaveBeenCalledTimes(2)
  })

  it('zooms back out to the default view and closes the popup when the site is cleared', async () => {
    const { rerender } = await renderMap()
    rerender(<MapView loadSites={loadSites} focusedSite={sites[0]} focusKey={1} />)

    rerender(<MapView loadSites={loadSites} focusedSite={null} focusKey={1} />)

    expect(fakeMap.closePopup).toHaveBeenCalled()
    expect(fakeMap.flyToBounds).toHaveBeenCalledWith(DEFAULT_BOUNDS, expect.objectContaining({ padding: [40, 40] }))
  })

  it('does not move the map on load when no site was ever selected', async () => {
    await renderMap({ focusedSite: null })

    expect(fakeMap.flyTo).not.toHaveBeenCalled()
    expect(fakeMap.flyToBounds).not.toHaveBeenCalled()
  })

  it("reports the popup's close (×) so the page can zoom back out", async () => {
    const onPopupDismissed = vi.fn()
    await renderMap({ focusedSite: sites[0], focusKey: 1, onPopupDismissed })
    const popup = { id: 'popup' }
    act(() => fireMapEvent('popupopen', { popup }))

    act(() => fireMapEvent('popupclose', { popup }))
    await act(() => vi.runAllTimersAsync())

    expect(onPopupDismissed).toHaveBeenCalledTimes(1)
  })

  it('does not zoom out when one popup closes only because another site was clicked', async () => {
    const onPopupDismissed = vi.fn()
    await renderMap({ focusedSite: sites[0], focusKey: 1, onPopupDismissed })

    const first = { id: 'first' }
    act(() => fireMapEvent('popupopen', { popup: first }))

    act(() => {
      fireMapEvent('popupclose', { popup: first })
      fireMapEvent('popupopen', { popup: { id: 'second' } })
    })
    await act(() => vi.runAllTimersAsync())

    expect(onPopupDismissed).not.toHaveBeenCalled()
  })

  it("reopens the selected site's popup when zooming in swaps its marker for a true-to-scale circle", async () => {
    await renderMap({ focusedSite: sites[0], focusKey: 1 })
    openedPopups.length = 0

    // Past zoom 13 every marker becomes a meter-sized Circle (a new layer).
    act(() => {
      for (const handlers of mapEvents) handlers.zoomend?.({ target: { getZoom: () => SITE_FOCUS_ZOOM } })
    })
    await act(() => vi.runAllTimersAsync())

    expect(openedPopups).toEqual(['circle:40.2'])
  })

  it('does not zoom out when zooming in replaces the marker and its old popup closes after the new one opens', async () => {
    const onPopupDismissed = vi.fn()
    await renderMap({ focusedSite: sites[0], focusKey: 1, onPopupDismissed })
    const oldPopup = { id: 'dot popup' }
    const newPopup = { id: 'circle popup' }
    act(() => fireMapEvent('popupopen', { popup: oldPopup }))

    act(() => {
      fireMapEvent('popupopen', { popup: newPopup })
      fireMapEvent('popupclose', { popup: oldPopup })
    })
    await act(() => vi.runAllTimersAsync())

    expect(onPopupDismissed).not.toHaveBeenCalled()
  })
})
