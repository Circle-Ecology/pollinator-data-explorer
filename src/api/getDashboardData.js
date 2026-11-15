// US-29: load the dashboard figures precomputed by the pipeline (US-28).
// Shape: { generatedAt, years, charts: { [chartId]: { [year]: rows } } }.
// No aggregation happens in the browser; charts only read these rows.
export const DASHBOARD_DATA_PATH = '/data/dashboard.json'

export async function getDashboardData() {
  const response = await fetch(DASHBOARD_DATA_PATH)

  if (!response.ok) {
    throw new Error(
      `Request for ${DASHBOARD_DATA_PATH} failed: ${response.status}`
    )
  }

  const data = await response.json()

  if (
    !data ||
    !Array.isArray(data.years) ||
    typeof data.charts !== 'object' ||
    data.charts === null
  ) {
    throw new Error('Dashboard data is not in the expected format')
  }

  return data
}
