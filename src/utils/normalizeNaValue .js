// Shared with US-08 (#13). Returns { latitude, longitude } or throws MalformedCoordinatesError.
export class MalformedCoordinatesError extends Error {
  constructor(raw) {
    super(`Malformed coordinates: ${raw}`)
    this.name = 'MalformedCoordinatesError'
    this.raw = raw
  }
}

export function parseCoordinatePair(raw) {
  throw new Error('Not implemented: parseCoordinatePair')
}
