// US-30: StackedBarChart settings kept as plain functions so they can be
// unit tested without rendering Recharts.

export const PERCENT_TICKS = [0, 25, 50, 75, 100]

// Percentage mode fixes the axis at 0-100%: each share is rounded to one
// decimal, so a bar can add up to 100.1 and would otherwise stretch the axis.
export function getValueAxisProps(isPercent) {
  return isPercent
    ? { domain: [0, 100], allowDataOverflow: true, ticks: PERCENT_TICKS }
    : { domain: [0, 'auto'], allowDataOverflow: false, ticks: undefined }
}

// Legend order follows the config (the stack order, bottom to top) rather
// than Recharts' default A-Z. Use as Legend's itemSorter.
export function legendOrderBySeries(series) {
  return (item) => series.findIndex((entry) => entry.key === item.dataKey)
}
