import { NULL_SENTINEL } from '../validation/csvSchema'

// Shared with US-08 (#13). The export uses the literal string "NA" for missing values.
// Returns null for NA, blank, or missing values; otherwise the trimmed string.
export function normalizeNaValue(value) {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = String(value).trim()
  if (trimmed === '' || trimmed === NULL_SENTINEL) {
    return null
  }

  return trimmed
}
