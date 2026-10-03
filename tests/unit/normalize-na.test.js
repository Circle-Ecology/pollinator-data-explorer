
import { describe, it, expect } from 'vitest'
import { normalizeNaValue } from '../../src/us08/normalizeNaValue.js'

describe('US-08: Normalize NA Values', () => {
  it('converts NA to null', () => {
    expect(normalizeNaValue('NA')).toBe(null)
  })

  it('converts empty strings to null', () => {
    expect(normalizeNaValue('')).toBe(null)
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeNaValue('  Complete  ')).toBe('Complete')
  })

  it('keeps valid values unchanged', () => {
    expect(normalizeNaValue('Occupied')).toBe('Occupied')
  })
})
