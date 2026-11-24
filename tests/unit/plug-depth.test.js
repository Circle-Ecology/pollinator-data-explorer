import { describe, expect, it } from 'vitest'
import { countPlugDepths } from '../../src/pipeline/generateDashboardDataset.js'

const o = (surveyDate, observationStatus, occupantType, plugDepth, extra = {}) =>
  ({ surveyDate, observationStatus, occupantType, plugDepth, ...extra })
const level = (result, name) => result.rows.find(row => row.level === name).nests

describe('US-38 plug depth by year (report_v04)', () => {
  it('counts a cavity with two nests in one season once, at its last depth recorded while occupied', () => {
    const cavity = [
      o('2025-05-01', 'Complete', 'Bee', '1 inch'),
      o('2025-06-01', 'Reopened', null, null),
      o('2025-07-01', 'Active', 'Wasp', 'flush'),
      o('2025-08-01', 'Complete', 'Wasp', 'protruding'),
      o('2025-09-01', 'Empty', null, '1/2 inch'), // not occupied: its depth does not count
    ]
    const result = countPlugDepths([cavity])
    expect(result.total).toBe(1)
    expect(level(result, 'protruding')).toBe(1)
    expect(level(result, '1 inch')).toBe(0)
    expect(level(result, 'flush')).toBe(0)
  })

  it('leaves out cavities with no depth and Other occupants', () => {
    const result = countPlugDepths([
      [o('2025-05-01', 'Complete', 'Bee', null)],
      [o('2025-05-01', 'Active', 'Spider', 'flush')],
    ])
    expect(result.total).toBe(0)
  })

  it('reads a depth whose "1/2" was garbled to replacement characters as 1/2 inch', () => {
    const result = countPlugDepths([
      [o('2026-05-01', 'Complete', 'Bee', '������ inch')],
      [o('2026-05-01', 'Complete', 'Wasp', '1/2 inch')],
    ])
    expect(level(result, '1/2 inch')).toBe(2)
    expect(result.unrecognized).toBe(0)
    expect(result.total).toBe(2)
  })

  it('still reports any other unrecognized depth', () => {
    const result = countPlugDepths([[o('2026-05-01', 'Complete', 'Bee', '3 inches')]])
    expect(result).toMatchObject({ total: 0, unrecognized: 1 })
  })
})
