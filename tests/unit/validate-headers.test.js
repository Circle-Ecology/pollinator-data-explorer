import { describe, expect, it } from 'vitest'
import {
  normalizeHeader,
  resolveHeaderAlias,
  validateCsvHeaders,
} from '../../src/validation/validateCsvHeaders'
import { ERROR_CODES } from '../../src/validation/errorCodes'
import { EXPORT_HEADERS } from '../fixtures/sampleExport'

const codes = (list) => list.map((e) => e.code)

describe('normalizeHeader', () => {
  it('trims and lowercases', () => {
    expect(normalizeHeader(' Observation Date ')).toBe('observation date')
  })
})

describe('resolveHeaderAlias', () => {
  it('maps Type to Coarse Woody Debris Type', () => {
    expect(resolveHeaderAlias('Type')).toBe('Coarse Woody Debris Type')
  })

  it('returns null for headers that are not aliases', () => {
    expect(resolveHeaderAlias('Observation Date')).toBeNull()
  })
})

describe('validateCsvHeaders', () => {
  it('accepts the real 34-header row', () => {
    const result = validateCsvHeaders(EXPORT_HEADERS)

    expect(EXPORT_HEADERS).toHaveLength(34)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.headerMap['Unique ID']).toBe('Unique ID')
  })

  it('returns MISSING_HEADER naming a missing Coordinates header', () => {
    const result = validateCsvHeaders(EXPORT_HEADERS.filter((h) => h !== 'Coordinates'))

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({ code: ERROR_CODES.MISSING_HEADER, column: 'Coordinates' }),
    ])
    expect(result.errors[0].message).toContain('Coordinates')
  })

  it('accepts the v01 Type header with a RENAMED_HEADER warning', () => {
    const v01Headers = EXPORT_HEADERS.map((h) => (h === 'Coarse Woody Debris Type' ? 'Type' : h))
    const result = validateCsvHeaders(v01Headers)

    expect(result.isValid).toBe(true)
    expect(result.headerMap.Type).toBe('Coarse Woody Debris Type')
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: ERROR_CODES.RENAMED_HEADER,
        column: 'Coarse Woody Debris Type',
      }),
    ])
  })

  it('matches headers that differ only in case or surrounding whitespace', () => {
    const headers = EXPORT_HEADERS.map((h) =>
      h === 'Observation Date' ? ' observation date ' : h,
    )
    const result = validateCsvHeaders(headers)

    expect(result.isValid).toBe(true)
    expect(result.headerMap[' observation date ']).toBe('Observation Date')
  })

  it('ignores unknown extra headers and records a warning', () => {
    const result = validateCsvHeaders([...EXPORT_HEADERS, 'Mystery Column'])

    expect(result.isValid).toBe(true)
    expect(result.headerMap['Mystery Column']).toBeUndefined()
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: ERROR_CODES.UNKNOWN_HEADER, column: 'Mystery Column' }),
    ])
  })

  it('reports every missing required header', () => {
    const result = validateCsvHeaders(['Unique ID'])

    expect(result.isValid).toBe(false)
    expect(codes(result.errors).every((c) => c === ERROR_CODES.MISSING_HEADER)).toBe(true)
    expect(result.errors).toHaveLength(13)
  })

  it('does not warn about missing optional headers', () => {
    const result = validateCsvHeaders(EXPORT_HEADERS.filter((h) => h !== 'Notes'))

    expect(result.isValid).toBe(true)
    expect(result.warnings).toEqual([])
  })
})
