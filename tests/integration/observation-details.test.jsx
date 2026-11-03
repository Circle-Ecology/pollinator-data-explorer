
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
    siteId: 'site-2',
    tunnelId: 'tunnel-30',
    surveyDate: '2026-08-01',
    commonName: 'Mason bee',
    observationStatus: 'Complete',
  },
]

function mockPublicData(data = observations, siteData = sites) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        String(url).includes('sites.json') ? siteData : data,
    }))
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('US-15 site details integration', () => {
  it('opens site details when a marker is selected', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    const dialog = screen.getByRole('dialog', {
      name: 'Site details: Test Pollinator Garden',
    })

    expect(dialog).toHaveTextContent('Denver, Colorado')
    expect(dialog).toHaveTextContent('39.7392')
    expect(dialog).toHaveTextContent('-104.9903')
    expect(dialog).toHaveTextContent('1609 meters')
    expect(dialog).not.toHaveTextContent('Blue orchard bee')
  })

  it('updates details when a different site is selected', async () => {
    mockPublicData()
    render(<EmbedPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Test Pollinator Garden',
      })
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Second Pollinator Garden',
      })
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Site details: Second Pollinator Garden',
    })

    expect(dialog).toHaveTextContent('Boulder, Colorado')
    expect(dialog).toHaveTextContent('40.015')
    expect(dialog).toHaveTextContent('-105.2705')
    expect(dialog).toHaveTextContent('1655 meters')
    expect(dialog).not.toHaveTextContent('Test Pollinator Garden')
  })

  it('closes with Escape and restores focus to the marker', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    const closeButton = screen.getByRole('button', {
      name: 'Close site details',
    })

    closeButton.focus()
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(marker).toHaveFocus()
    })
  })

  it('closes with the Close button and restores focus', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close site details',
      })
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(marker).toHaveFocus()
    })
  })

  it('restores focus when the original marker is replaced', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const originalMarker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(originalMarker)

    const replacementMarker = originalMarker.cloneNode(true)
    originalMarker.replaceWith(replacementMarker)

    expect(originalMarker.isConnected).toBe(false)
    expect(replacementMarker.isConnected).toBe(true)

    screen.getByRole('button', {
      name: 'Close site details',
    }).focus()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(replacementMarker).toHaveFocus()
    })
  })

  it('does not expose staff-only information', async () => {
    const privateSites = [
      {
        ...sites[0],
        observerName: 'Private Observer',
        observerEmail: 'private@example.com',
        notes: 'Confidential staff note',
      },
      sites[1],
    ]

    mockPublicData(observations, privateSites)

    const { container } = render(<EmbedPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Test Pollinator Garden',
      })
    )

    expect(container).not.toHaveTextContent('Private Observer')
    expect(container).not.toHaveTextContent('private@example.com')
    expect(container).not.toHaveTextContent('Confidential staff note')
  })

  it('reopens details when the same marker is clicked again', async () => {
    mockPublicData()
    render(<EmbedPage />)

    const marker = await screen.findByRole('button', {
      name: 'Test Pollinator Garden',
    })

    fireEvent.click(marker)

    expect(
      screen.getByRole('dialog', {
        name: 'Site details: Test Pollinator Garden',
      })
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close site details',
      })
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(marker)

    expect(
      screen.getByRole('dialog', {
        name: 'Site details: Test Pollinator Garden',
      })
    ).toBeInTheDocument()
  })
})
