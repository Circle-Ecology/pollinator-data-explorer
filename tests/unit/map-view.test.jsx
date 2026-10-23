// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useEffect, useRef } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapView from '../../src/components/MapView'

afterEach(cleanup)

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, bounds }) => (
    <div
      data-testid="map-container"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
      data-bounds={JSON.stringify(bounds)}
    >
      {children}
    </div>
  ),
  TileLayer: () => null,
  useMapEvents: () => null,
  CircleMarker: ({ radius, eventHandlers, center, children }) => {
    const ref = useRef(null)
    useEffect(() => {
      eventHandlers?.add?.({ target: { getElement: () => ref.current } })
    }, [eventHandlers])
    return (
      <div
        ref={ref}
        data-testid="site-marker"
        data-size={radius}
        data-position={JSON.stringify(center)}
      >
        {children}
      </div>
    )
  },
  Circle: ({ radius, eventHandlers, center, children }) => {
    const ref = useRef(null)
    useEffect(() => {
      eventHandlers?.add?.({ target: { getElement: () => ref.current } })
    }, [eventHandlers])
    return (
      <div
        ref={ref}
        data-testid="site-marker"
        data-size={radius}
        data-position={JSON.stringify(center)}
      >
        {children}
      </div>
    )
  },
  Popup: ({ children }) => <div>{children}</div>,
}))

const sites = [
  { siteId: 'S1', propertyName: 'Boulder Creek Estates OS', latitude: 40.1672, longitude: -105.1019, occupiedTunnelCount: 5 },
  { siteId: 'S2', propertyName: 'St. Vrain Greenway', latitude: 40.17, longitude: -105.1, occupiedTunnelCount: 2 },
  { siteId: 'S3', propertyName: 'Rogers Grove OS', latitude: 40.165, longitude: -105.105, occupiedTunnelCount: 0 },
  { siteId: 'S4', propertyName: 'Sherwood OS', latitude: 40.2, longitude: -105.09, occupiedTunnelCount: 8 },
  { siteId: 'S5', propertyName: 'Sandstone Ranch', latitude: 40.15, longitude: -105.12, occupiedTunnelCount: 1 },
  { siteId: 'S6', propertyName: 'Bee Hotel 2', latitude: 40.1681, longitude: -105.1011, occupiedTunnelCount: 3 },
]

describe('MapView', () => {
  it('shows MapLoadingState while the query is pending', () => {
    render(<MapView loadSites={() => new Promise(() => {})} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading monitoring sites')
  })

  it('renders MapEmptyState for an empty array', async () => {
    render(<MapView loadSites={() => Promise.resolve([])} />)

    expect(await screen.findByText('No sites published yet')).toBeInTheDocument()
  })

  it('renders MapErrorState with a retry control for a rejected query', async () => {
    render(<MapView loadSites={() => Promise.reject(new Error('down'))} />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('renders one SiteMarker per site for a 6-site fixture', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    await waitFor(() => {
      expect(screen.getAllByTestId('site-marker')).toHaveLength(6)
    })
  })

  it('renders a larger marker for a site with a higher occupiedTunnelCount', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    await waitFor(() => expect(screen.getAllByTestId('site-marker')).toHaveLength(6))
    const markers = screen.getAllByTestId('site-marker')
    const sizeByPosition = Object.fromEntries(
      markers.map((marker) => [marker.dataset.position, Number(marker.dataset.size)])
    )
    const sizeOf = (site) => sizeByPosition[JSON.stringify([site.latitude, site.longitude])]

    expect(sizeOf(sites[3])).toBeGreaterThan(sizeOf(sites[1])) // Sherwood (8) > St. Vrain (2)
    expect(sizeOf(sites[2])).toBeLessThan(sizeOf(sites[0])) // Rogers Grove (0) < Boulder Creek (5)
  })

  it('renders no marker and no 0,0 placement for a site with null coordinates', async () => {
    const withNullCoordinates = [
      ...sites,
      { siteId: 'S7', propertyName: 'Unresolved Site', latitude: null, longitude: null, occupiedTunnelCount: 0 },
    ]
    render(<MapView loadSites={() => Promise.resolve(withNullCoordinates)} />)

    await waitFor(() => expect(screen.getAllByTestId('site-marker')).toHaveLength(6))
    const positions = screen.getAllByTestId('site-marker').map((marker) => marker.dataset.position)
    expect(positions.some((position) => position === '[0,0]')).toBe(false)
  })

  it('renders two distinct, individually focusable markers for sites ~100m apart', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    const siteOne = await screen.findByRole('button', { name: 'Boulder Creek Estates OS' })
    const beeHotel = screen.getByRole('button', { name: 'Bee Hotel 2' })

    expect(siteOne).not.toBe(beeHotel)
    siteOne.focus()
    expect(siteOne).toHaveFocus()
    beeHotel.focus()
    expect(beeHotel).toHaveFocus()
  })
})
