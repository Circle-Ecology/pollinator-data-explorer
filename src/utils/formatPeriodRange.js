// US-31: label an observation period by its date range, e.g. "Jul 1–Jul 14".
// Dates are ISO strings (YYYY-MM-DD) and are read as UTC, so the label never
// shifts by a day in the visitor's time zone.
const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatDay(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  const time = Date.UTC(year, month - 1, day)
  return Number.isFinite(time) ? formatter.format(time) : null
}

export function formatPeriodRange(start, end) {
  const from = formatDay(start)
  const to = formatDay(end)
  return from && to ? `${from}–${to}` : 'Not recorded'
}
