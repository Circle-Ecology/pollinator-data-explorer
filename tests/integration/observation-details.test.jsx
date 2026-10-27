
 // @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import EmbedPage from '../../src/components/EmbedPage'

vi.mock('react-leaflet', () => {
  function MockMarker({ children, eventHandlers }) {
    return (
      <button
        type="button"
        aria-label="Test Pollinator Garden"
        onClick={(event) => {
          const markerElement = event.currentTarget

          eventHandlers?.click?.({
            target: {
              getElement: () => markerElement,
            },
          })
        }}
      >
        {children}
      </button>
    )
  }

  return {
    MapContainer: ({ children }) => <div>{children}</div>,
    TileLayer: () => null,
    useMap: () => ({
      fitBounds: vi.fn(),
      setView: vi.fn(),
    }),
    useMapEvents: () => null,
    CircleMarker: MockMarker,
    Circle: MockMarker,
    Popup: ({ children }) => <div>{children}</div>,
  }
})

const sites = [
  {
    siteId: 'site-1',
    propertyName: 'Test Pollinator Garden',
    city: 'Denver',
    state: 'Colorado',
    latitude: 39.7392,
    longitude: -104.9903,
    elevationMeters: 1609,
  },
]

const observations = [
  {
    siteId: 'site-1',
    tunnelId: 'tunnel-10',
    surveyDate: '2026-07-24',
    commonName: 'Blue orchard bee',
    observationStatus: 'Complete',
  },
  {
    siteId: 'site-1',
    tunnelId: 'tunnel-20',
    surveyDate: '2026-07-25',
    commonName: 'Leafcutter bee',
    observationStatus: 'Active',
  },
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('US-15 observation details integration', () => {
  it('opens observations when a site marker is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('sites.json') ? sites : observations,
      }))
    )

    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    expect(
      await screen.findByText('Observations at Test Pollinator Garden')
    ).toBeInTheDocument()
  })

  it('displays and switches between selected observations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('sites.json') ? sites : observations,
      }))
    )

    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    fireEvent.click(
      await screen.findByRole('button', { name: /Blue orchard bee/ })
    )

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toHaveTextContent('Blue orchard bee')

    fireEvent.click(
      screen.getByRole('button', { name: /Leafcutter bee/ })
    )

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toHaveTextContent('Leafcutter bee')
  })

  it('closes details with Escape and returns focus to the marker', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('sites.json') ? sites : observations,
      }))
    )

    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    marker.focus()
    fireEvent.click(marker)

    const observationButton = await screen.findByRole('button', {
      name: /Blue orchard bee/,
    })

    observationButton.focus()
    fireEvent.click(observationButton)

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toBeInTheDocument()

    // Focus must be away from the marker before closing.
    expect(marker).not.toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(marker).toHaveFocus()
    })
  })

  it('does not expose private observation data', async () => {
    const privateObservations = [
      {
        ...observations[0],
        observerName: 'Private Observer',
      },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('sites.json') ? sites : privateObservations,
      }))
    )

    const { container } = render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    fireEvent.click(
      await screen.findByRole('button', { name: /Blue orchard bee/ })
    )

    expect(container.textContent).not.toContain('Private Observer')
  })
})
