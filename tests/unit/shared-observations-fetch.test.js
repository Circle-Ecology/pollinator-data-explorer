
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

      throw new Error(`Unexpected request: ${path}`)
    })

    vi.stubGlobal('fetch', fetchMock)

    const [loadedSites, loadedObservations] = await Promise.all([
      getPublicSites(),
      getPublicObservations(),
    ])

    expect(loadedSites[0].occupiedTunnelCount).toBe(1)
    expect(loadedObservations).toEqual(observations)

    const observationRequests = fetchMock.mock.calls.filter(
      ([path]) => path === '/data/observations.json'
    )

    expect(observationRequests).toHaveLength(1)
  })
})
