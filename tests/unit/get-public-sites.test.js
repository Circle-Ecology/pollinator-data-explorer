// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { getPublicSites } from '../../src/api/getPublicSites'

function stubFetch(sites, observations) {
  vi.stubGlobal(
    'fetch',
    vi.fn((path) => {
      const body = path === '/data/sites.json' ? sites : observations
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    })
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('getPublicSites', () => {
  it('attaches occupiedTunnelCount per site from distinct occupied tunnels', async () => {
    stubFetch(
      [{ siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105 }],
      [
        { siteId: 'S1', tunnelId: 'T1', observationStatus: 'Complete' },
        { siteId: 'S1', tunnelId: 'T1', observationStatus: 'Active' },
        { siteId: 'S1', tunnelId: 'T2', observationStatus: 'Empty' },
      ]
    )

    const [site] = await getPublicSites()

    expect(site.occupiedTunnelCount).toBe(1)
  })

  it('does not count a tunnel whose only status is Empty or Retired hole', () => {
    stubFetch(
      [{ siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105 }],
      [
        { siteId: 'S1', tunnelId: 'T1', observationStatus: 'Empty' },
        { siteId: 'S1', tunnelId: 'T2', observationStatus: 'Retired hole' },
      ]
    )

    return getPublicSites().then(([site]) => {
      expect(site.occupiedTunnelCount).toBe(0)
    })
  })

  it('excludes a site with non-finite coordinates rather than placing it at 0,0', async () => {
    stubFetch(
      [
        { siteId: 'S1', propertyName: 'Good', latitude: 40, longitude: -105 },
        { siteId: 'S2', propertyName: 'Bad', latitude: null, longitude: null },
      ],
      []
    )

    const sites = await getPublicSites()

    expect(sites.map((site) => site.siteId)).toEqual(['S1'])
  })

  it('rejects when the sites request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(getPublicSites()).rejects.toThrow()
  })
})
