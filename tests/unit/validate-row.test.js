import { describe, expect, it } from 'vitest'
import { isUnsurveyedRow, validateSurveyRow } from '../../src/validation/validateSurveyRow'
import { ERROR_CODES } from '../../src/validation/errorCodes'
import { makeRow } from '../fixtures/sampleExport'

const ROW_NUMBER = 2
const codes = (list) => list.map((e) => e.code)

function formatMmDdYyyy(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}-${dd}-${date.getFullYear()}`
}

describe('validateSurveyRow', () => {
  it('accepts a real export row', () => {
    const result = validateSurveyRow(makeRow(), ROW_NUMBER)

    expect(result).toMatchObject({ isValid: true, isUnsurveyed: false, errors: [], warnings: [] })
  })

  describe('Observation Date', () => {
    it('accepts MM-DD-YYYY', () => {
      expect(validateSurveyRow(makeRow({ 'Observation Date': '07-24-2025' }), ROW_NUMBER).errors).toEqual([])
    })

    it('accepts M/D/YYYY from the re-saved export', () => {
      expect(validateSurveyRow(makeRow({ 'Observation Date': '7/24/2025' }), ROW_NUMBER).errors).toEqual([])
    })

    it.each(['2025-07-24', '13-01-2025', '02-30-2025', 'July 24 2025'])(
      'returns INVALID_DATE for %s',
      (value) => {
        const result = validateSurveyRow(makeRow({ 'Observation Date': value }), ROW_NUMBER)

        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual([
          expect.objectContaining({
            code: ERROR_CODES.INVALID_DATE,
            column: 'Observation Date',
            rowNumber: ROW_NUMBER,
          }),
        ])
      },
    )

    it('returns FUTURE_DATE for a date one day in the future', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const result = validateSurveyRow(
        makeRow({ 'Observation Date': formatMmDdYyyy(tomorrow) }),
        ROW_NUMBER,
      )

      expect(codes(result.errors)).toEqual([ERROR_CODES.FUTURE_DATE])
    })

    it('accepts today', () => {
      const result = validateSurveyRow(
        makeRow({ 'Observation Date': formatMmDdYyyy(new Date()) }),
        ROW_NUMBER,
      )

      expect(result.errors).toEqual([])
    })
  })

  describe('NA values', () => {
    it('treats NA in Occupant type as an absent value, not the string "NA"', () => {
      const result = validateSurveyRow(makeRow({ 'Occupant type': 'NA' }), ROW_NUMBER)

      expect(result.isValid).toBe(true)
      expect(result.values['Occupant type']).toBeNull()
    })

    it('returns REQUIRED_FIELD_MISSING when a required field is NA or blank', () => {
      const result = validateSurveyRow(makeRow({ City: 'NA', State: '' }), ROW_NUMBER)

      expect(result.errors).toEqual([
        expect.objectContaining({ code: ERROR_CODES.REQUIRED_FIELD_MISSING, column: 'City' }),
        expect.objectContaining({ code: ERROR_CODES.REQUIRED_FIELD_MISSING, column: 'State' }),
      ])
    })

    it('returns REQUIRED_FIELD_MISSING when only the date is NA', () => {
      const result = validateSurveyRow(makeRow({ 'Observation Date': 'NA' }), ROW_NUMBER)

      expect(result.isUnsurveyed).toBe(false)
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ERROR_CODES.REQUIRED_FIELD_MISSING,
          column: 'Observation Date',
        }),
      ])
    })
  })

  describe('unsurveyed rows', () => {
    const unsurveyed = makeRow({ 'Observation Date': 'NA', 'Observation Status': 'NA' })

    it('isUnsurveyedRow is true only when both date and status are NA', () => {
      expect(isUnsurveyedRow(unsurveyed)).toBe(true)
      expect(isUnsurveyedRow(makeRow({ 'Observation Date': 'NA' }))).toBe(false)
      expect(isUnsurveyedRow(makeRow())).toBe(false)
    })

    it('returns an UNSURVEYED_ROW warning and does not fail the row', () => {
      const result = validateSurveyRow(unsurveyed, ROW_NUMBER)

      expect(result.isValid).toBe(true)
      expect(result.isUnsurveyed).toBe(true)
      expect(result.errors).toEqual([])
      expect(codes(result.warnings)).toEqual([ERROR_CODES.UNSURVEYED_ROW])
    })
  })

  describe('Coordinates', () => {
    it('returns MALFORMED_COORDINATES for the corrupted Rogers Grove OS value', () => {
      const result = validateSurveyRow(
        makeRow({ Coordinates: '40.15140.16231, -105.123483, -105.0403' }),
        ROW_NUMBER,
      )

      expect(result.errors).toEqual([
        expect.objectContaining({ code: ERROR_CODES.MALFORMED_COORDINATES, column: 'Coordinates' }),
      ])
    })

    it('returns OUT_OF_RANGE with column Coordinates for a latitude of 91', () => {
      const result = validateSurveyRow(makeRow({ Coordinates: '91, -105.0034' }), ROW_NUMBER)

      expect(result.errors).toEqual([
        expect.objectContaining({ code: ERROR_CODES.OUT_OF_RANGE, column: 'Coordinates' }),
      ])
      expect(result.errors[0].message).toMatch(/latitude/i)
    })

    it('returns OUT_OF_RANGE naming longitude for a longitude of -181', () => {
      const result = validateSurveyRow(makeRow({ Coordinates: '40.1, -181' }), ROW_NUMBER)

      expect(codes(result.errors)).toEqual([ERROR_CODES.OUT_OF_RANGE])
      expect(result.errors[0].message).toMatch(/longitude/i)
    })
  })

  describe('numbers', () => {
    it('returns INVALID_NUMBER for a non-numeric Installation Year', () => {
      const result = validateSurveyRow(makeRow({ 'Installation Year': 'abc' }), ROW_NUMBER)

      expect(result.errors).toEqual([
        expect.objectContaining({ code: ERROR_CODES.INVALID_NUMBER, column: 'Installation Year' }),
      ])
    })

    it('accepts text Plug Depth values from the real export', () => {
      for (const depth of ['1 inch', 'flush', '1/2 inch', 'protruding']) {
        expect(validateSurveyRow(makeRow({ 'Plug Depth': depth }), ROW_NUMBER).errors).toEqual([])
      }
    })
  })

  describe('enumerated columns', () => {
    it('returns UNEXPECTED_ENUM_VALUE naming the column and value for Occupant type Beetle', () => {
      const result = validateSurveyRow(makeRow({ 'Occupant type': 'Beetle' }), ROW_NUMBER)

      expect(result.errors).toEqual([
        expect.objectContaining({ code: ERROR_CODES.UNEXPECTED_ENUM_VALUE, column: 'Occupant type' }),
      ])
      expect(result.errors[0].message).toContain('Beetle')
      expect(result.errors[0].message).toContain('Occupant type')
    })

    it('does not discard the unexpected value', () => {
      const result = validateSurveyRow(makeRow({ 'Occupant type': 'Beetle' }), ROW_NUMBER)

      expect(result.values['Occupant type']).toBe('Beetle')
    })
  })
})
