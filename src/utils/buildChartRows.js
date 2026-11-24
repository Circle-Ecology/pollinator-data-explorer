// US-29: turn precomputed dashboard rows into one row per bar.
// Percentages are each series' share of that bar's series total, so a
// stacked bar in percentage mode always sums to 100 - unless the chart sets
// percentBase: 'chart', when each is a share of every bar's total combined
// (e.g. plug depths as a share of the year's nested cavities).
// A series not yet recorded in a bar's year (before its trackedFrom) gets
// null instead of 0, so the chart draws nothing and the table says
// "Not recorded" rather than reporting a misleading zero.

import { formatPeriodRange } from './formatPeriodRange'

// How a row's x-axis label is built, by the chart's categoryFormat.
function categoryOf(chart, row) {
  if (chart.categoryFormat === 'periodRange') {
    return formatPeriodRange(row.start, row.end)
  }
  return String(row[chart.categoryKey] ?? 'Not recorded')
}

function percentOf(count, total) {
  if (count === null) return null
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0
}

function isRecorded(series, year) {
  return !series.trackedFrom || Number(year) >= series.trackedFrom
}

// Years that have rows for this chart, in the order dashboard.json lists them.
export function getChartYears(chartData, years) {
  if (!chartData) return []

  return years.filter((year) => {
    const rows = chartData[String(year)]
    return Array.isArray(rows) && rows.length > 0
  })
}

// Series recorded in at least one of the years on screen. A series with a
// `trackedFrom` year (e.g. Unknown from 2026) is left out of the chart,
// legend and table for earlier years, because a 0 there means "not recorded
// yet", not "none found". A real zero in a tracked year stays visible.
export function getVisibleSeries(chart, yearsInView) {
  return chart.series.filter(
    (series) =>
      !series.trackedFrom ||
      yearsInView.some((year) => Number(year) >= series.trackedFrom)
  )
}

// A year's rows; with `rowsField`, dashboard.json nests them one level down
// (e.g. plug depth: [{ total, rows: [...] }]).
function yearRows(chart, chartData, year) {
  const rows = chartData[String(year)] ?? []
  return chart.rowsField ? rows.flatMap((row) => row[chart.rowsField] ?? []) : rows
}

// A category not yet recorded in the year (before its entry in
// categoryTrackedFrom) is left out, like a series before its trackedFrom.
function isCategoryRecorded(chart, category, year) {
  const from = chart.categoryTrackedFrom?.[category]
  return !from || Number(year) >= from
}

export function buildChartRows(chart, chartData, { years, year }) {
  if (!chartData) return []

  const sourceRows = (
    chart.supportsYears
      ? yearRows(chart, chartData, year)
      : getChartYears(chartData, years).flatMap((rowYear) =>
          yearRows(chart, chartData, rowYear).map((row) => ({ ...row, year: rowYear }))
        )
  ).filter((row) =>
    isCategoryRecorded(chart, categoryOf(chart, row), chart.supportsYears ? year : row.year)
  )

  const rows = sourceRows.map((row) => {
    const rowYear = chart.supportsYears ? year : row.year
    const counts = {}

    for (const series of chart.series) {
      const value = Number(row[series.key])
      counts[series.key] = !isRecorded(series, rowYear)
        ? null
        : Number.isFinite(value)
          ? value
          : 0
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    const percents = {}

    for (const series of chart.series) {
      percents[series.key] = percentOf(counts[series.key], total)
    }

    return {
      category: categoryOf(chart, row),
      counts,
      percents,
      total,
    }
  })

  if (chart.percentBase === 'chart') {
    const chartTotal = rows.reduce((sum, row) => sum + row.total, 0)
    for (const row of rows) {
      for (const series of chart.series) {
        row.percents[series.key] = percentOf(row.counts[series.key], chartTotal)
      }
    }
  }

  return rows
}
