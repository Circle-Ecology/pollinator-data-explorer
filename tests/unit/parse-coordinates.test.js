
import { describe, it, expect } from 'vitest'
import { parseCoordinatePair } from '../../src/us08/parseCoordinatePair.js'

describe('US-08: Parse Coordinates', () => {
  it('converts coordinates into latitude and longitude', () => {
    const result = parseCoordinatePair('40.15506, -105.0034')

    expect(result).toEqual({
      latitude: 40.15506,
      longitude: -105.0034,
    })
  })

  it('rejects malformed Rogers Grove coordinates', () => {
    const raw = '40.15140.16231, -105.123483, -105.0403'

    expect(() => parseCoordinatePair(raw))
      .toThrow('MalformedCoordinatesError')
  })
})
