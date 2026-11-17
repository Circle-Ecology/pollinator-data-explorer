// US-37: the pipeline precomputes each site's figures into sites.json
// (src/pipeline/siteStats.js), so the browser loads only sites.json and
// never downloads every observation.

// Public site fields only (mirrors SITE_FIELDS in the pipeline). Listed
// explicitly rather than spreading the record, so an unexpected field in
// sites.json can never reach the UI.
const PUBLIC_SITE_FIELDS = [
  'siteId',
  'propertyName',
  'city',
  'state',
  'latitude',
  'longitude',
  'elevationMeters',
]

// Precomputed figures (SITE_STAT_FIELDS in siteStats.js), with the value used
// if a field is missing, e.g. from a sites.json published before US-37.
const SITE_STAT_DEFAULTS = {
  firstSurveyDate: null,
  lastSurveyDate: null,
  surveyedInLatestSeason: false,
  surveyDateCount: 0,
  tunnelCount: 0,
  occupiedTunnelCount: 0,
}

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Request for ${path} failed: ${response.status}`)
  }
  return response.json()
}

export function hasValidCoordinates({ latitude, longitude }) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function pickPublicSiteFields(site) {
  return {
    ...Object.fromEntries(
      PUBLIC_SITE_FIELDS.map((field) => [field, site[field] ?? null])
    ),
    ...Object.fromEntries(
      Object.entries(SITE_STAT_DEFAULTS).map(([field, fallback]) => [
        field,
        site[field] ?? fallback,
      ])
    ),
  }
}

export async function getPublicSites() {
  const sites = await fetchJson('/data/sites.json')

  const invalidSites = sites.filter((site) => !hasValidCoordinates(site))
  if (invalidSites.length > 0) {
    console.warn(
      `${invalidSites.length} site(s) have invalid coordinates:`,
      invalidSites.map(({ siteId, propertyName }) => ({ siteId, propertyName }))
    )
  }

  return sites.filter(hasValidCoordinates).map(pickPublicSiteFields)
}
