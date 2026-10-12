// Shared with US-08 (#13). Returns { latitude, longitude } or throws MalformedCoordinatesError.
// Range checks are done by validateSurveyRow.
export class MalformedCoordinatesError extends Error {
  constructor(raw) {
    super(`Malformed coordinates: ${raw}`)
    this.name = 'MalformedCoordinatesError'
    this.raw = raw
  }
}

const COORDINATE_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

export function parseCoordinatePair(raw) {
  const match = typeof raw === 'string' ? raw.match(COORDINATE_PAIR) : null
  if (!match) {
    throw new MalformedCoordinatesError(raw)
  }

  return { latitude: Number(match[1]), longitude: Number(match[2]) }
}
