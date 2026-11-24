// The 2025 "Other" occupants (spiders, ants, pill bugs, fungus) were tracked in a separate tally
// tracker, not in the sheet export (see data/otherTally2025.js, built by scripts/build-other-tally.js).
// CONFIRMED by Circle Ecology (Nov 2026): the tracker is a running count of how many cavities held an
// Other occupant at each visit, so the same occupant is counted at every visit while it is still
// there. The deck (report_v04) therefore sums each Other type's own highest count at the site over the
// season (most spiders at any one visit + most ants at any one visit + most Other at any one visit):
// 11, 43, 14, 26, 32 and 27 for sites 1, 3, 4, 5, 6 and 7, 153 in all. (report_v03 took the highest
// single-visit total instead, which gave 127.) For a year the tracker covers, those figures replace the
// Other occupants recorded in the sheet (the deck's 153 is the tracker alone).
import { OTHER_TALLY_VISITS } from './data/otherTally2025.js'

export const OTHER_TALLY_TYPES = ['Spider', 'Ant(s)', 'Pill Bug', 'Other']

function visitCounts({ spiders, ants, other }) {
  return { Spider: spiders, 'Ant(s)': ants, 'Pill Bug': 0, Other: other, total: spiders + ants + other }
}

// The season peak: each type's own highest count over the visits, and their sum.
function peakCounts(visits) {
  const peak = { Spider: 0, 'Ant(s)': 0, 'Pill Bug': 0, Other: 0 }
  for (const type of Object.keys(peak)) peak[type] = Math.max(...visits.map(visit => visit[type]))
  return { ...peak, total: peak.Spider + peak['Ant(s)'] + peak['Pill Bug'] + peak.Other }
}

/**
 * Pure: summarize tracker visits per year and site.
 * `siteIdByBlock` maps a block number to its siteId. Returns Map(year -> Map(siteId -> { peak, visits })),
 * where `peak` is each type's highest count at any one visit, and their sum { Spider, 'Ant(s)', 'Pill Bug', Other, total }
 * and `visits` is every visit as { date, ...counts }. Visits for a block that has no site are ignored.
 */
export function summarizeOtherTally(visits = OTHER_TALLY_VISITS, siteIdByBlock) {
  const byYear = new Map()
  for (const visit of visits) {
    const siteId = siteIdByBlock.get(visit.block)
    if (siteId === undefined) continue
    const sites = byYear.get(String(visit.year)) ?? new Map()
    const entry = sites.get(siteId) ?? { peak: null, visits: [] }
    entry.visits.push({ date: visit.date, ...visitCounts(visit) })
    entry.peak = peakCounts(entry.visits)
    sites.set(siteId, entry)
    byYear.set(String(visit.year), sites)
  }
  return byYear
}
