import { SITE_STAT_FIELDS } from '../pipeline/siteStats.js'

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

// A missing figure stays null, which the map and panel show as "Not recorded";
// it is never replaced with a made-up 0.
function pickPublicSiteFields(site) {
  return Object.fromEntries(
    [...PUBLIC_SITE_FIELDS, ...SITE_STAT_FIELDS].map((field) => [
      field,
      site[field] ?? null,
    ])
  )
}

// Netlify builds sites.json and the app together, so the figures should
// always be there. If not (e.g. stale local data), say so instead of failing
// silently.
function warnAboutMissingFigures(sites) {
  const missing = sites.filter((site) =>
    SITE_STAT_FIELDS.some((field) => !(field in site))
  )
  if (missing.length > 0) {
    console.warn(
      `sites.json is missing site figures for ${missing.length} site(s); ` +
        'regenerate it with `npm run pipeline:publish -- public/data`.',
      missing.map(({ siteId }) => siteId)
    )
  }
}

export async function getPublicSites() {
  const sites = await fetchJson('/data/sites.json')
  warnAboutMissingFigures(sites)

  const invalidSites = sites.filter((site) => !hasValidCoordinates(site))
  if (invalidSites.length > 0) {
    console.warn(
      `${invalidSites.length} site(s) have invalid coordinates:`,
      invalidSites.map(({ siteId, propertyName }) => ({ siteId, propertyName }))
    )
  }

  return sites.filter(hasValidCoordinates).map(pickPublicSiteFields)
}
