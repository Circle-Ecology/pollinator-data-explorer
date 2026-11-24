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

// US-39: the hover tooltip reads like the bar, top segment first and bottom
// last (Recharts lists them bottom first). Use as Tooltip's itemSorter.
export function tooltipOrderTopFirst(series) {
  const order = legendOrderBySeries(series)
  return (item) => -order(item)
}

// Charts with many bars (e.g. 16 two-week periods) get a minimum width so
// the bars and angled labels stay readable; on narrow screens the chart then
// scrolls sideways inside its own box instead of squeezing or widening the
// page. Sized so 16 bars still fit the desktop chart area without scrolling.
export const SCROLL_ABOVE_BARS = 8
export const MIN_BAR_SLOT_PX = 24
const AXIS_AND_MARGIN_PX = 140

export function getChartMinWidth(barCount) {
  return barCount > SCROLL_ABOVE_BARS
    ? barCount * MIN_BAR_SLOT_PX + AXIS_AND_MARGIN_PX
    : undefined
}
