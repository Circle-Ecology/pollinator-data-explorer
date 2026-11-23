import { describe, expect, it } from 'vitest'
import {
  SCORE_CATEGORY_MINIMUMS, SCORE_MAX, SCORE_THRESHOLD, SCORECARD_CONDITION_LABELS, scoreSite,
} from '../../src/pipeline/generateDashboardDataset.js'

// A condition is { numerator, denominator }; an absent one counts as 0 of 100.
const cond = (numerator, denominator = 100) => ({ numerator, denominator })
const none = cond(0)
const summary = (overrides = {}) => ({
  presentGenera: [],
  uniqueGenera: [],
  emergenceRecorded: false,
  conditions: { parasitism: none, chalkbrood: none, multiGenus: none, other: none, megachile: none, osmiaMud: none },
  ...overrides,
})
const genera = n => Array.from({ length: n }, (_, i) => `Genus ${i}`)

describe('US-35 scoreSite', () => {
  it('exports the contract constants', () => {
    expect(SCORE_THRESHOLD).toBe(0.3)
    expect(SCORE_MAX).toBe(24)
    expect(SCORECARD_CONDITION_LABELS.multiGenus).toBe('Multi-genus cavity use')
  })

  it('names the report_v04 category thresholds as constants staff can change', () => {
    expect(SCORE_CATEGORY_MINIMUMS).toEqual({ medium: 6, high: 11, veryHigh: 16 })
  })

  it.each([
    [0, 'Low'], [5, 'Low'], [6, 'Medium'], [10, 'Medium'], [11, 'High'], [15, 'High'], [16, 'Very High'], [24, 'Very High'],
  ])('puts a score of %i in the %s category (report_v04)', (score, category) => {
    expect(scoreSite(summary({ presentGenera: genera(score) }))).toMatchObject({ score, category })
  })

  it('scores Site 1 in 2026 as 15/24 "High": 11 genera plus four bonuses', () => {
    const result = scoreSite(summary({
      presentGenera: genera(11),
      emergenceRecorded: true, // 31% emerged
      conditions: {
        parasitism: cond(4), chalkbrood: cond(11), multiGenus: cond(17), other: cond(4),
        megachile: cond(26), osmiaMud: none,
      },
    }))
    expect(result).toMatchObject({ score: 15, max: 24, category: 'High', flagged: false, flags: [] })
  })

  it('flags the site but keeps its score when Megachile (Eutricharaea) is at 48%', () => {
    const result = scoreSite(summary({
      presentGenera: genera(11),
      conditions: { ...summary().conditions, megachile: cond(48) },
    }))
    expect(result).toMatchObject({ score: 11, category: 'High', flagged: true, flags: ['megachile'] })
  })

  it.each(['parasitism', 'chalkbrood', 'multiGenus', 'other', 'megachile', 'osmiaMud'])(
    'flags the site when %s is over 30%', (id) => {
      const result = scoreSite(summary({
        presentGenera: genera(5),
        conditions: { ...summary().conditions, [id]: cond(31) },
      }))
      expect(result).toMatchObject({ score: 5, flagged: true, flags: [id] })
    })

  it('does not flag a value of exactly 30%', () => {
    const result = scoreSite(summary({
      presentGenera: genera(5),
      conditions: { ...summary().conditions, megachile: cond(3, 10), other: cond(30) },
    }))
    expect(result.flagged).toBe(false)
    expect(result.score).toBe(6) // 5 genera + the Other Occupants bonus at exactly 30%
  })

  it('adds a single bonus when any genus was observed only at this site', () => {
    const base = scoreSite(summary({ presentGenera: genera(3) })).score
    expect(scoreSite(summary({ presentGenera: genera(3), uniqueGenera: ['Genus 0'] })).score).toBe(base + 1)
    expect(scoreSite(summary({ presentGenera: genera(3), uniqueGenera: ['Genus 0', 'Genus 1'] })).score).toBe(base + 1)
  })

  it('gives no bonus for a condition at 0%, and a bonus for each one above 0% up to 30%', () => {
    const conditions = { ...summary().conditions, parasitism: cond(0), multiGenus: cond(6), other: cond(30) }
    expect(scoreSite(summary({ presentGenera: genera(2), conditions })).score).toBe(2 + 2)
  })

  it('gives the Emergence bonus whenever emergence is recorded, however high', () => {
    expect(scoreSite(summary({ presentGenera: genera(2), emergenceRecorded: true })).score).toBe(3)
  })

  it('gives Chalkbrood, Megachile (Eutricharaea) and Osmia (mud) no bonus when they are under 30%', () => {
    const conditions = { ...summary().conditions, chalkbrood: cond(11), megachile: cond(26), osmiaMud: cond(7) }
    expect(scoreSite(summary({ presentGenera: genera(2), conditions })).score).toBe(2)
  })

  it('treats a condition with no denominator as 0%', () => {
    const conditions = { ...summary().conditions, parasitism: { numerator: 0, denominator: 0 } }
    expect(scoreSite(summary({ presentGenera: genera(2), conditions }))).toMatchObject({ score: 2, flagged: false })
  })
})
