import { describe, expect, it } from 'vitest'
import { normalizeNaValue } from '../../src/utils/normalizeNaValue'

describe('normalizeNaValue', () => {
  it('treats the literal NA as an absent value', () => {
    expect(normalizeNaValue('NA')).toBeNull()
  })

  it('treats blank and missing values as absent', () => {
    expect(normalizeNaValue('')).toBeNull()
    expect(normalizeNaValue('   ')).toBeNull()
    expect(normalizeNaValue(undefined)).toBeNull()
    expect(normalizeNaValue(null)).toBeNull()
  })

  it('returns other values trimmed', () => {
    expect(normalizeNaValue('  Bee ')).toBe('Bee')
  })

  it('keeps values that only contain NA as text', () => {
    expect(normalizeNaValue('NAN')).toBe('NAN')
    expect(normalizeNaValue('na')).toBe('na')
  })
})
