// US-33: rows for a stacked chart split into side-by-side panels (facets),
// e.g. genus richness with one panel per cavity diameter and one bar per site.

// Circle Ecology's site numbers (1, 3, 4...), as used in their deck. The
// pipeline records them with the site scorecards, so read them from there.
export function getSiteNumbers(data) {
  const numbers = new Map()
  const scorecards = data?.charts?.['scorecard-all-sites'] ?? {}

  for (const rows of Object.values(scorecards)) {
    for (const { siteId, siteNumber } of rows ?? []) {
      if (siteId && siteNumber != null && !numbers.has(siteId)) {
        numbers.set(siteId, String(siteNumber))
      }
    }
  }

  return numbers
}

// One row per bar. `category` is the full site name (for the data table);
// `label` is the short site number shown under the bar, falling back to the
// full name when a site has no number.
export function buildFacetedRows(chart, chartData, { year, siteNumbers }) {
  const sourceRows = chartData?.[String(year)] ?? []

  const rows = sourceRows.map((row) => {
    const counts = {}

    for (const series of chart.series) {
      const value = Number(row[series.key])
      counts[series.key] = Number.isFinite(value) ? value : 0
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    const percents = {}

    for (const series of chart.series) {
      percents[series.key] =
        total > 0 ? Math.round((counts[series.key] / total) * 1000) / 10 : 0
    }

    const category = String(row.propertyName ?? row.siteId ?? 'Not recorded')
    const number = siteNumbers?.get(row.siteId)

    return {
      facet: String(row[chart.facetKey]),
      category,
      label: number ?? category,
      counts,
      percents,
      total,
    }
  })

  // Within each panel, sites in Circle Ecology's number order (1, 3, 4...),
  // as in their deck; sites without a number keep their order, after them.
  const facetOrder = getFacets(rows)
  const siteRank = (row) => {
    const number = Number(row.label)
    return Number.isFinite(number) ? number : Infinity
  }
  return [...rows].sort(
    (a, b) =>
      facetOrder.indexOf(a.facet) - facetOrder.indexOf(b.facet) ||
      siteRank(a) - siteRank(b)
  )
}

// Facets in the order their rows appear (the pipeline sorts by diameter).
export function getFacets(rows) {
  return [...new Set(rows.map((row) => row.facet))]
}

// One y-axis for every panel: from 0 to the tallest bar in any panel, so
// heights can be compared across panels.
export function getSharedMax(rows) {
  return Math.max(0, ...rows.map((row) => row.total))
}

// That axis rounded up to four whole-number steps (e.g. 11 -> 0, 3, 6, 9, 12).
export function getSharedAxis(rows) {
  const step = Math.max(1, Math.ceil(getSharedMax(rows) / 4))
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  return { domain: [0, ticks.at(-1)], ticks }
}
