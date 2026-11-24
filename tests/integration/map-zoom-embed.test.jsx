// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EmbedPage from '../../src/components/EmbedPage'

// US-41: clicking a site zooms the map in on it; closing the site (the popup's
// ×, the details panel's Close button or Escape) zooms back out.
const { fakeMap, mapEvents } = vi.hoisted(() => ({
  fakeMap: { fitBounds: vi.fn(), setView: vi.fn(), flyTo: vi.fn(), flyToBounds: vi.fn(), closePopup: vi.fn() },
  mapEvents: [],
}))

vi.mock('react-leaflet', () => {
  const Marker = ({ eventHandlers, children }) => (
    <div>
      <button type="button" onClick={() => eventHandlers.click({ target: { getElement: () => null } })}>
        marker
      </button>
      {children}
    </div>
  )
  return {
    MapContainer: ({ children }) => <div>{children}</div>,
    TileLayer: () => null,
    useMap: () => fakeMap,
    useMapEvents: (handlers) => {
      mapEvents.push(handlers)
      return fakeMap
    },
    CircleMarker: Marker,
    Circle: Marker,
    Popup: ({ children }) => <div>{children}</div>,
  }
})

const site = {
  siteId: 'Sherwood OS', propertyName: 'Sherwood OS (Site 5)', city: 'Longmont', state: 'CO',
  latitude: 40.2, longitude: -105.09, elevationMeters: 1491, firstSurveyDate: '2023-05-07',
  lastSurveyDate: '2026-10-01', surveyedInLatestSeason: true, surveyDateCount: 34,
  tunnelCount: 500, occupiedTunnelCount: 296,
}

beforeEach(() => {
  for (const spy of Object.values(fakeMap)) spy.mockClear()
  mapEvents.length = 0
  vi.stubGlobal('fetch', vi.fn((url) =>
    String(url).includes('sites.json')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve([site]) })
      : Promise.reject(new Error('not needed here'))
  ))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function selectSite() {
  render(<EmbedPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'marker' }))
}

describe('map zoom on the embed page - US-41', () => {
  it('zooms in on a site when its marker is clicked', async () => {
    await selectSite()

    expect(fakeMap.flyTo).toHaveBeenCalledWith([40.2, -105.09], 16, expect.any(Object))
    expect(screen.getByRole('dialog', { name: /Sherwood OS \(Site 5\)/ })).toBeInTheDocument()
  })

  it("zooms back out when the details panel's Close button is pressed", async () => {
    await selectSite()

    fireEvent.click(screen.getByRole('button', { name: 'Close site details' }))

    expect(fakeMap.closePopup).toHaveBeenCalled()
    expect(fakeMap.flyToBounds).not.toHaveBeenCalled() // one site: no bounds, a center
    expect(fakeMap.flyTo).toHaveBeenLastCalledWith([40.2, -105.09], 12, expect.any(Object))
  })

  it("zooms back out when the popup's × closes it", async () => {
    await selectSite()
    fakeMap.flyTo.mockClear()

    await act(async () => {
      const popup = { id: 'popup' }
      for (const handlers of mapEvents) handlers.popupopen?.({ popup })
      for (const handlers of mapEvents) handlers.popupclose?.({ popup })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(fakeMap.flyTo).toHaveBeenCalledWith([40.2, -105.09], 12, expect.any(Object))
  })
})
