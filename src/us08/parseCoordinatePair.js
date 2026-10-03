
export class MalformedCoordinatesError extends Error {
  constructor(message = 'MalformedCoordinatesError') {
    super(message)
    this.name = 'MalformedCoordinatesError'
  }
}

export function parseCoordinatePair(raw) {
  if (typeof raw !== 'string') {
    throw new MalformedCoordinatesError()
  }

  const parts = raw.split(',')

  if (parts.length !== 2) {
    throw new MalformedCoordinatesError()
  }

  const values = parts.map((part) => part.trim())

  if (values.some((value) => value === '')) {
    throw new MalformedCoordinatesError()
  }

  const [latitude, longitude] = values.map(Number)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new MalformedCoordinatesError()
  }

  return { latitude, longitude }
}
