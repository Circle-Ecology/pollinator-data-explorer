// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  calculateSiteStats,
  getPublicSites,
  hasValidCoordinates,
} from '../../src/api/getPublicSites'

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

describe('getPublicSites - US-15 site details', () => {
  it('never forwards fields outside the public site allowlist', async () => {
    stubFetch(
      [
        {
          siteId: 'S1',
          propertyName: 'A',
          latitude: 40,
          longitude: -105,
          observerId: 'o-1',
          observerEmail: 'private@example.com',
          observerFirstName: 'Private',
          observerLastName: 'Observer',
          notes: 'Confidential staff note',
        },
      ],
      []
    )

    const [site] = await getPublicSites()
    const serialized = JSON.stringify(site)

    for (const field of [
      'observerId',
      'observerEmail',
      'observerFirstName',
      'observerLastName',
      'notes',
    ]) {
      expect(site).not.toHaveProperty(field)
    }
    expect(serialized).not.toContain('private@example.com')
    expect(serialized).not.toContain('Confidential')
  })

  it('does not require tunnels.json', async () => {
    const fetchMock = vi.fn((path) =>
      path === '/data/sites.json' || path === '/data/observations.json'
        ? Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        : Promise.resolve({ ok: false, status: 404 })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPublicSites()).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalledWith('/data/tunnels.json')
  })

  it('attaches survey dates, visit count and surveyed tunnel count', async () => {
    stubFetch(
      [{ siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105 }],
      [
        { siteId: 'S1', tunnelId: 'T1', surveyDate: '2025-07-02', observationStatus: 'Empty' },
        { siteId: 'S1', tunnelId: 'T2', surveyDate: '2025-07-01', observationStatus: 'Complete' },
        { siteId: 'S1', tunnelId: 'T2', surveyDate: '2025-07-01', observationStatus: 'Complete' },
      ]
    )

    const [site] = await getPublicSites()

    expect(site).toMatchObject({
      firstSurveyDate: '2025-07-01',
      lastSurveyDate: '2025-07-02',
      surveyDateCount: 2,
      tunnelCount: 2,
      occupiedTunnelCount: 1,
    })
  })
})

describe('calculateSiteStats', () => {
  it('ignores observations without a siteId and malformed dates', () => {
    const stats = calculateSiteStats([
      { tunnelId: 'T0', surveyDate: '2025-01-01' },
      { siteId: 'S1', tunnelId: 'T1', surveyDate: 'July 1' },
    ])

    expect(stats.size).toBe(1)
    expect(stats.get('S1').surveyDates.size).toBe(0)
    expect([...stats.get('S1').tunnelIds]).toEqual(['T1'])
  })
})

describe('hasValidCoordinates', () => {
  it('accepts zero and boundary values', () => {
    expect(hasValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
    expect(hasValidCoordinates({ latitude: 90, longitude: -180 })).toBe(true)
  })

  it('rejects out-of-range, null and non-numeric values', () => {
    expect(hasValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false)
    expect(hasValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false)
    expect(hasValidCoordinates({ latitude: null, longitude: 0 })).toBe(false)
    expect(hasValidCoordinates({ latitude: '40', longitude: 0 })).toBe(false)
  })
})
