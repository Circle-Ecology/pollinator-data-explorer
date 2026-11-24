// US-34: rows for grouped count charts, where dashboard.json has one row per
// series (e.g. { occupantType: 'Bee', Active: 3, Complete: 22, ... }) and the
// chart needs one group of bars per category (Active, Complete, ...) with a
// bar per series. `chart.seriesKey` names the field that says which series a
// source row is; `chart.categories` lists the fields to draw, in order.

function sourceRowFor(chart, chartData, year, seriesKey) {
  const rows = chartData?.[String(year)] ?? []
  return rows.find((row) => row[chart.seriesKey] === seriesKey) ?? null
}

export function buildGroupedCountRows(chart, chartData, { year }) {
  if (!(chartData?.[String(year)] ?? []).length) return []

  return chart.categories.map((category) => {
    const values = {}

    for (const series of chart.series) {
      const row = sourceRowFor(chart, chartData, year, series.key)
      values[series.key] = { count: Number(row?.[category.key]) || 0 }
    }

    return { category: category.label, values }
  })
}

// Extra table rows below the bars' rows (e.g. sealed nests and Parasitism %),
// one per `chart.summaryRows` entry, with a value per series. A missing
// value (e.g. a rate with nothing sealed) is null.
export function buildGroupedCountSummary(chart, chartData, { year }) {
  return (chart.summaryRows ?? []).map((summary) => {
    const values = {}

    for (const series of chart.series) {
      const value = sourceRowFor(chart, chartData, year, series.key)?.[summary.key]
      values[series.key] = value === null || value === undefined ? null : Number(value)
    }

    return { ...summary, values }
  })
}
