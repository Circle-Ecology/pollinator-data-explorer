import { describe, expect, it } from 'vitest'
import { classifyCavityOccupancy } from '../../src/pipeline/generateDashboardDataset.js'
import { obs } from '../fixtures/cavityObservations.js'

describe('US-28 classifyCavityOccupancy', () => {
  it.each(['Active', 'Complete', 'Reopened'])('counts %s alone as occupied', status => {
    expect(classifyCavityOccupancy([obs(status, '2025-07-01')])).toBe('occupied')
  })

  it('counts a cavity as occupied if any observation that year is occupied', () => {
    expect(classifyCavityOccupancy([
      obs('Empty', '2025-06-01'),
      obs('Active', '2025-07-01'),
      obs('Empty', '2025-08-01'),
    ])).toBe('occupied')
  })

  it('classifies a cavity that is only ever Empty as empty', () => {
    expect(classifyCavityOccupancy([
      obs('Empty', '2025-06-01'),
      obs('Empty', '2025-07-01'),
    ])).toBe('empty')
  })

  it('classifies a retired cavity as excluded, not empty', () => {
    expect(classifyCavityOccupancy([
      obs('Empty', '2025-06-01'),
      obs('Retired hole', '2025-07-01'),
    ])).toBe('excluded')
  })
})
