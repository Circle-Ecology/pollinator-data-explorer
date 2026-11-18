import { describe, expect, it } from 'vitest'
import {
  CHART_IDS,
  generateDashboardDataset,
} from '../../src/pipeline/generateDashboardDataset.js'

// US-33: genus richness is the number of distinct bee and wasp genera
// (General IDs) per cavity diameter and site.
describe('genus richness - US-33', () => {
  const tunnels = [
    { tunnelId: 'A', siteId: 'S1', tunnelDiameterInches: 0.25 },
    { tunnelId: 'B', siteId: 'S1', tunnelDiameterInches: 0.25 },
    { tunnelId: 'C', siteId: 'S1', tunnelDiameterInches: 0.375 },
  ]
  const nest = (tunnelId, occupantType, generalId) => ({
    tunnelId,
    siteId: 'S1',
    surveyDate: '2025-07-01',
    observationStatus: 'Complete',
    occupantType,
    generalId,
    plugComposition: null,
    wholeOrHole: null,
  })

  const { charts } = generateDashboardDataset(
    {
      sites: [{ siteId: 'S1', propertyName: 'Meadow' }],
      observations: [
        nest('A', 'Bee', 'Hylaeus'),
        nest('B', 'Bee', 'Hylaeus'), // same genus, same site and diameter
        nest('B', 'Wasp', 'Isodontia'),
        nest('C', 'Bee', 'Osmia (mud)'),
      ],
    },
    tunnels,
    '2026-11-16T00:00:00.000Z'
  )
  const rows = charts[CHART_IDS.richnessByDiameterSite][2025]
  const at = (diameter) => rows.find((row) => row.diameter === diameter)

  it('counts two cavities with the same genus at one site and diameter as one genus', () => {
    expect(at('0.25')).toMatchObject({ siteId: 'S1', Bee: 1, Wasp: 1 })
  })

  it('counts genera separately for each diameter', () => {
    expect(at('0.375')).toMatchObject({ siteId: 'S1', Bee: 1, Wasp: 0 })
  })
})
