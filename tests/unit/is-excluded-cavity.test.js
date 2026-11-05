import { describe, expect, it } from 'vitest'
import { isExcludedCavity } from '../../src/pipeline/generateDashboardDataset.js'
import { obs } from '../fixtures/cavityObservations.js'

describe('US-28 isExcludedCavity', () => {
  it('excludes a cavity that is Retired hole on every observation', () => {
    expect(isExcludedCavity([
      obs('Retired hole', '2025-06-01'),
      obs('Retired hole', '2025-07-01'),
    ])).toBe(true)
  })

  it('excludes a cavity that is Empty and then Retired hole', () => {
    expect(isExcludedCavity([
      obs('Empty', '2025-06-01'),
      obs('Retired hole', '2025-07-01'),
    ])).toBe(true)
  })

  it('does not exclude a cavity that is Empty and then Active', () => {
    expect(isExcludedCavity([
      obs('Empty', '2025-06-01'),
      obs('Active', '2025-07-01'),
    ])).toBe(false)
  })

  it('does not exclude a cavity that is Empty on every observation', () => {
    expect(isExcludedCavity([
      obs('Empty', '2025-06-01'),
      obs('Empty', '2025-07-01'),
    ])).toBe(false)
  })

  it('does not exclude a cavity that was occupied before it was retired', () => {
    expect(isExcludedCavity([
      obs('Complete', '2025-06-01'),
      obs('Retired hole', '2025-07-01'),
    ])).toBe(false)
  })

  it('does not exclude a cavity with no observations', () => {
    expect(isExcludedCavity([])).toBe(false)
  })
})
