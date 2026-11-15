// The 2025 "Other" occupants (spiders, ants, pill bugs, fungus) were tracked in a separate tally
// tracker, not in the sheet export (see data/otherTally2025.js, built by scripts/build-other-tally.js).
// CONFIRMED by Circle Ecology (Nov 2026): the tracker is a running count of how many cavities held an
// Other occupant at each visit, so the same occupant is counted at every visit while it is still
// there. The deck therefore uses each site's highest single-visit count for the season (spiders +
// ants + Other at that visit): 8, 42, 11, 15, 29 and 22 for sites 1, 3, 4, 5, 6 and 7, 127 in all.
// For a year the tracker covers, those figures replace the Other occupants recorded in the sheet
// (the deck's 127 is the tracker alone; the sheet holds 3 of them).
import { OTHER_TALLY_VISITS } from './data/otherTally2025.js'

export const OTHER_TALLY_TYPES = ['Spider', 'Ant(s)', 'Pill Bug', 'Other']

function visitCounts({ spiders, ants, other }) {
  return { Spider: spiders, 'Ant(s)': ants, 'Pill Bug': 0, Other: other, total: spiders + ants + other }
}

/**
 * Pure: summarize tracker visits per year and site.
 * `siteIdByBlock` maps a block number to its siteId. Returns Map(year -> Map(siteId -> { peak, visits })),
 * where `peak` is the counts at the site's highest single visit { Spider, 'Ant(s)', 'Pill Bug', Other, total }
 * and `visits` is every visit as { date, ...counts }. Visits for a block that has no site are ignored.
 */
export function summarizeOtherTally(visits = OTHER_TALLY_VISITS, siteIdByBlock) {
  const byYear = new Map()
  for (const visit of visits) {
    const siteId = siteIdByBlock.get(visit.block)
    if (siteId === undefined) continue
    const sites = byYear.get(String(visit.year)) ?? new Map()
    const entry = sites.get(siteId) ?? { peak: null, visits: [] }
    const counts = visitCounts(visit)
    entry.visits.push({ date: visit.date, ...counts })
    if (entry.peak === null || counts.total > entry.peak.total) entry.peak = counts
    sites.set(siteId, entry)
    byYear.set(String(visit.year), sites)
  }
  return byYear
}
