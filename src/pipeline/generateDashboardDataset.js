// US-28 dashboard metric helpers. Each rule from Circle Ecology's deck
// (report_v03.html) lives in exactly one named constant or function here, so a
// rule change is a one-place edit.
//
// CONFIRMED against the deck's occupancy-by-year totals (2023: 233 of 630,
// 2025: 33%, 2026: 35%):
//  - Occupied = Active, Complete or Reopened.
//  - Excluded = never occupied and at least one "Retired hole" observation.
// STILL ASSUMED, pending confirmation against the deck:
//  - A new occupant run starts after any non-occupied observation, on
//    Reopened -> Active, or when a recorded Plug Composition changes.
//  - Sealed nest = Bee or Wasp with Whole/Hole "Sealed"; rate denominator is
//    non-excluded cavities observed in the year.

export const OCCUPIED_STATUSES = ['Active', 'Complete', 'Reopened']
export const RETIRED_STATUS = 'Retired hole'
export const SEALED_OCCUPANT_TYPES = ['Bee', 'Wasp']
export const SEALED_VALUE = 'Sealed'

const isOccupiedStatus = status => OCCUPIED_STATUSES.includes(status)
const byDate = (a, b) => (a.surveyDate < b.surveyDate ? -1 : a.surveyDate > b.surveyDate ? 1 : 0)

export function isExcludedCavity(observations) {
  if (observations.some(o => isOccupiedStatus(o.observationStatus))) return false
  return observations.some(o => o.observationStatus === RETIRED_STATUS)
}

export function classifyCavityOccupancy(observations) {
  if (observations.some(o => isOccupiedStatus(o.observationStatus))) return 'occupied'
  if (isExcludedCavity(observations)) return 'excluded'
  return 'empty'
}

export function countOccupantRuns(observations) {
  let runs = 0
  let previousStatus = null
  let plug = null
  for (const o of [...observations].sort(byDate)) {
    const status = o.observationStatus
    if (!isOccupiedStatus(status)) {
      previousStatus = status
      plug = null
      continue
    }
    const plugChanged = o.plugComposition != null && plug != null && o.plugComposition !== plug
    const startsRun = !isOccupiedStatus(previousStatus) ||
      (previousStatus === 'Reopened' && status === 'Active') ||
      plugChanged
    if (startsRun) {
      runs += 1
      plug = null
    }
    if (o.plugComposition != null) plug = o.plugComposition
    previousStatus = status
  }
  return runs
}

function isSealedNest(o) {
  return SEALED_OCCUPANT_TYPES.includes(o.occupantType) && o.wholeOrHole === SEALED_VALUE
}

// cavities: [{ level, observations }]. Returns { [level]: { sealed, available, rate } }.
export function computeSealedNestRate(cavities, year) {
  const prefix = `${year}-`
  const result = {}
  for (const { level, observations } of cavities) {
    const inYear = observations.filter(o => o.surveyDate.startsWith(prefix))
    if (inYear.length === 0 || isExcludedCavity(inYear)) continue
    const entry = (result[level] ??= { sealed: 0, available: 0, rate: 0 })
    entry.available += 1
    if (inYear.some(isSealedNest)) entry.sealed += 1
  }
  for (const entry of Object.values(result)) {
    entry.rate = Math.round((entry.sealed / entry.available) * 100)
  }
  return result
}

// Chart ids. The dashboard config (US-29) must use these exact `id` values.
export const CHART_IDS = {
  occupancyByYear: 'occupancy-by-year',
  occupancyBySite: 'occupancy-by-site',
  sealedNestRateByLevel: 'sealed-nest-rate-by-level',
}

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const yearOf = observation => observation.surveyDate.slice(0, 4)

function tally(cavityObservations) {
  const counts = { occupied: 0, empty: 0, excluded: 0 }
  for (const observations of cavityObservations) counts[classifyCavityOccupancy(observations)] += 1
  // `available` is the denominator: excluded cavities are not counted as Empty.
  return { ...counts, available: counts.occupied + counts.empty }
}

/**
 * Pure: precompute every dashboard figure from the PUBLIC dataset.
 * `publicDataset` is { sites, observations } from generatePublicDataset;
 * `tunnels` supplies each cavity's level (coarseWoodyDebrisType). Only those
 * fields are read, and only aggregates are emitted, so no staff-only data can
 * reach the output. Every aggregate carries its counts and denominator.
 * Shape: { generatedAt, years, charts: { [chartId]: { [year]: rows } } }.
 */
export function generateDashboardDataset({ sites, observations }, tunnels, generatedAt) {
  const levelByTunnel = new Map(tunnels.map(t => [t.tunnelId, t.coarseWoodyDebrisType ?? null]))
  const siteById = new Map(sites.map(s => [s.siteId, s]))
  const years = [...new Set(observations.map(yearOf))].sort(byText)

  // year -> tunnelId -> { siteId, observations }
  const cavitiesByYear = new Map(years.map(y => [y, new Map()]))
  for (const o of observations) {
    const cavities = cavitiesByYear.get(yearOf(o))
    if (!cavities.has(o.tunnelId)) cavities.set(o.tunnelId, { siteId: o.siteId, observations: [] })
    cavities.get(o.tunnelId).observations.push(o)
  }

  const charts = {
    [CHART_IDS.occupancyByYear]: {},
    [CHART_IDS.occupancyBySite]: {},
    [CHART_IDS.sealedNestRateByLevel]: {},
  }
  for (const year of years) {
    const cavities = [...cavitiesByYear.get(year)]
      .sort(([a], [b]) => byText(a, b))
      .map(([tunnelId, cavity]) => ({ tunnelId, ...cavity, level: levelByTunnel.get(tunnelId) ?? null }))

    charts[CHART_IDS.occupancyByYear][year] = [tally(cavities.map(c => c.observations))]

    const bySite = new Map()
    for (const c of cavities) {
      if (!bySite.has(c.siteId)) bySite.set(c.siteId, [])
      bySite.get(c.siteId).push(c.observations)
    }
    charts[CHART_IDS.occupancyBySite][year] = [...bySite]
      .sort(([a], [b]) => byText(a, b))
      .map(([siteId, group]) => ({ siteId, propertyName: siteById.get(siteId)?.propertyName ?? null, ...tally(group) }))

    const sealed = computeSealedNestRate(cavities.filter(c => c.level !== null), Number(year))
    charts[CHART_IDS.sealedNestRateByLevel][year] = Object.keys(sealed).sort(byText)
      .map(level => ({ level, ...sealed[level] }))
  }
  return { generatedAt, years: years.map(Number), charts }
}
