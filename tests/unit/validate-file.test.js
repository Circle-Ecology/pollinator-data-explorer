import { describe, expect, it } from 'vitest'
import { buildNaturalKey, validateExportFile } from '../../src/validation/validateExportFile'
import { ERROR_CODES } from '../../src/validation/errorCodes'
import { EXPORT_HEADERS, makeRow, toRowArray } from '../fixtures/sampleExport'

const codes = (list) => list.map((e) => e.code)
const exportOf = (...rows) => [EXPORT_HEADERS, ...rows.map(toRowArray)]

describe('buildNaturalKey', () => {
  it('combines tunnelId and surveyDate', () => {
    expect(buildNaturalKey('T1', '07-24-2025')).toBe(buildNaturalKey('T1', '07-24-2025'))
    expect(buildNaturalKey('T1', '07-24-2025')).not.toBe(buildNaturalKey('T1', '08-07-2025'))
    expect(buildNaturalKey('T1', '07-24-2025')).not.toBe(buildNaturalKey('T2', '07-24-2025'))
  })
})

describe('validateExportFile', () => {
  it('accepts the same Unique ID on two different dates', () => {
    const result = validateExportFile(
      exportOf(makeRow({ 'Observation Date': '07-24-2025' }), makeRow({ 'Observation Date': '08-07-2025' })),
    )

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result).toMatchObject({ totalRows: 2, validRows: 2, invalidRows: 0, tunnelCount: 1 })
  })

  it('returns DUPLICATE_TUNNEL_DATE for the second row only', () => {
    const result = validateExportFile(exportOf(makeRow(), makeRow()))

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({ code: ERROR_CODES.DUPLICATE_TUNNEL_DATE, rowNumber: 3, column: 'Unique ID' }),
    ])
    expect(result).toMatchObject({ validRows: 1, invalidRows: 1 })
  })

  it('treats MM-DD-YYYY and M/D/YYYY for the same day as the same survey date', () => {
    const result = validateExportFile(
      exportOf(makeRow({ 'Observation Date': '07-04-2025' }), makeRow({ 'Observation Date': '7/4/2025' })),
    )

    expect(codes(result.errors)).toEqual([ERROR_CODES.DUPLICATE_TUNNEL_DATE])
  })

  it('also flags repeated unsurveyed rows for the same tunnel', () => {
    const unsurveyed = makeRow({ 'Observation Date': 'NA', 'Observation Status': 'NA' })
    const result = validateExportFile(exportOf(unsurveyed, unsurveyed))

    expect(result.errors).toEqual([
      expect.objectContaining({ code: ERROR_CODES.DUPLICATE_TUNNEL_DATE, rowNumber: 3 }),
    ])
    expect(result.unsurveyedRowCount).toBe(2)
  })

  it('returns EMPTY_FILE for an empty file', () => {
    const result = validateExportFile([])

    expect(result.isValid).toBe(false)
    expect(codes(result.errors)).toEqual([ERROR_CODES.EMPTY_FILE])
  })

  it('returns NO_DATA_ROWS for a header-only file', () => {
    const result = validateExportFile([EXPORT_HEADERS])

    expect(result.isValid).toBe(false)
    expect(codes(result.errors)).toEqual([ERROR_CODES.NO_DATA_ROWS])
  })

  it('stops at MISSING_HEADER without processing rows', () => {
    const headers = EXPORT_HEADERS.filter((h) => h !== 'Coordinates')
    const row = toRowArray(makeRow({ 'Occupant type': 'Beetle' })).filter(
      (_, i) => EXPORT_HEADERS[i] !== 'Coordinates',
    )
    const result = validateExportFile([headers, row])

    expect(result.isValid).toBe(false)
    expect(codes(result.errors)).toEqual([ERROR_CODES.MISSING_HEADER])
    expect(result).toMatchObject({ totalRows: 1, validRows: 0, invalidRows: 0 })
  })

  it('validates rows using the v01 Type header', () => {
    const headers = EXPORT_HEADERS.map((h) => (h === 'Coarse Woody Debris Type' ? 'Type' : h))
    const result = validateExportFile([headers, toRowArray(makeRow({ 'Coarse Woody Debris Type': 'Stump' }))])

    expect(result.errors).toEqual([
      expect.objectContaining({ code: ERROR_CODES.UNEXPECTED_ENUM_VALUE, column: 'Coarse Woody Debris Type' }),
    ])
    expect(codes(result.warnings)).toEqual([ERROR_CODES.RENAMED_HEADER])
  })

  it('reports counts and keeps row errors and warnings', () => {
    const result = validateExportFile(
      exportOf(
        makeRow(),
        makeRow({ 'Unique ID': 'T2', 'Observation Date': 'NA', 'Observation Status': 'NA' }),
        makeRow({ 'Unique ID': 'T3', 'Occupant type': 'Beetle' }),
      ),
    )

    expect(result).toMatchObject({
      isValid: false,
      totalRows: 3,
      validRows: 2,
      invalidRows: 1,
      tunnelCount: 3,
      unsurveyedRowCount: 1,
    })
    expect(codes(result.errors)).toEqual([ERROR_CODES.UNEXPECTED_ENUM_VALUE])
    expect(codes(result.warnings)).toEqual([ERROR_CODES.UNSURVEYED_ROW])
  })

  it('flags the site for staff review when its coordinates are malformed', () => {
    const result = validateExportFile(
      exportOf(
        makeRow({ 'Property Name': 'Rogers Grove OS', Coordinates: '40.15140.16231, -105.123483, -105.0403' }),
        makeRow({ 'Observation Date': '08-07-2025', 'Property Name': 'Rogers Grove OS', Coordinates: '40.15140.16231, -105.123483, -105.0403' }),
      ),
    )

    expect(codes(result.errors)).toEqual([
      ERROR_CODES.MALFORMED_COORDINATES,
      ERROR_CODES.MALFORMED_COORDINATES,
    ])
    expect(result.sitesFlaggedForReview).toEqual(['Rogers Grove OS'])
  })

  it('handles short rows by treating missing cells as absent', () => {
    const result = validateExportFile([EXPORT_HEADERS, ['T1', '07-24-2025', 'Complete']])

    expect(result.invalidRows).toBe(1)
    expect(codes(result.errors)).toContain(ERROR_CODES.REQUIRED_FIELD_MISSING)
  })
})
