
import { describe, it, expect } from 'vitest'
import { parseExportDate } from '../../src/us08/parseExportDate.js'

describe('US-08: Parse Export Date', () => {
  it('converts MM-DD-YYYY to YYYY-MM-DD', () => {
    expect(parseExportDate('07-24-2026')).toBe('2026-07-24')
  })

  it('handles dates with surrounding spaces', () => {
    expect(parseExportDate(' 07-24-2026 ')).toBe('2026-07-24')
  })

  it('accepts a valid leap year date', () => {
    expect(parseExportDate('02-29-2024')).toBe('2024-02-29')
  })

  it('rejects February 29 in a non-leap year', () => {
    expect(() => parseExportDate('02-29-2025')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects months greater than 12', () => {
    expect(() => parseExportDate('13-24-2026')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects impossible days', () => {
    expect(() => parseExportDate('04-31-2026')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects incorrect date formats', () => {
    expect(() => parseExportDate('2026-07-24')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects NA values', () => {
    expect(() => parseExportDate('NA')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects empty values', () => {
    expect(() => parseExportDate('')).toThrow(
      'InvalidExportDateError'
    )
  })

  it('rejects non-string values', () => {
    expect(() => parseExportDate(null)).toThrow(
      'InvalidExportDateError'
    )
  })
})
