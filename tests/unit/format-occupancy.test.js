import { describe, expect, it } from 'vitest'
import { formatOccupancyRate } from '../../src/utils/formatOccupancyRate'

describe('formatOccupancyRate', () => {
  it('shows the percentage and underlying counts', () => {
    expect(formatOccupancyRate(4, 10)).toBe('40% (4 of 10)')
  })
})
