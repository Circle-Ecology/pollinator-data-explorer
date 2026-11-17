import { describe, expect, it } from 'vitest'
import { formatPeriodRange } from '../../src/utils/formatPeriodRange'

describe('formatPeriodRange - US-31', () => {
  it('labels a period by its start and end dates', () => {
    expect(formatPeriodRange('2026-07-01', '2026-07-14')).toBe('Jul 1–Jul 14')
  })

  it('handles a period that crosses into the next month', () => {
    expect(formatPeriodRange('2026-03-25', '2026-04-07')).toBe('Mar 25–Apr 7')
  })

  it('does not shift dates by a day in any time zone', () => {
    // Read as UTC, so the first and last days are exactly as written.
    expect(formatPeriodRange('2026-03-11', '2026-03-24')).toBe('Mar 11–Mar 24')
  })

  it('says Not recorded for a missing date', () => {
    expect(formatPeriodRange(undefined, '2026-03-24')).toBe('Not recorded')
  })
})
