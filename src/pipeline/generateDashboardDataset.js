// US-28 dashboard metric helpers. Each rule from Circle Ecology's deck
// (report_v03.html) lives in exactly one named constant or function here, so a
// rule change is a one-place edit.
//
// CONFIRMED against the deck's occupancy-by-year totals (2023: 233 of 630,
// 2025: 33%, 2026: 35%):
//  - Occupied = Active, Complete or Reopened.
//  - Excluded = never occupied and at least one "Retired hole" observation.
// CONFIRMED against the deck's sealed nest rate by installation year (2025):
//  - A sealed nest is a run of consecutive "Sealed" records for one occupant type
//    in a cavity; the rate counts nests (not cavities) over available cavities.
//    Bee matches within ~1.5 points and Wasp within 1; see docs/public-dataset.md.
// CONFIRMED against the deck's occupants by site and type (2023, 2025, 2026):
//  - An occupant is one run in a cavity. A run ends at any non-occupied
//    observation and a new one starts on Reopened -> Active or Complete, or when
//    a recorded Plug Composition changes. Its type is the first one recorded.
//  - Runs with no recorded type are not counted.
//  Matches the deck on 65 of 76 site/year/type cells; the rest are 2025 Other
//  (tracked outside the sheet export) and small 2023 differences. See
//  docs/public-dataset.md.

export const OCCUPIED_STATUSES = ['Active', 'Complete', 'Reopened']
export const RETIRED_STATUS = 'Retired hole'
export const NEST_OCCUPANT_TYPES = ['Bee', 'Wasp']
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

// The occupant runs in one cavity's observations, each { occupantType } (null when
// no type was ever recorded in the run).
export function listOccupantRuns(observations) {
  const runs = []
  let previousStatus = null
  let plug = null
  let open = false
  for (const o of [...observations].sort(byDate)) {
    const status = o.observationStatus
    if (!isOccupiedStatus(status)) {
      previousStatus = status
      open = false
      plug = null
      continue
    }
    const plugChanged = o.plugComposition != null && plug != null && o.plugComposition !== plug
    const resealed = previousStatus === 'Reopened' && (status === 'Active' || status === 'Complete')
    if (!open || resealed || plugChanged) {
      runs.push({ occupantType: null })
      plug = null
      open = true
    }
    const run = runs[runs.length - 1]
    if (o.plugComposition != null) plug = o.plugComposition
    if (run.occupantType === null && o.occupantType != null) run.occupantType = o.occupantType
    previousStatus = status
  }
  return runs
}

export function countOccupantRuns(observations) {
  return listOccupantRuns(observations).length
}

// Nests of one occupant type in a cavity's observations: each unbroken run of
// "Sealed" records counts once, and any other record (Reopened, Emergence, Empty,
// another occupant...) ends it, so a nest sealed again after reopening is a new one.
export function countSealedNests(observations, occupantType) {
  let nests = 0
  let inNest = false
  for (const o of [...observations].sort(byDate)) {
    const sealed = o.occupantType === occupantType && o.wholeOrHole === SEALED_VALUE
    if (sealed && !inNest) nests += 1
    inNest = sealed
  }
  return nests
}

// cavities: [{ group, observations }] (group = the factor value, e.g. 'Log').
// Returns { [group]: { available, Bee: { sealed, rate }, Wasp: { sealed, rate } } },
// where `available` is the non-excluded cavities observed that year.
export function computeSealedNestRate(cavities, year) {
  const prefix = `${year}-`
  const result = {}
  for (const { group, observations } of cavities) {
    const inYear = observations.filter(o => o.surveyDate.startsWith(prefix))
    if (inYear.length === 0 || isExcludedCavity(inYear)) continue
    const entry = (result[group] ??= {
      available: 0,
      ...Object.fromEntries(NEST_OCCUPANT_TYPES.map(type => [type, { sealed: 0, rate: 0 }])),
    })
    entry.available += 1
    for (const type of NEST_OCCUPANT_TYPES) entry[type].sealed += countSealedNests(inYear, type)
  }
  for (const entry of Object.values(result)) {
    for (const type of NEST_OCCUPANT_TYPES) {
      entry[type].rate = Math.round((entry[type].sealed / entry.available) * 100)
    }
  }
  return result
}

