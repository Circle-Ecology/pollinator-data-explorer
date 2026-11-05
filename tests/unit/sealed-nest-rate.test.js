import { describe, expect, it } from 'vitest'
import { computeSealedNestRate } from '../../src/pipeline/generateDashboardDataset.js'
import { obs } from '../fixtures/cavityObservations.js'

const sealedBee = date => obs('Active', date, { occupantType: 'Bee', wholeOrHole: 'Sealed' })
const cavity = (level, ...observations) => ({ level, observations })

describe('US-28 computeSealedNestRate', () => {
  it('counts a plug recorded Sealed while status is Active as a sealed nest', () => {
    const result = computeSealedNestRate([cavity('Log', sealedBee('2025-07-01'))], 2025)
    expect(result.Log).toEqual({ sealed: 1, available: 1, rate: 100 })
  })

  it('counts sealed Wasp nests but not other occupant types', () => {
    const result = computeSealedNestRate([
      cavity('Log', obs('Complete', '2025-07-01', { occupantType: 'Wasp', wholeOrHole: 'Sealed' })),
      cavity('Log', obs('Complete', '2025-07-01', { occupantType: 'Spider', wholeOrHole: 'Sealed' })),
    ], 2025)
    expect(result.Log).toEqual({ sealed: 1, available: 2, rate: 50 })
  })

  it('includes Empty cavities in the denominator', () => {
    const result = computeSealedNestRate([
      cavity('Log', sealedBee('2025-07-01')),
      cavity('Log', obs('Empty', '2025-07-01')),
    ], 2025)
    expect(result.Log).toEqual({ sealed: 1, available: 2, rate: 50 })
  })

  it('excludes retired cavities from the denominator', () => {
    const result = computeSealedNestRate([
      cavity('Log', sealedBee('2025-07-01')),
      cavity('Log', obs('Empty', '2025-06-01'), obs('Retired hole', '2025-07-01')),
    ], 2025)
    expect(result.Log).toEqual({ sealed: 1, available: 1, rate: 100 })
  })

  it('reports 0% for a level with available cavities but no sealed nests', () => {
    const result = computeSealedNestRate([
      cavity('Snag', obs('Empty', '2025-07-01')),
      cavity('Snag', obs('Active', '2025-07-01', { occupantType: 'Bee', wholeOrHole: 'Not Sealed' })),
    ], 2025)
    expect(result.Snag).toEqual({ sealed: 0, available: 2, rate: 0 })
  })

  it('only considers observations from the requested year', () => {
    const result = computeSealedNestRate([cavity('Log', sealedBee('2024-07-01'), obs('Empty', '2025-07-01'))], 2025)
    expect(result.Log).toEqual({ sealed: 0, available: 1, rate: 0 })
  })
})
