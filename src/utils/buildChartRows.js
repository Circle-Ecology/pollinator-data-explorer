// US-29: turn precomputed dashboard rows into one row per bar.
// Percentages are each series' share of that bar's series total, so a
// stacked bar in percentage mode always sums to 100.

function percentOf(count, total) {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0
}

// Years that have rows for this chart, in the order dashboard.json lists them.
export function getChartYears(chartData, years) {
  if (!chartData) return []

  return years.filter((year) => {
    const rows = chartData[String(year)]
    return Array.isArray(rows) && rows.length > 0
  })
}

export function buildChartRows(chart, chartData, { years, year }) {
  if (!chartData) return []

  const sourceRows = chart.supportsYears
    ? chartData[String(year)] ?? []
    : getChartYears(chartData, years).flatMap((rowYear) =>
        chartData[String(rowYear)].map((row) => ({ ...row, year: rowYear }))
      )

  return sourceRows.map((row) => {
    const counts = {}

    for (const series of chart.series) {
      const value = Number(row[series.key])
      counts[series.key] = Number.isFinite(value) ? value : 0
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    const percents = {}

    for (const series of chart.series) {
      percents[series.key] = percentOf(counts[series.key], total)
    }

    return {
      category: String(row[chart.categoryKey] ?? 'Not recorded'),
      counts,
      percents,
      total,
    }
  })
}
