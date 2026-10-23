// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useEffect, useRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapView from '../../src/components/MapView'

afterEach(cleanup)

const { openPopupSpy } = vi.hoisted(() => ({ openPopupSpy: vi.fn() }))
beforeEach(() => openPopupSpy.mockClear())

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
  useMapEvents: () => null,
  CircleMarker: ({ eventHandlers, children }) => {
    const ref = useRef(null)
    useEffect(() => {
      eventHandlers?.add?.({ target: { getElement: () => ref.current, openPopup: openPopupSpy } })
    }, [eventHandlers])
    return <div ref={ref}>{children}</div>
  },
  Circle: ({ eventHandlers, children }) => {
    const ref = useRef(null)
    useEffect(() => {
      eventHandlers?.add?.({ target: { getElement: () => ref.current, openPopup: openPopupSpy } })
    }, [eventHandlers])
    return <div ref={ref}>{children}</div>
  },
  Popup: ({ children }) => <div>{children}</div>,
}))

const sites = [
  { siteId: 'S1', propertyName: 'Boulder Creek Estates OS', latitude: 40.1672, longitude: -105.1019, occupiedTunnelCount: 5 },
  { siteId: 'S2', propertyName: 'St. Vrain Greenway', latitude: 40.17, longitude: -105.1, occupiedTunnelCount: 2 },
]

describe('map accessibility', () => {
  it('names each marker by its propertyName and lets it take keyboard focus', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    const marker = await screen.findByRole('button', { name: 'Boulder Creek Estates OS' })
    marker.focus()
    expect(marker).toHaveFocus()

    expect(screen.getByRole('button', { name: 'St. Vrain Greenway' })).toBeInTheDocument()
  })

  it('opens the site popup when a focused marker receives Enter (#51 review)', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    const marker = await screen.findByRole('button', { name: 'Boulder Creek Estates OS' })
    fireEvent.keyDown(marker, { key: 'Enter' })

    expect(openPopupSpy).toHaveBeenCalledTimes(1)
  })

  it('opens the site popup when a focused marker receives Space, not other keys', async () => {
    render(<MapView loadSites={() => Promise.resolve(sites)} />)

    const marker = await screen.findByRole('button', { name: 'Boulder Creek Estates OS' })
    fireEvent.keyDown(marker, { key: 'Tab' })
    expect(openPopupSpy).not.toHaveBeenCalled()

    fireEvent.keyDown(marker, { key: ' ' })
    expect(openPopupSpy).toHaveBeenCalledTimes(1)
  })

  it('announces the retry control to screen readers when the sites request fails', async () => {
    render(<MapView loadSites={() => Promise.reject(new Error('down'))} />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    expect(retry).toHaveFocus()
  })
})
