// US-37: per-site figures for the map and site details panel, calculated in
// the pipeline so visitors download only sites.json, never every observation.
// The rules are unchanged from when the browser calculated them (US-14,
// US-15); only where they run has moved.

// A tunnel counts as "occupied" when a published survey found something in it.
// "Empty" and "Retired hole" are explicitly not occupancy; this is a documented
// implementation choice (see US-14, #19), not a confirmed stakeholder decision.
const OCCUPIED_STATUSES = new Set(['Complete', 'Active', 'Reopened'])

// The fields addSiteStats adds to each site, in this order. Mirrored by the
// browser's allowlist in src/api/getPublicSites.js.
export const SITE_STAT_FIELDS = [
  'firstSurveyDate',
  'lastSurveyDate',
  'surveyedInLatestSeason',
  'surveyDateCount',
  'tunnelCount',
  'occupiedTunnelCount',
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

// Survey dates and surveyed tunnels per site, from published observations.
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

// Each site with its figures added. A site with no observations gets null
// dates and zero counts.
export function addSiteStats(sites, observations) {
  const occupiedTunnelsBySite = countOccupiedTunnelsBySite(observations)
  const statsBySite = calculateSiteStats(observations)
  const latestSurveyYear = getLatestSurveyYear(statsBySite)

  return sites.map((site) => {
    const stats = statsBySite.get(site.siteId)
    const dates = [...(stats?.surveyDates ?? [])].sort()
    const lastSurveyDate = dates.at(-1) ?? null

    return {
      ...site,
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
