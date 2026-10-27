export async function getPublicObservations() {
  const response = await fetch('/data/observations.json')

  if (!response.ok) {
    throw new Error(
      `Failed to load public observations: ${response.status}`
    )
  }

  const observations = await response.json()

  if (!Array.isArray(observations)) {
    throw new Error('Invalid public observations data')
  }

  return observations
}
