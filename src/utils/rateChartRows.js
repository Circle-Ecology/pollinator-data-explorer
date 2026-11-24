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

// US-34: rows for a one-rate-per-site chart (e.g. Emergence Rate by Site), in
// the same shape as buildRateRows so GroupedBarChart and RateDataTable draw
// it. Each dashboard.json row has the rate and the counts behind it, named by
// `chart.rateFields` ({ numerator, denominator }); `label` is the short site
// number shown under the bar, `category` the full site name for the table.
// US-32: a row without a `rate` gets one (whole-number percent), and a row
// without a `siteNumber` takes it from `siteNumbers` (getSiteNumbers), so
// bars can be labelled and ordered by Circle Ecology's site numbers.
export function buildSiteRateRows(chart, chartData, { year, siteNumbers = new Map() }) {
  const sourceRows = chartData?.[String(year)] ?? []
  const [series] = chart.series
  const { numerator, denominator } = chart.rateFields

  const entries = sourceRows.map((row, index) => {
    const name = String(row.propertyName ?? row.siteId ?? 'Not recorded')
    const siteNumber = row.siteNumber ?? siteNumbers.get(row.siteId) ?? null
    const count = Number(row[numerator]) || 0
    const available = Number(row[denominator]) || 0
    const rate = row.rate ?? (available > 0 ? Math.round((count / available) * 100) : 0)
    return {
      index,
      // Site number order, as in the deck; unnumbered sites follow, in data order.
      rank: siteNumber == null ? Infinity : Number(siteNumber),
      row: {
        category: name,
        label: siteNumber != null ? `Site ${siteNumber}` : name,
        available,
        values: { [series.key]: { sealed: count, rate: Number(rate) || 0 } },
      },
    }
  })

  return entries
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.row)
}

// Tooltip text for one bar, e.g. "15% (155 of 1,048)". `item` is the Recharts
// tooltip entry: its dataKey is the series key (e.g. "Bee") and its payload
// holds the bar's sealed count and available holes (see GroupedBarChart).
export function formatRateTooltip(value, item) {
  const sealed = item?.payload?.[`${item.dataKey}Sealed`] ?? 0
  const available = item?.payload?.available ?? 0
  return `${value}% (${sealed.toLocaleString()} of ${available.toLocaleString()})`
}
