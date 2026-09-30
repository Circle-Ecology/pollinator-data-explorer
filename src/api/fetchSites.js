// TODO: point this at the real data source once the API/CSV endpoint is settled.
export async function fetchSites() {
  const response = await fetch('/api/sites')
  if (!response.ok) {
    throw new Error(`Sites request failed: ${response.status}`)
  }
  return response.json()
}