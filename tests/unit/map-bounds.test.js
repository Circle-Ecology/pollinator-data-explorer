import { describe, expect, it } from 'vitest'
import { computeMapBounds, DEFAULT_ZOOM } from '../../src/utils/mapBounds'

const site = (siteId, latitude, longitude) => ({ siteId, latitude, longitude })

describe('computeMapBounds', () => {
  it('returns null for no sites', () => {
    expect(computeMapBounds([])).toBeNull()
  })

  it('uses DEFAULT_ZOOM centered on the one site when there is only one', () => {
    const result = computeMapBounds([site('S1', 40.1, -105.2)])

    expect(result).toEqual({ center: [40.1, -105.2], zoom: DEFAULT_ZOOM })
  })

  it('fits bounds to every site with padding when there are several', () => {
    const result = computeMapBounds([
      site('S1', 40.0, -105.5),
      site('S2', 40.2, -105.0),
      site('S3', 39.9, -105.3),
    ])

    expect(result.bounds).toEqual([
      [39.9, -105.5],
      [40.2, -105.0],
    ])
    expect(result.boundsOptions.padding).toEqual([40, 40])
  })
})
