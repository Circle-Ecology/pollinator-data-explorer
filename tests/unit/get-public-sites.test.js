// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { getPublicSites, hasValidCoordinates } from '../../src/api/getPublicSites'

// US-37: sites.json now carries each site's figures, so the browser loads
// only sites.json. Every request is recorded so tests can check that.
function stubFetch(sites) {
  const fetchMock = vi.fn((path) =>
    path === '/data/sites.json'
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(sites) })
      : Promise.resolve({ ok: false, status: 404 })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const stats = {
  firstSurveyDate: '2025-07-01',
  lastSurveyDate: '2025-07-02',
  surveyedInLatestSeason: true,
  surveyDateCount: 2,
  tunnelCount: 2,
  occupiedTunnelCount: 1,
}

afterEach(() => vi.unstubAllGlobals())

describe('getPublicSites - US-37', () => {
  it('loads only sites.json, never observations.json', async () => {
    const fetchMock = stubFetch([
      { siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105, ...stats },
    ])

    await getPublicSites()

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/data/sites.json'])
  })

  it('passes the precomputed site figures through unchanged', async () => {
    stubFetch([{ siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105, ...stats }])

    const [site] = await getPublicSites()

    expect(site).toMatchObject(stats)
  })

  it('treats missing figures as not recorded rather than failing', async () => {
    stubFetch([{ siteId: 'S1', propertyName: 'A', latitude: 40, longitude: -105 }])

    const [site] = await getPublicSites()

    expect(site).toMatchObject({
      firstSurveyDate: null,
      lastSurveyDate: null,
      surveyedInLatestSeason: false,
      surveyDateCount: 0,
      tunnelCount: 0,
      occupiedTunnelCount: 0,
    })
  })

  it('excludes a site with non-finite coordinates rather than placing it at 0,0', async () => {
    stubFetch([
      { siteId: 'S1', propertyName: 'Good', latitude: 40, longitude: -105 },
      { siteId: 'S2', propertyName: 'Bad', latitude: null, longitude: null },
    ])

    const sites = await getPublicSites()

    expect(sites.map((site) => site.siteId)).toEqual(['S1'])
  })

  it('rejects when the sites request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(getPublicSites()).rejects.toThrow()
  })

  it('never forwards fields outside the public site allowlist', async () => {
    stubFetch([
      {
        siteId: 'S1',
        propertyName: 'A',
        latitude: 40,
        longitude: -105,
        ...stats,
        observerId: 'o-1',
        observerEmail: 'private@example.com',
        observerFirstName: 'Private',
        observerLastName: 'Observer',
        notes: 'Confidential staff note',
      },
    ])

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
