import { describe, expect, it } from 'vitest'
import { computeSealedNestRate, countSealedNests } from '../../src/pipeline/generateDashboardDataset.js'
import { obs } from '../fixtures/cavityObservations.js'

const sealed = (type, date, status = 'Complete') => obs(status, date, { occupantType: type, wholeOrHole: 'Sealed' })
const sealedBee = date => sealed('Bee', date)
const cavity = (group, ...observations) => ({ group, observations })

describe('US-28 countSealedNests', () => {
  it('counts one nest for a run of consecutive Sealed records', () => {
    expect(countSealedNests([sealedBee('2025-06-01'), sealedBee('2025-07-01'), sealedBee('2025-08-01')], 'Bee')).toBe(1)
  })

  it('counts a plug recorded Sealed while status is Active as a sealed nest', () => {
    expect(countSealedNests([sealed('Bee', '2025-07-01', 'Active')], 'Bee')).toBe(1)
  })

  it('counts a second nest when a Sealed nest is reopened and sealed again', () => {
    expect(countSealedNests([
      sealedBee('2025-06-01'),
      obs('Reopened', '2025-07-01', { occupantType: 'Bee', wholeOrHole: 'Emergence' }),
      sealedBee('2025-08-01'),
    ], 'Bee')).toBe(2)
  })

  it('does not count Not Sealed, Emergence, Parasitism or Chalkbrood records', () => {
    expect(countSealedNests(['Not Sealed', 'Emergence', 'Parasitism', 'Chalkbrood Characteristics']
      .map((value, i) => obs('Reopened', `2025-0${i + 5}-01`, { occupantType: 'Bee', wholeOrHole: value })), 'Bee')).toBe(0)
  })

  it('counts only the requested occupant type', () => {
    expect(countSealedNests([sealedBee('2025-06-01')], 'Bee')).toBe(1)
    expect(countSealedNests([sealedBee('2025-06-01')], 'Wasp')).toBe(0)
    expect(countSealedNests([sealed('Wasp', '2025-06-01')], 'Wasp')).toBe(1)
    expect(countSealedNests([sealed('Spider', '2025-06-01')], 'Bee')).toBe(0)
  })

  it('counts a nest once even if it was Not Sealed before it was sealed', () => {
    expect(countSealedNests([
      obs('Active', '2025-06-01', { occupantType: 'Bee', wholeOrHole: 'Not Sealed' }),
      sealedBee('2025-07-01'),
    ], 'Bee')).toBe(1)
  })

  it('counts a nest that was never sealed as zero', () => {
    expect(countSealedNests([obs('Active', '2025-06-01', { occupantType: 'Bee', wholeOrHole: 'Not Sealed' })], 'Bee')).toBe(0)
  })

  it('counts a second nest when the Plug Composition changes between sealed records', () => {
    expect(countSealedNests([
      obs('Complete', '2025-06-01', { occupantType: 'Bee', wholeOrHole: 'Sealed', plugComposition: 'mud' }),
      obs('Complete', '2025-07-01', { occupantType: 'Bee', wholeOrHole: 'Sealed', plugComposition: 'leaf pieces' }),
    ], 'Bee')).toBe(2)
  })

  it('does not depend on the order observations are given in', () => {
    expect(countSealedNests([sealedBee('2025-08-01'), obs('Empty', '2025-07-01'), sealedBee('2025-06-01')], 'Bee')).toBe(2)
  })
})

describe('US-28 computeSealedNestRate', () => {
  it('reports Bee and Wasp rates separately against the same available cavities', () => {
    const result = computeSealedNestRate([
      cavity('Log', sealedBee('2025-07-01')),
      cavity('Log', sealed('Wasp', '2025-07-01')),
      cavity('Log', obs('Empty', '2025-07-01')),
      cavity('Log', obs('Empty', '2025-07-01')),
    ], 2025)
    expect(result.Log).toEqual({ available: 4, Bee: { sealed: 1, rate: 25 }, Wasp: { sealed: 1, rate: 25 } })
  })

  it('ignores occupant types other than Bee and Wasp', () => {
    const result = computeSealedNestRate([cavity('Log', sealed('Spider', '2025-07-01'))], 2025)
    expect(result.Log).toEqual({ available: 1, Bee: { sealed: 0, rate: 0 }, Wasp: { sealed: 0, rate: 0 } })
  })

  it('counts every nest, so a cavity can contribute more than one', () => {
    const result = computeSealedNestRate([
      cavity('Log', sealedBee('2025-06-01'), obs('Empty', '2025-07-01'), sealedBee('2025-08-01')),
      cavity('Log', obs('Empty', '2025-07-01')),
    ], 2025)
    expect(result.Log.Bee).toEqual({ sealed: 2, rate: 100 })
  })

  it('excludes retired cavities from the denominator', () => {
    const result = computeSealedNestRate([
      cavity('Log', sealedBee('2025-07-01')),
      cavity('Log', obs('Empty', '2025-06-01'), obs('Retired hole', '2025-07-01')),
    ], 2025)
    expect(result.Log.available).toBe(1)
    expect(result.Log.Bee).toEqual({ sealed: 1, rate: 100 })
  })

  it('reports 0% for a group with available cavities but no sealed nests', () => {
    const result = computeSealedNestRate([
      cavity('Snag', obs('Empty', '2025-07-01')),
      cavity('Snag', obs('Active', '2025-07-01', { occupantType: 'Bee', wholeOrHole: 'Not Sealed' })),
    ], 2025)
    expect(result.Snag).toEqual({ available: 2, Bee: { sealed: 0, rate: 0 }, Wasp: { sealed: 0, rate: 0 } })
  })

  it('only considers observations from the requested year', () => {
    const result = computeSealedNestRate([cavity('Log', sealedBee('2024-07-01'), obs('Empty', '2025-07-01'))], 2025)
    expect(result.Log).toEqual({ available: 1, Bee: { sealed: 0, rate: 0 }, Wasp: { sealed: 0, rate: 0 } })
  })

  it('omits a group with no cavities observed that year', () => {
    expect(computeSealedNestRate([cavity('Snag', obs('Empty', '2024-07-01'))], 2025)).toEqual({})
  })
})