// Chart ids. The dashboard config (US-29) must use these exact `id` values.
export const CHART_IDS = {
  occupancyByYear: 'occupancy-by-year',
  occupancyBySite: 'occupancy-by-site',
  occupantsByYearType: 'occupants-by-year-type',
  occupantsBySite: 'occupants-by-site',
  occupantsBySiteType: 'occupants-by-site-type',
  otherBySiteType: 'other-by-site-type',
  sealedRateByCwd: 'sealed-rate-by-cwd',
  sealedRateBySubstrate: 'sealed-rate-by-substrate',
  sealedRateByDirection: 'sealed-rate-by-direction',
  sealedRateByInstallYear: 'sealed-rate-by-install-year',
  sealedRateByDiameter: 'sealed-rate-by-diameter',
}

// Nest-site factors for the sealed nest rate charts: chart id -> the group a
// tunnel falls in (null = leave the cavity out of that chart). Installation year
// is split by Log/Snag as in the deck ("2025 Log", "2025 Snag").
const SEALED_RATE_FACTORS = {
  [CHART_IDS.sealedRateByCwd]: t => t.coarseWoodyDebrisType,
  [CHART_IDS.sealedRateBySubstrate]: t => t.substrateType,
  [CHART_IDS.sealedRateByDirection]: t => t.direction,
  [CHART_IDS.sealedRateByInstallYear]: t =>
    (t.installationYear != null && t.coarseWoodyDebrisType != null ? `${t.installationYear} ${t.coarseWoodyDebrisType}` : null),
  [CHART_IDS.sealedRateByDiameter]: t => (t.tunnelDiameterInches != null ? String(t.tunnelDiameterInches) : null),
}

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
// Plain numbers (diameters) sort by value; labels like "2025 Log" sort as text with
// embedded numbers in order. localeCompare's numeric mode alone would put 0.25 before 0.125.
function compareGroups(a, b) {
  const [x, y] = [Number(a), Number(b)]
  return Number.isFinite(x) && Number.isFinite(y) ? x - y : a.localeCompare(b, 'en', { numeric: true })
}
const yearOf = observation => observation.surveyDate.slice(0, 4)

function tally(cavityObservations) {
  const counts = { occupied: 0, empty: 0, excluded: 0 }
  for (const observations of cavityObservations) counts[classifyCavityOccupancy(observations)] += 1
  // `available` is the denominator: excluded cavities are not counted as Empty.
  return { ...counts, available: counts.occupied + counts.empty }
}

// Occupant chart categories. Anything that is not Bee, Wasp or Unknown is "Other";
// the Other-occupants chart then splits that by its own type.
export const OCCUPANT_TYPES = ['Bee', 'Wasp', 'Unknown', 'Other']
export const OTHER_OCCUPANT_TYPES = ['Spider', 'Ant(s)', 'Pill Bug', 'Other']
const occupantCategory = type => (['Bee', 'Wasp', 'Unknown'].includes(type) ? type : 'Other')
const otherCategory = type => (['Spider', 'Ant(s)', 'Pill Bug'].includes(type) ? type : 'Other')

function zeroCounts(keys) {
  return Object.fromEntries(keys.map(key => [key, 0]))
}

// Typed occupant runs of a group of cavities -> counts per category plus a total.
function occupantCounts(cavityObservations, keys, categorize) {
  const counts = { ...zeroCounts(keys), total: 0 }
  for (const observations of cavityObservations) {
    for (const { occupantType } of listOccupantRuns(observations)) {
      if (occupantType === null) continue
      counts[categorize(occupantType)] += 1
      counts.total += 1
    }
  }
  return counts
}

