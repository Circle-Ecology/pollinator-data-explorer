
export function parseExportDate(raw) {
  if (typeof raw !== 'string') {
    throw new Error('InvalidExportDateError')
  }

  const value = raw.trim()
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)

  if (!match) {
    throw new Error('InvalidExportDateError')
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCFullYear(year)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('InvalidExportDateError')
  }

  return date.toISOString().slice(0, 10)
}

