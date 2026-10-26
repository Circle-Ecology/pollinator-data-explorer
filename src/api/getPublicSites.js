// A tunnel counts as "occupied" when a published survey found something in it.
// "Empty" and "Retired hole" are explicitly not occupancy; this is a documented
// implementation choice (see US-14, #19), not a confirmed stakeholder decision.
const OCCUPIED_STATUSES = new Set(['Complete', 'Active', 'Reopened'])

function countOccupiedTunnelsBySite(observations) {
  const occupiedTunnelsBySite = new Map()

  for (const observation of observations) {
    if (!OCCUPIED_STATUSES.has(observation.observationStatus)) {
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

async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Request for ${path} failed: ${response.status}`)
  }
  return response.json()
}

export async function getPublicSites() {
  const [sites, observations] = await Promise.all([
    fetchJson('/data/sites.json'),
    fetchJson('/data/observations.json'),
  ])

  const occupiedTunnelsBySite = countOccupiedTunnelsBySite(observations)

  return sites
    .filter((site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude))
    .map((site) => ({
      ...site,
      occupiedTunnelCount: occupiedTunnelsBySite.get(site.siteId)?.size ?? 0,
    }))
}
