
import { fetchPublicObservations } from './fetchPublicObservations'

// US-14 occupancy rules.
// Preserve the existing behavior until the stakeholder confirms it.
const OCCUPIED_STATUSES = new Set([
  'Complete',
  'Active',
  'Reopened',
])

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

// US-15: Calculate site statistics from published observations.
function calculateSiteStats(observations) {
  const statsBySite = new Map()

  for (const observation of observations) {
    const { siteId, tunnelId, surveyDate } = observation

    if (!siteId) continue

    if (!statsBySite.has(siteId)) {
      statsBySite.set(siteId, {
        tunnelIds: new Set(),
        surveyDates: new Set(),
      })
    }

    const stats = statsBySite.get(siteId)

    if (tunnelId) {
      stats.tunnelIds.add(tunnelId)
    }

    if (
      typeof surveyDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(surveyDate)
    ) {
      stats.surveyDates.add(surveyDate)
    }
  }

  return statsBySite
}

async function fetchJson(path) {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(
      `Request for ${path} failed: ${response.status}`
    )
  }

  return response.json()
}

function hasValidCoordinates(site) {
  const { latitude, longitude } = site

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export async function getPublicSites() {
  const [sites, observations] = await Promise.all([
    fetchJson('/data/sites.json'),
    fetchPublicObservations(),
  ])

  const occupiedTunnelsBySite =
    countOccupiedTunnelsBySite(observations)

  const statsBySite = calculateSiteStats(observations)

  const validSites = []
  const invalidSites = []

  for (const site of sites) {
    if (!hasValidCoordinates(site)) {
      invalidSites.push({
        siteId: site.siteId,
        propertyName: site.propertyName,
        latitude: site.latitude,
        longitude: site.longitude,
      })

      continue
    }

    const stats = statsBySite.get(site.siteId)
    const dates = [...(stats?.surveyDates ?? [])].sort()

    validSites.push({
      ...site,
      firstSurveyDate: dates[0] ?? null,
      lastSurveyDate: dates.at(-1) ?? null,
      surveyDateCount: dates.length,
      tunnelCount: stats?.tunnelIds.size ?? 0,
      occupiedTunnelCount:
        occupiedTunnelsBySite.get(site.siteId)?.size ?? 0,
    })
  }

  if (invalidSites.length > 0) {
    console.warn(
      `${invalidSites.length} site(s) have invalid coordinates:`,
      invalidSites
    )
  }

  return validSites
}
