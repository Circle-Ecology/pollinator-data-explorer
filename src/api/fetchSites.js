// TODO(US-24): point this at the public dataset file the US-23 scheduler produces.
// The browser must never fetch the Google Sheet directly (see src/pipeline/).
export async function fetchSites() {
  const response = await fetch('/api/sites')
  if (!response.ok) {
    throw new Error(`Sites request failed: ${response.status}`)
  }
  return response.json()
}