/**
 * Pure: precompute every dashboard figure from the PUBLIC dataset.
 * `publicDataset` is { sites, observations } from generatePublicDataset;
 * `tunnels` supplies the nest-site factors (see SEALED_RATE_FACTORS). Only those
 * fields are read, and only aggregates are emitted, so no staff-only data can
 * reach the output. Every aggregate carries its counts and denominator.
 * Shape: { generatedAt, years, charts: { [chartId]: { [year]: rows } } }.
 */
export function generateDashboardDataset({ sites, observations }, tunnels, generatedAt) {
  const tunnelById = new Map(tunnels.map(t => [t.tunnelId, t]))
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
    [CHART_IDS.occupantsByYearType]: {},
    [CHART_IDS.occupantsBySite]: {},
    [CHART_IDS.occupantsBySiteType]: {},
    [CHART_IDS.otherBySiteType]: {},
    ...Object.fromEntries(Object.keys(SEALED_RATE_FACTORS).map(id => [id, {}])),
  }
  for (const year of years) {
    const cavities = [...cavitiesByYear.get(year)]
      .sort(([a], [b]) => byText(a, b))
      .map(([tunnelId, cavity]) => ({ tunnelId, ...cavity, tunnel: tunnelById.get(tunnelId) ?? {} }))

    charts[CHART_IDS.occupancyByYear][year] = [tally(cavities.map(c => c.observations))]

    const bySite = new Map()
    for (const c of cavities) {
      if (!bySite.has(c.siteId)) bySite.set(c.siteId, [])
      bySite.get(c.siteId).push(c.observations)
    }
    charts[CHART_IDS.occupancyBySite][year] = [...bySite]
      .sort(([a], [b]) => byText(a, b))
      .map(([siteId, group]) => ({ siteId, propertyName: siteById.get(siteId)?.propertyName ?? null, ...tally(group) }))

    const allObservations = cavities.map(c => c.observations)
    charts[CHART_IDS.occupantsByYearType][year] = [occupantCounts(allObservations, OCCUPANT_TYPES, occupantCategory)]
    const siteRows = (keys, categorize) => [...bySite]
      .sort(([a], [b]) => byText(a, b))
      .map(([siteId, group]) => ({
        siteId, propertyName: siteById.get(siteId)?.propertyName ?? null, ...occupantCounts(group, keys, categorize),
      }))
    charts[CHART_IDS.occupantsBySite][year] = siteRows(OCCUPANT_TYPES, occupantCategory)
      .map(({ siteId, propertyName, total }) => ({ siteId, propertyName, total }))
    charts[CHART_IDS.occupantsBySiteType][year] = siteRows(OCCUPANT_TYPES, occupantCategory)
    // Only the Other occupants: total counts just Spider, Ant(s), Pill Bug and Other.
    charts[CHART_IDS.otherBySiteType][year] = [...bySite]
      .sort(([a], [b]) => byText(a, b))
      .map(([siteId, group]) => {
        const others = group.map(observations => listOccupantRuns(observations)
          .filter(run => run.occupantType !== null && occupantCategory(run.occupantType) === 'Other'))
        const counts = { ...zeroCounts(OTHER_OCCUPANT_TYPES), total: 0 }
        for (const runs of others) for (const run of runs) { counts[otherCategory(run.occupantType)] += 1; counts.total += 1 }
        return { siteId, propertyName: siteById.get(siteId)?.propertyName ?? null, ...counts }
      })

    for (const [chartId, factor] of Object.entries(SEALED_RATE_FACTORS)) {
      const grouped = cavities
        .map(c => ({ group: factor(c.tunnel) ?? null, observations: c.observations }))
        .filter(c => c.group !== null)
      const rates = computeSealedNestRate(grouped, Number(year))
      charts[chartId][year] = Object.keys(rates)
        .sort(compareGroups)
        .map(group => ({ group, ...rates[group] }))
    }
  }
  return { generatedAt, years: years.map(Number), charts }
}
