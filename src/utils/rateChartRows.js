// US-33: rows for sealed nest rate charts. Each dashboard.json row is one
// level (e.g. "Log") with the cavities available at that level and, per
// occupant type, the sealed nests and the rate (sealed / available, as a
// whole-number percentage). Only levels that existed that year are present.

// Puts rows in the chart's categoryOrder (e.g. compass order for directions);
// levels not listed keep their order, after the listed ones.
export function sortByCategoryOrder(rows, order) {
  if (!order) return rows
  const rank = (row) => {
    const index = order.indexOf(row.category)
    return index === -1 ? order.length : index
  }
  return [...rows].sort((a, b) => rank(a) - rank(b))
}

export function buildRateRows(chart, chartData, { year }) {
  const sourceRows = chartData?.[String(year)] ?? []

  const rows = sourceRows.map((row) => {
    const values = {}

    for (const series of chart.series) {
      const entry = row[series.key] ?? {}
      values[series.key] = {
        sealed: Number(entry.sealed) || 0,
        rate: Number(entry.rate) || 0,
      }
    }

    return {
      category: String(row.group ?? 'Not recorded'),
      available: Number(row.available) || 0,
      values,
    }
  })

  return sortByCategoryOrder(rows, chart.categoryOrder)
}
