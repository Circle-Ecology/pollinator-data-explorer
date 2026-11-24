// US-32: rows for the Occupants by Genus (General ID) charts. The pipeline
// writes one row per occupant type and General ID (occupants-by-type-genus)
// and one row per General ID with a count per occupant type
// (occupants-by-genus); these put them in display order and add the shares.

import { buildChartRows } from './buildChartRows'

export function genusLabel(generalId) {
  const name = String(generalId ?? '').trim()
  return name === '' || name.toLowerCase() === 'unknown' ? 'Unknown genus' : name
}

// One-decimal percentages of `total` that sum to exactly 100 (largest
// remainder: round every share down, then give the spare tenths to the
// shares that lost the most). Plain rounding can give 99.9 or 100.1.
export function largestRemainderPercents(counts, total) {
  if (!(total > 0)) return counts.map(() => 0)

  const tenths = counts.map((count) => (count / total) * 1000)
  const floors = tenths.map(Math.floor)
  let spare = 1000 - floors.reduce((sum, value) => sum + value, 0)

  const byRemainder = tenths
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of byRemainder) {
    if (spare <= 0) break
    floors[index] += 1
    spare -= 1
  }
  return floors.map((value) => value / 10)
}

const byCountThenName = (a, b) => b.total - a.total || a.category.localeCompare(b.category)

// Occupants by Occupant Type and General ID: one bar per type and genus,
// grouped by type in the order of `chart.facetSeries` (Bee, Wasp, Unknown,
// Other), biggest first within each. Shares are of that type's occupants.
export function buildTypeGenusRows(chart, chartData, { year }) {
  const sourceRows = chartData?.[String(year)] ?? []
  const [series] = chart.series

  return chart.facetSeries.flatMap(({ key: type }) => {
    const typeRows = sourceRows
      .filter((row) => row.occupantType === type)
      .map((row) => ({ category: genusLabel(row.generalId), total: Number(row.occupants) || 0 }))
      .sort(byCountThenName)
    const typeTotal = typeRows.reduce((sum, row) => sum + row.total, 0)
    const percents = largestRemainderPercents(typeRows.map((row) => row.total), typeTotal)

    return typeRows.map((row, index) => ({
      facet: type,
      category: row.category,
      counts: { [series.key]: row.total },
      percents: { [series.key]: percents[index] },
      total: row.total,
    }))
  })
}

// Occupants by General ID: one bar per genus, split by occupant type,
// ranked by count. Shares are of every occupant that year (percentBase:
// 'chart' in the config).
export function buildGenusRows(chart, chartData, { years, year }) {
  return buildChartRows(chart, chartData, { years, year })
    .map((row) => ({ ...row, category: genusLabel(row.category) }))
    .sort(byCountThenName)
}
