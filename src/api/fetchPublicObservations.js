
let pendingRequest = null

export function fetchPublicObservations() {
  if (pendingRequest) {
    return pendingRequest
  }

  const request = (async () => {
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
  })()

  pendingRequest = request

  void request.then(
    () => {
      if (pendingRequest === request) {
        pendingRequest = null
      }
    },
    () => {
      if (pendingRequest === request) {
        pendingRequest = null
      }
    }
  )

  return request
}
