import { describe, expect, it } from 'vitest'
import { formatSurveyDate } from '../../src/utils/formatSurveyDate'

describe('formatSurveyDate', () => {
  it('formats a survey date without shifting the day', () => {
    expect(formatSurveyDate('2025-07-24')).toBe('July 24, 2025')
  })

  it('returns Not recorded for missing dates', () => {
    expect(formatSurveyDate(null)).toBe('Not recorded')
    expect(formatSurveyDate(undefined)).toBe('Not recorded')
    expect(formatSurveyDate('')).toBe('Not recorded')
  })

  it('returns Not recorded for invalid dates', () => {
    expect(formatSurveyDate('invalid')).toBe('Not recorded')
    expect(formatSurveyDate('2025-02-30')).toBe('Not recorded')
    expect(formatSurveyDate(123)).toBe('Not recorded')
  })

  it('correctly formats leap day', () => {
    expect(formatSurveyDate('2024-02-29')).toBe('February 29, 2024')
  })

  it('rejects invalid leap days', () => {
    expect(formatSurveyDate('2025-02-29')).toBe('Not recorded')
  })
})
