import { describe, expect, it } from 'vitest'
import { CHART_IDS, computeSealedNestRate, generateDashboardDataset } from '../../src/pipeline/generateDashboardDataset.js'

// Rules from Circle Ecology's data guidance (Nov 2026).
const sites = [{ siteId: 'S1', propertyName: 'Meadow' }]
const tunnels = ['A', 'B', 'C', 'D'].map(tunnelId => ({ tunnelId, siteId: 'S1', blockNumber: '1', tunnelDiameterInches: 0.25 }))
const o = (tunnelId, surveyDate, observationStatus, occupantType, generalId, wholeOrHole = null, plugComposition = null) =>
  ({ tunnelId, siteId: 'S1', surveyDate, observationStatus, occupantType, generalId, plugComposition, plugDepth: null, wholeOrHole })
const charts = observations => generateDashboardDataset({ sites, observations }, tunnels, 'now').charts

describe('2023 spiders recorded under General ID', () => {
  it('splits 2023 Other occupants into Spider (General ID "Spider") and Other', () => {
    const c = charts([o('A', '2023-07-01', 'Active', 'Other', 'Spider'), o('B', '2023-07-01', 'Active', 'Other', null)])
    expect(c[CHART_IDS.otherBySiteType][2023][0]).toMatchObject({ Spider: 1, Other: 1, total: 2 })
    expect(c[CHART_IDS.otherByPeriodType][2023].find(p => p.total > 0)).toMatchObject({ Spider: 1, Other: 1 })
  })

  it('leaves Other occupants with General ID "Unknown" out of the Other-type breakdowns but not the occupant chart', () => {
    const c = charts([o('A', '2026-07-01', 'Active', 'Other', 'Unknown'), o('B', '2026-07-01', 'Active', 'Spider', 'Spider')])
    expect(c[CHART_IDS.occupantsByYearType][2026][0]).toMatchObject({ Other: 2 })
    expect(c[CHART_IDS.otherBySiteType][2026][0]).toMatchObject({ Spider: 1, Other: 0, total: 1 })
  })
})

describe('multi-genus cavity use', () => {
  it('counts a cavity with two distinct General IDs on any observation, not only the first of each occupant', () => {
    const c = charts([
      o('A', '2025-06-01', 'Active', 'Bee', 'Hylaeus'),
      o('A', '2025-06-15', 'Active', 'Bee', 'Anthidium'), // same occupant run, a second ID
      o('B', '2025-06-01', 'Active', 'Bee', 'Hylaeus'),
    ])
    expect(c[CHART_IDS.multiGenusCavitiesBySite][2025][0]).toMatchObject({ multiGenus: 1, occupied: 2 })
    // 1 of the 2 cavities that have a General ID.
    expect(c[CHART_IDS.scorecardAllSites][2025][0].conditions.multiGenus).toMatchObject({ numerator: 1, denominator: 2 })
  })

  it('leaves cavities with no General ID out of the scorecard denominator', () => {
    const c = charts([
      o('A', '2025-06-01', 'Active', 'Bee', 'Hylaeus'), o('A', '2025-06-15', 'Active', 'Bee', 'Anthidium'),
      o('B', '2025-06-01', 'Active', 'Bee', null), o('C', '2025-06-01', 'Empty', null, null),
    ])
    expect(c[CHART_IDS.scorecardAllSites][2025][0].conditions.multiGenus).toMatchObject({ numerator: 1, denominator: 1 })
  })
})

describe('scorecard Megachile (Eutricharaea) share', () => {
  it('drops nests ever recorded as Parasitism or Chalkbrood from the numerator but keeps them in the denominator', () => {
    const e = 'Megachile (Eutricharaea)'
    const c = charts([
      o('A', '2025-06-01', 'Complete', 'Bee', e, 'Sealed'),
      o('B', '2025-06-01', 'Complete', 'Bee', e, 'Sealed'), o('B', '2025-06-15', 'Reopened', 'Bee', e, 'Parasitism'),
      o('C', '2025-06-01', 'Complete', 'Bee', e, 'Sealed'), o('C', '2025-06-15', 'Reopened', 'Bee', e, 'Chalkbrood Characteristics'),
      o('D', '2025-06-01', 'Complete', 'Bee', 'Hylaeus', 'Sealed'),
    ])
    expect(c[CHART_IDS.scorecardAllSites][2025][0].conditions.megachile).toMatchObject({ numerator: 1, denominator: 4, rate: 25 })
  })
})

describe('richness', () => {
  it('counts distinct General IDs on any Bee or Wasp observation, Unknown and Other included', () => {
    const c = charts([
      o('A', '2025-06-01', 'Active', 'Bee', 'Hylaeus'), o('A', '2025-06-15', 'Active', 'Bee', 'Anthidium'),
      o('B', '2025-06-01', 'Active', 'Bee', 'Unknown'), o('C', '2025-06-01', 'Active', 'Bee', 'Other'),
      o('D', '2025-06-01', 'Active', 'Wasp', 'Isodontia'),
    ])
    expect(c[CHART_IDS.richnessByDiameterSite][2025]).toEqual([
      { diameter: '0.25', siteId: 'S1', propertyName: 'Meadow', Bee: 4, Wasp: 1 },
    ])
  })
})

describe('sealed nest rate rounding', () => {
  it('rounds .5 up to the nearest whole percent', () => {
    // 9 of 200 cavities = 4.5%, 1 of 8 = 12.5%.
    const cavity = (group, sealed) => ({
      group, observations: sealed ? [o('X', '2025-06-01', 'Complete', 'Wasp', 'Isodontia', 'Sealed')] : [o('X', '2025-06-01', 'Empty', null, null)],
    })
    const cavities = [...Array.from({ length: 9 }, () => cavity('big', true)), ...Array.from({ length: 191 }, () => cavity('big', false)),
      cavity('small', true), ...Array.from({ length: 7 }, () => cavity('small', false))]
    const rates = computeSealedNestRate(cavities, 2025)
    expect(rates.big.Wasp.rate).toBe(5)
    expect(rates.small.Wasp.rate).toBe(13)
  })
})
