import { describe, expect, it } from 'vitest'
import { parseExportDate } from '../../src/utils/parseExportDate'

describe('parseExportDate', () => {
  it('parses MM-DD-YYYY', () => {
    expect(parseExportDate('07-24-2025')).toEqual({ year: 2025, month: 7, day: 24 })
  })

  it('parses M/D/YYYY from the re-saved export', () => {
    expect(parseExportDate('7/24/2025')).toEqual({ year: 2025, month: 7, day: 24 })
    expect(parseExportDate('10/1/2025')).toEqual({ year: 2025, month: 10, day: 1 })
  })

  it('returns null for ISO dates', () => {
    expect(parseExportDate('2025-07-24')).toBeNull()
  })

  it('returns null for dates that do not exist', () => {
    expect(parseExportDate('13-01-2025')).toBeNull()
    expect(parseExportDate('02-30-2025')).toBeNull()
    expect(parseExportDate('00-10-2025')).toBeNull()
  })

  it('accepts Feb 29 only in leap years', () => {
    expect(parseExportDate('02-29-2024')).toEqual({ year: 2024, month: 2, day: 29 })
    expect(parseExportDate('02-29-2025')).toBeNull()
  })

  it('returns null for mixed separators and empty values', () => {
    expect(parseExportDate('07-24/2025')).toBeNull()
    expect(parseExportDate('')).toBeNull()
    expect(parseExportDate(null)).toBeNull()
  })
})
