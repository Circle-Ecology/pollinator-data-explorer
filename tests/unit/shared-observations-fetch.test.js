
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublicSites } from '../../src/api/getPublicSites'
import { getPublicObservations } from '../../src/api/getPublicObservations'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shared public observations fetching', () => {
  it('fetches observations only once for simultaneous requests', async () => {
    const sites = [
      {
        siteId: 'site-1',
        propertyName: 'Test Garden',
        latitude: 39.7392,
        longitude: -104.9903,
      },
    ]

    const observations = [
      {
        siteId: 'site-1',
        tunnelId: 'tunnel-1',
        observationStatus: 'Complete',
      },
    ]

    // US-15: Public tunnel data.
    const tunnels = [
      {
        siteId: 'site-1',
        tunnelId: 'tunnel-1',
        direction: 'North',
        installationYear: 2024,
        tunnelDiameterInches: 0.25,
        substrateType: 'Wood',
        sunExposure: 'Full sun',
      },
    ]

    const fetchMock = vi.fn(async (path) => {
      if (path === '/data/sites.json') {
        return {
          ok: true,
          json: async () => sites,
        }
      }

      if (path === '/data/observations.json') {
        return {
          ok: true,
          json: async () => observations,
        }
      }

      // US-15: Handle the new public tunnel dataset.
      if (path === '/data/tunnels.json') {
        return {
          ok: true,
          json: async () => tunnels,
        }
      }

      throw new Error(`Unexpected request: ${path}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    const [loadedSites, loadedObservations] = await Promise.all([
      getPublicSites(),
      getPublicObservations(),
    ])

    // Preserve existing US-14 occupancy behavior.
    expect(loadedSites[0].occupiedTunnelCount).toBe(1)

    // Verify public observations are returned correctly.
    expect(loadedObservations).toEqual(observations)

    // US-15: Verify tunnel records are associated with the site.
    expect(loadedSites[0].tunnels).toEqual(tunnels)

    // Confirm simultaneous requests share one observations fetch.
    const observationRequests = fetchMock.mock.calls.filter(
      ([path]) => path === '/data/observations.json'
    )

    expect(observationRequests).toHaveLength(1)
  })
})
