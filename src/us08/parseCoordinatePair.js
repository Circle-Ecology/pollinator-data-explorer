
export function parseCoordinatePair(raw) {
  if (typeof raw !== 'string') {
    throw new Error('MalformedCoordinatesError')
  }

  const parts = raw.split(',')

  if (parts.length !== 2) {
    throw new Error('MalformedCoordinatesError')
  }

  const values = parts.map((part) => part.trim())

  if (values.some((value) => value === '')) {
    throw new Error('MalformedCoordinatesError')
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
    throw new Error('MalformedCoordinatesError')
  }

  return { latitude, longitude }
}
