// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import EmbedPage from '../../src/components/EmbedPage'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Circle: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
}))

afterEach(() => vi.unstubAllGlobals())

describe('/embed when the API is down', () => {
  it('shows a map error state without tearing down the map frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<EmbedPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Monitoring sites are temporarily unavailable'
    )
    // US-14 (#19): the map frame stays mounted through an error, unlike a full-page failure.
    expect(screen.getByTestId('explorer-map')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
