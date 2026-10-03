
export function normalizeNaValue(raw) {
  if (raw === null || raw === undefined) {
    return null
  }

  if (typeof raw !== 'string') {
    return raw
  }

  const value = raw.trim()

  if (value === '' || value.toUpperCase() === 'NA') {
    return null
  }

  return value
}
