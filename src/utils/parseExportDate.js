// Shared with US-08 (#13). Parses MM-DD-YYYY (v02 export) and M/D/YYYY (v02-2 re-saved export).
// Returns { year, month, day } or null when the value is not a real date in either format.
const DASH_DATE = /^(\d{2})-(\d{2})-(\d{4})$/
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

export function parseExportDate(raw) {
  if (typeof raw !== 'string') {
    return null
  }

  const match = raw.trim().match(DASH_DATE) ?? raw.trim().match(SLASH_DATE)
  if (!match) {
    return null
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}
