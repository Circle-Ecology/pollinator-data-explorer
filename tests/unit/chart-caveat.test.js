import { describe, expect, it } from 'vitest'
import { getCaveatText } from '../../src/utils/chartCaveat'

describe('getCaveatText - US-33', () => {
  const limited = { text: 'This year shows logs only.', years: [2023] }

  it('shows plain-text notes for every year', () => {
    expect(getCaveatText('Always shown.', 2025)).toBe('Always shown.')
  })

  it('shows a year-limited note only in its years', () => {
    expect(getCaveatText(limited, 2023)).toBe('This year shows logs only.')
    expect(getCaveatText(limited, '2023')).toBe('This year shows logs only.')
    expect(getCaveatText(limited, 2025)).toBeNull()
  })

  it('shows a year-limited note when every year is on screen', () => {
    expect(getCaveatText(limited, null)).toBe('This year shows logs only.')
  })

  it('returns null when there is no note', () => {
    expect(getCaveatText(undefined, 2023)).toBeNull()
  })
})
