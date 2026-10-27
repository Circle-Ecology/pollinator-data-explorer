
import { describe, expect, it } from 'vitest'
import {
  formatSurveyDate,
  formatObservationDate,
} from '../../src/utils/formatSurveyDate'

describe('US-15 date formatting', () => {
  it('formats a survey date without shifting the day', () => {
    expect(formatSurveyDate('2025-07-24')).toBe('July 24, 2025')
  })

  it('formats an observation date without shifting the day', () => {
    expect(formatObservationDate('2025-03-14')).toBe('March 14, 2025')
  })

  it('returns Not recorded for missing dates', () => {
    expect(formatObservationDate(null)).toBe('Not recorded')
    expect(formatObservationDate(undefined)).toBe('Not recorded')
    expect(formatObservationDate('')).toBe('Not recorded')
  })

  it('returns Not recorded for invalid dates', () => {
    expect(formatObservationDate('invalid')).toBe('Not recorded')
    expect(formatObservationDate('2025-02-30')).toBe('Not recorded')
    expect(formatObservationDate(123)).toBe('Not recorded')
  })

  it('correctly formats leap day', () => {
    expect(formatObservationDate('2024-02-29')).toBe('February 29, 2024')
  })

  it('rejects invalid leap days', () => {
    expect(formatObservationDate('2025-02-29')).toBe('Not recorded')
  })
})
