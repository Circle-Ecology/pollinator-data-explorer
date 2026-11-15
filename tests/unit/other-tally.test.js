import { describe, expect, it } from 'vitest'
import { OTHER_TALLY_VISITS } from '../../src/pipeline/data/otherTally2025.js'
import { summarizeOtherTally } from '../../src/pipeline/otherTally.js'
import { CHART_IDS, generateDashboardDataset } from '../../src/pipeline/generateDashboardDataset.js'
import { parseTallyTracker } from '../../scripts/build-other-tally.js'

describe('2025 Other tally tracker', () => {
  it("parses the tracker's side-by-side site tables", () => {
    const csv = [
      'Total holes,427,,,,,Total holes,352,,,,',
      'Block Number,Date,"Other (fungus, pill bugs)",Spiders,Ants,,Block Number,Date,"Other (fungus, pill bugs)",Spiders,Ants',
      '3,4/14/2025,0,1,1,,4,9/4/2025,2,3,0',
      ',,,,,,,,,,',
    ].join('\n')
    expect(parseTallyTracker(csv)).toEqual([
      { year: 2025, block: '3', date: '2025-04-14', other: 0, spiders: 1, ants: 1 },
      { year: 2025, block: '4', date: '2025-09-04', other: 2, spiders: 3, ants: 0 },
    ])
  })

  it("uses each site's highest single-visit count: the deck's 8, 42, 11, 15, 29 and 22 (127)", () => {
    const blocks = new Map(['1', '3', '4', '5', '6', '7'].map(block => [block, `site-${block}`]))
    const sites = summarizeOtherTally(OTHER_TALLY_VISITS, blocks).get('2025')
    expect(['1', '3', '4', '5', '6', '7'].map(block => sites.get(`site-${block}`).peak.total)).toEqual([8, 42, 11, 15, 29, 22])
    // Site 3 peaked at 42 on 4 September: 3 Other + 39 spiders.
    expect(sites.get('site-3').peak).toMatchObject({ Spider: 39, Other: 3, 'Ant(s)': 0, total: 42 })
  })

  it('ignores visits to a block that has no site', () => {
    expect(summarizeOtherTally(OTHER_TALLY_VISITS, new Map()).size).toBe(0)
  })
})

describe('2025 Other occupants from the tracker in the dashboard figures', () => {
  const sites = [{ siteId: 'S1', propertyName: 'Meadow' }]
  const tunnels = [{ tunnelId: 'A', siteId: 'S1', blockNumber: '1' }, { tunnelId: 'B', siteId: 'S1', blockNumber: '1' }]
  const o = (tunnelId, surveyDate, observationStatus, occupantType, generalId, wholeOrHole = null) =>
    ({ tunnelId, siteId: 'S1', surveyDate, observationStatus, occupantType, generalId, plugComposition: null, plugDepth: null, wholeOrHole })
  const observations = [
    o('A', '2025-08-07', 'Complete', 'Bee', 'Hylaeus', 'Sealed'),
    // One spider recorded in the sheet: the tracker replaces it rather than adding to it.
    o('B', '2025-08-07', 'Active', 'Spider', 'Spider'),
    o('A', '2026-08-07', 'Complete', 'Bee', 'Hylaeus', 'Sealed'),
  ]
  const tracker = [
    { year: 2025, block: '1', date: '2025-08-07', other: 1, spiders: 2, ants: 0 },
    { year: 2025, block: '1', date: '2025-09-04', other: 2, spiders: 5, ants: 1 },
    { year: 2025, block: '1', date: '2025-09-18', other: 0, spiders: 1, ants: 0 },
  ]
  const run = otherTallyVisits => generateDashboardDataset({ sites, observations }, tunnels, 'now', { otherTallyVisits }).charts

  it('takes the tracked year\'s Other occupants from the tracker peak, not the sheet', () => {
    const charts = run(tracker)
    expect(charts[CHART_IDS.occupantsByYearType][2025][0]).toMatchObject({ Bee: 1, Other: 8, total: 9 })
    expect(charts[CHART_IDS.occupantsBySite][2025]).toEqual([{ siteId: 'S1', propertyName: 'Meadow', total: 9 }])
    expect(charts[CHART_IDS.otherBySiteType][2025][0]).toMatchObject({ Spider: 5, 'Ant(s)': 1, Other: 2, total: 8 })
    expect(charts[CHART_IDS.occupantsByGenus][2025].find(r => r.generalId === 'Other')).toMatchObject({ Other: 8, total: 8 })
    // Years the tracker does not cover are untouched.
    expect(charts[CHART_IDS.occupantsByYearType][2026][0]).toMatchObject({ Other: 0, total: 1 })
  })

  it('counts a visit toward its two-week period', () => {
    const periods = run(tracker)[CHART_IDS.otherByPeriodType][2025]
    expect(periods.filter(p => p.total > 0).map(p => [p.start, p.Spider, p.total])).toEqual([
      ['2025-07-29', 2, 3], ['2025-08-26', 5, 8], ['2025-09-09', 1, 1],
    ])
  })

  it('counts the tracker in the scorecard: Other Occupants over 30% flags a site, and is in the denominator', () => {
    const entry = run(tracker)[CHART_IDS.scorecardAllSites][2025][0]
    expect(entry.conditions.other).toMatchObject({ numerator: 8, denominator: 9, rate: 89, state: 'flag' })
    expect(entry.flagged).toBe(true)
  })

  it('leaves the sheet alone when no tracker is given', () => {
    const charts = run([])
    expect(charts[CHART_IDS.occupantsByYearType][2025][0]).toMatchObject({ Bee: 1, Other: 1, total: 2 })
  })
})
