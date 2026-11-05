import { describe, expect, it } from 'vitest'
import { countOccupantRuns } from '../../src/pipeline/generateDashboardDataset.js'
import { obs } from '../fixtures/cavityObservations.js'

describe('US-28 countOccupantRuns', () => {
  it('counts one run for a steady occupant across several observations', () => {
    expect(countOccupantRuns([
      obs('Active', '2025-06-01', { plugComposition: 'mud' }),
      obs('Active', '2025-07-01', { plugComposition: 'mud' }),
      obs('Complete', '2025-08-01', { plugComposition: 'mud' }),
    ])).toBe(1)
  })

  it('counts two runs when Plug Composition changes mid-season', () => {
    expect(countOccupantRuns([
      obs('Active', '2025-06-01', { plugComposition: 'mud' }),
      obs('Active', '2025-07-01', { plugComposition: 'leaf pieces' }),
    ])).toBe(2)
  })

  it('starts a new run when a cavity moves from Reopened to Active', () => {
    expect(countOccupantRuns([
      obs('Complete', '2025-06-01', { plugComposition: 'mud' }),
      obs('Reopened', '2025-07-01', { plugComposition: 'mud' }),
      obs('Active', '2025-08-01', { plugComposition: 'mud' }),
    ])).toBe(2)
  })

  it('starts a new run when a cavity moves from Empty to Active', () => {
    expect(countOccupantRuns([
      obs('Active', '2025-06-01', { plugComposition: 'mud' }),
      obs('Empty', '2025-07-01'),
      obs('Active', '2025-08-01', { plugComposition: 'mud' }),
    ])).toBe(2)
  })

  it('does not treat a missing Plug Composition as a change', () => {
    expect(countOccupantRuns([
      obs('Active', '2025-06-01', { plugComposition: 'mud' }),
      obs('Active', '2025-07-01', { plugComposition: null }),
    ])).toBe(1)
  })

  it('counts zero runs for a cavity that is never occupied', () => {
    expect(countOccupantRuns([obs('Empty', '2025-06-01'), obs('Retired hole', '2025-07-01')])).toBe(0)
  })
})
