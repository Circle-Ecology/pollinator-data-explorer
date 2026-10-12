import { describe, expect, it } from 'vitest'
import { MalformedCoordinatesError, parseCoordinatePair } from '../../src/utils/parseCoordinatePair'

describe('parseCoordinatePair', () => {
  it('parses a "lat, lon" pair', () => {
    expect(parseCoordinatePair('40.15506, -105.0034')).toEqual({
      latitude: 40.15506,
      longitude: -105.0034,
    })
  })

  it('parses a pair without a space after the comma', () => {
    expect(parseCoordinatePair('40.1,-105')).toEqual({ latitude: 40.1, longitude: -105 })
  })

  it('does not range-check (validateSurveyRow does that)', () => {
    expect(parseCoordinatePair('91, 0')).toEqual({ latitude: 91, longitude: 0 })
  })

  it('throws for the corrupted Rogers Grove OS value', () => {
    expect(() => parseCoordinatePair('40.15140.16231, -105.123483, -105.0403')).toThrow(
      MalformedCoordinatesError,
    )
  })

  it('throws for a single number, text, or empty value', () => {
    for (const raw of ['40.1', 'forty, -105', '', '40.1, ', null]) {
      expect(() => parseCoordinatePair(raw)).toThrow(MalformedCoordinatesError)
    }
  })
})
