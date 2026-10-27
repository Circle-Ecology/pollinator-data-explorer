
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
    const siteName = children?.props?.children?.[0]?.props?.children

    return (
      <button
        type="button"
        role="button"
        aria-label={siteName}
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
  {
    siteId: 'site-2',
    propertyName: 'Second Pollinator Garden',
    city: 'Boulder',
    state: 'Colorado',
    latitude: 40.015,
    longitude: -105.2705,
    elevationMeters: 1655,
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
  {
    siteId: 'site-2',
    tunnelId: 'tunnel-30',
    surveyDate: '2026-08-01',
    commonName: 'Mason bee',
    observationStatus: 'Complete',
  },
]

function mockPublicData(data = observations) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        String(url).includes('sites.json') ? sites : data,
    }))
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('US-15 observation details integration', () => {
  it('opens the details panel immediately when a marker is selected', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
    })

    expect(dialog).toHaveTextContent('Blue orchard bee')
    expect(dialog).toHaveTextContent('Test Pollinator Garden')
    expect(dialog).toHaveTextContent('July 24, 2026')
  })

  it('switches between observations at the same site', async () => {
    mockPublicData()
    render(<EmbedPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Test Pollinator Garden',
      })
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Leafcutter bee/ })
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
    })

    expect(dialog).toHaveTextContent('Leafcutter bee')
    expect(dialog).not.toHaveTextContent('Blue orchard bee')
  })

  it('updates the panel when a different site marker is selected', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const firstMarker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(firstMarker)

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toHaveTextContent('Blue orchard bee')

    const secondMarker = screen.getByRole('button', {
      name: 'Second Pollinator Garden',
    })

    fireEvent.click(secondMarker)

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
    })

    expect(dialog).toHaveTextContent('Mason bee')
    expect(dialog).toHaveTextContent('Second Pollinator Garden')
    expect(dialog).not.toHaveTextContent('Blue orchard bee')
  })

  it('closes details with Escape and returns focus to the marker', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    marker.focus()
    fireEvent.click(marker)

    const observationButton = screen.getByRole('button', {
      name: /Blue orchard bee/,
    })

    observationButton.focus()

    expect(marker).not.toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(marker).toHaveFocus()
    })
  })

  it('restores focus to a replacement marker after the original is detached', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const originalMarker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    originalMarker.focus()
    fireEvent.click(originalMarker)

    expect(
      screen.getByRole('dialog', {
        name: 'Observation Details',
      })
    ).toBeInTheDocument()

    const replacementMarker = originalMarker.cloneNode(true)

    originalMarker.replaceWith(replacementMarker)

    expect(originalMarker.isConnected).toBe(false)
    expect(replacementMarker.isConnected).toBe(true)

    const observationButton = screen.getByRole('button', {
      name: /Blue orchard bee/,
    })

    observationButton.focus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Observation Details',
        })
      ).not.toBeInTheDocument()

      expect(replacementMarker).toHaveFocus()
    })
  })

  it('does not expose private observation data', async () => {
    const privateObservations = [
      {
        ...observations[0],
        observerName: 'Private Observer',
        observerEmail: 'private@example.com',
        observerId: 'private-123',
        observerFirstName: 'PrivateFirst',
        observerLastName: 'PrivateLast',
        notes: 'Confidential staff notes',
      },
    ]

    mockPublicData(privateObservations)

    const { container } = render(<EmbedPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Test Pollinator Garden',
      })
    )

    const text = container.textContent

    expect(text).not.toContain('Private Observer')
    expect(text).not.toContain('private@example.com')
    expect(text).not.toContain('private-123')
    expect(text).not.toContain('PrivateFirst')
    expect(text).not.toContain('PrivateLast')
    expect(text).not.toContain('Confidential staff notes')
  })

  it('reopens details when the same marker is clicked after closing', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toHaveTextContent('Blue orchard bee')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close observation details',
      })
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(marker)

    expect(
      screen.getByRole('dialog', { name: 'Observation Details' })
    ).toHaveTextContent('Blue orchard bee')
  })
})
