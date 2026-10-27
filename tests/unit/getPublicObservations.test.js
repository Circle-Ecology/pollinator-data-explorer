import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublicObservations } from '../../src/api/getPublicObservations'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getPublicObservations', () => {
  it('loads public observations successfully', async () => {
    const observations = [
      {
        siteId: 'site-1',
        tunnelId: 'tunnel-10',
        surveyDate: '2026-07-24',
        commonName: 'Blue orchard bee',
      },
    ]

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => observations,
    })

    vi.stubGlobal('fetch', fetchMock)

    const result = await getPublicObservations()

    expect(fetchMock).toHaveBeenCalledWith('/data/observations.json')
    expect(result).toEqual(observations)
  })

  it('throws an error when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    )

    await expect(getPublicObservations()).rejects.toThrow(
      'Failed to load public observations: 404'
    )
  })

  it('rejects invalid observation data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: true }),
      })
    )

    await expect(getPublicObservations()).rejects.toThrow(
      'Invalid public observations data'
    )
  })
})
