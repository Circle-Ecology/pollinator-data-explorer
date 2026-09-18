import { describe, expect, it } from 'vitest'
import { formatSurveyDate } from '../../src/utils/formatSurveyDate'

describe('formatSurveyDate', () => {
  it('formats a survey date without shifting the day', () => {
    expect(formatSurveyDate('2025-07-24')).toBe('July 24, 2025')
  })
})