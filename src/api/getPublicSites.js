// A tunnel counts as "occupied" when a published survey found something in it.
// "Empty" and "Retired hole" are explicitly not occupancy; this is a documented
// implementation choice (see US-14, #19), not a confirmed stakeholder decision.
const OCCUPIED_STATUSES = new Set(['Complete', 'Active', 'Reopened'])

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

function countOccupiedTunnelsBySite(observations) {
  const occupiedTunnelsBySite = new Map()

  for (const observation of observations) {
    if (!OCCUPIED_STATUSES.has(observation.observationStatus)) {
      continue
    }
    if (!observation.siteId || !observation.tunnelId) {
      continue
    }
    let tunnelIds = occupiedTunnelsBySite.get(observation.siteId)
    if (!tunnelIds) {
      tunnelIds = new Set()
      occupiedTunnelsBySite.set(observation.siteId, tunnelIds)
    }
    tunnelIds.add(observation.tunnelId)
  }

  return occupiedTunnelsBySite
}

// US-15: survey dates and surveyed tunnels per site, from published observations.
export function calculateSiteStats(observations) {
  const statsBySite = new Map()

  for (const { siteId, tunnelId, surveyDate } of observations) {
    if (!siteId) continue

    let stats = statsBySite.get(siteId)
    if (!stats) {
      stats = { tunnelIds: new Set(), surveyDates: new Set() }
      statsBySite.set(siteId, stats)
    }

    if (tunnelId) stats.tunnelIds.add(tunnelId)

    if (typeof surveyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(surveyDate)) {
      stats.surveyDates.add(surveyDate)
    }
  }

  return statsBySite
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
  return Object.fromEntries(
    PUBLIC_SITE_FIELDS.map((field) => [field, site[field] ?? null])
  )
}

// The most recent survey season in the whole dataset, as a 'YYYY' string.
// A site surveyed that season is treated as still monitored; nothing in the
// sheet says outright when a site stops being surveyed.
export function getLatestSurveyYear(statsBySite) {
  let latest = null

  for (const { surveyDates } of statsBySite.values()) {
    for (const date of surveyDates) {
      const year = date.slice(0, 4)
      if (latest === null || year > latest) latest = year
    }
  }

  return latest
}

export async function getPublicSites() {
  const [sites, observations] = await Promise.all([
    fetchJson('/data/sites.json'),
    fetchJson('/data/observations.json'),
  ])

  const occupiedTunnelsBySite = countOccupiedTunnelsBySite(observations)
  const statsBySite = calculateSiteStats(observations)
  const latestSurveyYear = getLatestSurveyYear(statsBySite)

  const invalidSites = sites.filter((site) => !hasValidCoordinates(site))
  if (invalidSites.length > 0) {
    console.warn(
      `${invalidSites.length} site(s) have invalid coordinates:`,
      invalidSites.map(({ siteId, propertyName }) => ({ siteId, propertyName }))
    )
  }

  return sites.filter(hasValidCoordinates).map((site) => {
    const stats = statsBySite.get(site.siteId)
    const dates = [...(stats?.surveyDates ?? [])].sort()
    const lastSurveyDate = dates.at(-1) ?? null

    return {
      ...pickPublicSiteFields(site),
      firstSurveyDate: dates[0] ?? null,
      lastSurveyDate,
      surveyedInLatestSeason:
        lastSurveyDate !== null &&
        lastSurveyDate.slice(0, 4) === latestSurveyYear,
      surveyDateCount: dates.length,
      tunnelCount: stats?.tunnelIds.size ?? 0,
      occupiedTunnelCount: occupiedTunnelsBySite.get(site.siteId)?.size ?? 0,
    }
  })
}
