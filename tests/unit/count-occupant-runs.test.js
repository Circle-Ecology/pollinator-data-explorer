import { describe, expect, it } from 'vitest'
import { countOccupantRuns, listOccupantRuns, NEST_RULES, RUN_RESEAL_STATUSES, countNestStatuses, countPlugDepths } from '../../src/pipeline/generateDashboardDataset.js'
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

  it('starts a new run when a cavity moves from Reopened to Complete', () => {
    expect(countOccupantRuns([
      obs('Complete', '2025-06-01', { plugComposition: 'mud' }),
      obs('Reopened', '2025-07-01', { plugComposition: 'mud' }),
      obs('Complete', '2025-08-01', { plugComposition: 'mud' }),
    ])).toBe(2)
  })
})

describe('US-28 listOccupantRuns', () => {
  const typed = (status, date, occupantType, extra = {}) => obs(status, date, { occupantType, ...extra })

  it('gives each run the first occupant type recorded in it', () => {
    expect(listOccupantRuns([
      typed('Active', '2025-06-01', null),
      typed('Active', '2025-07-01', 'Bee'),
      typed('Empty', '2025-08-01', null),
      typed('Complete', '2025-09-01', 'Wasp'),
    ])).toEqual([{ occupantType: 'Bee', generalId: null }, { occupantType: 'Wasp', generalId: null }])
  })

  it('reports a run with no recorded type as null', () => {
    expect(listOccupantRuns([typed('Complete', '2025-06-01', null)])).toEqual([{ occupantType: null, generalId: null }])
  })

  it('is empty for a cavity that is never occupied', () => {
    expect(listOccupantRuns([obs('Empty', '2025-06-01')])).toEqual([])
  })

  it('does not depend on the order observations are given in', () => {
    expect(listOccupantRuns([
      typed('Complete', '2025-08-01', 'Wasp'),
      typed('Empty', '2025-07-01', null),
      typed('Complete', '2025-06-01', 'Bee'),
    ])).toEqual([{ occupantType: 'Bee', generalId: null }, { occupantType: 'Wasp', generalId: null }])
  })

  it('gives each run the first General ID recorded in it', () => {
    expect(listOccupantRuns([
      obs('Active', '2025-06-01', { occupantType: 'Bee' }),
      obs('Complete', '2025-07-01', { occupantType: 'Bee', generalId: 'Hylaeus' }),
      obs('Complete', '2025-08-01', { occupantType: 'Bee', generalId: 'Anthidium' }),
    ])).toEqual([{ occupantType: 'Bee', generalId: 'Hylaeus' }])
  })
})

describe('US-28 reseal rule for genus profile nests', () => {
  const reopenedThen = status => [
    obs('Complete', '2025-06-01', { plugComposition: 'mud' }),
    obs('Reopened', '2025-07-01', { plugComposition: 'mud' }),
    obs(status, '2025-08-01', { plugComposition: 'mud' }),
  ]

  it('occupant runs start a new run after Reopened -> Active', () => {
    expect(RUN_RESEAL_STATUSES).toEqual(['Active', 'Complete'])
    expect(countOccupantRuns(reopenedThen('Active'))).toBe(2)
  })

  it('profile nests treat Reopened -> Active (not sealed) as the same nest, but a sealed Active or Complete as a new one', () => {
    const sealed = status => reopenedThen(status).map((o, i) => (i === 2 ? { ...o, wholeOrHole: 'Sealed' } : o))
    expect(listOccupantRuns(reopenedThen('Active'), NEST_RULES)).toHaveLength(1)
    expect(listOccupantRuns(reopenedThen('Complete'), NEST_RULES)).toHaveLength(1)
    expect(listOccupantRuns(sealed('Active'), NEST_RULES)).toHaveLength(2)
    expect(listOccupantRuns(sealed('Complete'), NEST_RULES)).toHaveLength(2)
  })

  it('a nest only starts a new nest on a plug change to another nesting material', () => {
    const plugs = values => values.map((plugComposition, i) =>
      obs('Active', `2025-0${i + 6}-01`, { plugComposition }))
    // 'occupant present' and 'empty' are not nesting materials: no new nest, though a new occupant run.
    expect(listOccupantRuns(plugs(['mud', 'occupant present', 'mud']), NEST_RULES)).toHaveLength(1)
    expect(listOccupantRuns(plugs(['mud', 'occupant present', 'mud']))).toHaveLength(3)
    expect(listOccupantRuns(plugs(['mud', 'grass']), NEST_RULES)).toHaveLength(2)
    // A plug first recorded after an observation without one is not a change.
    expect(listOccupantRuns(plugs([null, 'mud']), NEST_RULES)).toHaveLength(1)
  })
})

describe('US-28 countNestStatuses', () => {
  const nest = [
    obs('Active', '2025-06-01', { plugComposition: 'mud', plugDepth: '1 inch', occupantType: 'Bee', wholeOrHole: 'Not Sealed' }),
    obs('Complete', '2025-07-01', { plugComposition: 'mud', plugDepth: 'flush', occupantType: 'Bee', wholeOrHole: 'Sealed' }),
    obs('Reopened', '2025-08-01', { plugComposition: 'mud', occupantType: 'Bee', wholeOrHole: 'Emergence' }),
  ]

  it('counts one nest under every condition it has a record for', () => {
    expect(countNestStatuses([nest], 'Bee')).toEqual({
      occupantType: 'Bee', Active: 1, Complete: 1, Emerged: 1, Parasitized: 0, Chalkbrood: 0, sealed: 1, parasitizedRate: 0,
    })
  })

  it('ignores the other occupant type and leaves the rate null when nothing is sealed', () => {
    expect(countNestStatuses([nest], 'Wasp')).toMatchObject({ Active: 0, sealed: 0, parasitizedRate: null })
  })
})

describe('US-28 countPlugDepths', () => {
  const cavity = depths => depths.map(([status, date, plugDepth, occupantType = 'Bee']) =>
    obs(status, date, { plugDepth, occupantType }))

  it('counts each cavity once, at the last depth recorded on an occupied Bee, Wasp or Unknown observation', () => {
    const result = countPlugDepths([
      cavity([['Active', '2025-06-01', '1.1 inches'], ['Complete', '2025-07-01', 'flush']]),
      cavity([['Active', '2025-06-01', '1 inch'], ['Empty', '2025-08-01', null, null]]),
    ])
    expect(result.total).toBe(2)
    expect(result.rows.find(r => r.level === 'flush').nests).toBe(1)
    expect(result.rows.find(r => r.level === '1 inch').nests).toBe(1)
    expect(result.rows.find(r => r.level === '1.1 inches').nests).toBe(0)
  })

  it('leaves out Other occupants and cavities with no depth, and reports unrecognized depths', () => {
    const result = countPlugDepths([
      cavity([['Active', '2025-06-01', 'flush', 'Other']]),
      cavity([['Active', '2025-06-01', null]]),
      cavity([['Active', '2025-06-01', '3 inches']]),
    ])
    expect(result).toMatchObject({ total: 0, unrecognized: 1 })
  })
})
