// US-28 dashboard metric helpers. Each rule from Circle Ecology's deck
// (report_v03.html) lives in exactly one named constant or function here, so a
// rule change is a one-place edit.
//
// CONFIRMED against the deck's occupancy-by-year totals (2023: 233 of 630,
// 2025: 33%, 2026: 35%):
//  - Occupied = Active, Complete or Reopened.
//  - Excluded = never occupied and at least one "Retired hole" observation.
// CONFIRMED against the deck's sealed nest rates by structural factor (2026, 32 of
// 34 cells exact; 2025 installation-year chart within a point):
//  - A sealed nest is an occupant run (see below) with at least one "Sealed" record,
//    counted per occupant type; the rate is nests over available cavities.
// CONFIRMED against the deck's occupants by site and type (2023, 2025, 2026):
//  - An occupant is one run in a cavity. A run ends at any non-occupied
//    observation and a new one starts on Reopened -> Active or Complete, or when
//    a recorded Plug Composition changes. Its type is the first one recorded.
//  - Runs with no recorded type are not counted.
// CONFIRMED against the deck's occupants by General ID (2023, 2025, 2026): the
// genus label is the run's General ID, except that Spider/Ant(s)/Pill Bug/Other
// occupants are all "Other", a Bee or Wasp whose General ID is "Other" is
// "Other (Bee)"/"Other (Wasp)", and runs with no General ID are not counted.
// Occupant figures match the deck apart from 2025 Other (tracked outside the
// sheet export) and small 2023 differences; see docs/public-dataset.md.
// CONFIRMED against the deck's occupants by observation period (2023 and 2026 within
// a point on 68 of 76 cells; 2025 Bee:Wasp split within a point): periods are 14-day
// blocks from 11 March, and a cavity counts in every period it has an occupied,
// typed observation, once per occupant type.
// SITE SCORECARD (US-35), scoring rules from the ticket and checked against the deck's
// 2023/2025/2026 scorecards: scores match for every site in 2023 and for 5 of 6 sites
// in 2026. NOT matched: Site 7 in 2026 (the Megachile (Eutricharaea) share comes out
// at 32%, the deck shows 26%), and the 2025 sites that the missing Other tracker
// affects. Category cut-offs are inferred (the deck gives only 5=Low, 11-15=High,
// 16-17=Very High); the only-at-this-site bonus is a single +1 (it makes 24 the max).
// CONFIRMED against the deck's richness (2026, 36 of 36 cells): distinct General IDs
// among Bee and Wasp nests, by diameter, site and type.

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

// The occupant runs in one cavity's observations, each { occupantType, generalId,
// observations } (type and General ID are null when none was ever recorded in the
// run; both are the first recorded).
function splitOccupantRuns(observations) {
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
      runs.push({ occupantType: null, generalId: null, observations: [] })
      plug = null
      open = true
    }
    const run = runs[runs.length - 1]
    run.observations.push(o)
    if (o.plugComposition != null) plug = o.plugComposition
    if (run.occupantType === null && o.occupantType != null) run.occupantType = o.occupantType
    if (run.generalId === null && o.generalId != null) run.generalId = o.generalId
    previousStatus = status
  }
  return runs
}

// The same runs as { occupantType, generalId } only.
export function listOccupantRuns(observations) {
  return splitOccupantRuns(observations).map(({ occupantType, generalId }) => ({ occupantType, generalId }))
}

export function countOccupantRuns(observations) {
  return listOccupantRuns(observations).length
}

// Sealed nests of one occupant type in a cavity's observations: each occupant run of
// that type that has at least one "Sealed" record counts once. A nest sealed again
// after being reopened, or after its Plug Composition changed, is a new run.
export function countSealedNests(observations, occupantType) {
  return splitOccupantRuns(observations)
    .filter(run => run.occupantType === occupantType && run.observations.some(o => o.wholeOrHole === SEALED_VALUE))
    .length
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
  occupantsByTypeGenus: 'occupants-by-type-genus',
  occupantsByGenus: 'occupants-by-genus',
  multiGenusCavitiesBySite: 'multi-genus-cavities-by-site',
  genusProfile: 'genus-profile',
  richnessByDiameterSite: 'richness-by-diameter-site',
  occupantsByPeriodType: 'occupants-by-period-type',
  otherByPeriodType: 'other-by-period-type',
  scorecardGenera: 'scorecard-genera',
  scorecardAllSites: 'scorecard-all-sites',
  scorecardSiteOverYears: 'scorecard-site-over-years',
  sealedRateByCwd: 'sealed-rate-by-cwd',
  sealedRateBySubstrate: 'sealed-rate-by-substrate',
  sealedRateByDirection: 'sealed-rate-by-direction',
  sealedRateByInstallYear: 'sealed-rate-by-install-year',
  sealedRateByDiameter: 'sealed-rate-by-diameter',
}

// Nest-site factors for the sealed nest rate charts: chart id -> the group a
// tunnel falls in (null = leave the cavity out of that chart). Installation year
// and direction are split by Log/Snag as in the deck ("2025 Log", "N Log").
const SEALED_RATE_FACTORS = {
  [CHART_IDS.sealedRateByCwd]: t => t.coarseWoodyDebrisType,
  [CHART_IDS.sealedRateBySubstrate]: t => t.substrateType,
  [CHART_IDS.sealedRateByDirection]: t =>
    (t.direction != null && t.coarseWoodyDebrisType != null ? `${t.direction} ${t.coarseWoodyDebrisType}` : null),
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

// The deck's General ID label for an occupant run, or null when it has none.
function genusLabel({ occupantType, generalId }) {
  if (occupantType === null) return null
  if (occupantCategory(occupantType) === 'Other') return 'Other'
  if (generalId === null) return null
  return generalId === 'Other' ? `Other (${occupantType})` : generalId
}

const byCountThenName = (a, b) => b.total - a.total || compareGroups(a.generalId, b.generalId)

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

// ---- Genus profiles (US-36). One profile per bee/wasp General ID, all years combined. ----

const PLUG_DEPTH_LEVELS = ['1.1 inches', '1 inch', '1/2 inch', '1/16 inch', 'flush', 'protruding']
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const ordinal = n => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]} season`

// Panels with an availability tick: where a nest sits vs. where cavities exist.
// `level` is a function of a cavity-year (its tunnel and year), or null to skip it.
const PROFILE_PANELS = {
  direction: { level: c => c.tunnel.direction ?? null, order: level => COMPASS.indexOf(level) },
  age: { level: c => (c.tunnel.installationYear != null ? c.year - c.tunnel.installationYear + 1 : null) },
  cwd: { level: c => c.tunnel.coarseWoodyDebrisType ?? null },
  substrate: { level: c => c.tunnel.substrateType ?? null },
  diameter: { level: c => (c.tunnel.tunnelDiameterInches != null ? String(c.tunnel.tunnelDiameterInches) : null) },
}

// A nest's plug depth is the last one recorded during its run.
function lastPlugDepth(observations) {
  return [...observations].reverse().find(o => o.plugDepth != null)?.plugDepth ?? null
}

// cavityYears: [{ year, siteId, tunnel, observations }] (every cavity observed in a year).
function buildGenusProfiles(cavityYears) {
  const available = cavityYears.filter(c => !isExcludedCavity(c.observations))
  const nestsByGenus = new Map()
  for (const cavity of cavityYears) {
    for (const run of splitOccupantRuns(cavity.observations)) {
      const label = genusLabel(run)
      if (label === null || label === 'Unknown' || label.startsWith('Other')) continue
      if (!nestsByGenus.has(label)) nestsByGenus.set(label, [])
      nestsByGenus.get(label).push({ cavity, run })
    }
  }

  const profiles = {}
  for (const generalId of [...nestsByGenus.keys()].sort(compareGroups)) {
    const nests = nestsByGenus.get(generalId)
    const cavities = [...new Set(nests.map(n => n.cavity))]
    const sharedWith = new Map()
    let shared = 0
    for (const cavity of cavities) {
      const others = new Set(splitOccupantRuns(cavity.observations).map(r => r.generalId)
        .filter(id => id !== null && id !== generalId))
      if (others.size > 0) shared += 1
      for (const id of others) sharedWith.set(id, (sharedWith.get(id) ?? 0) + 1)
    }

    const panels = {}
    for (const [name, { level, order }] of Object.entries(PROFILE_PANELS)) {
      const availableBy = new Map()
      for (const cavity of available) {
        const key = level(cavity)
        if (key !== null) availableBy.set(key, (availableBy.get(key) ?? 0) + 1)
      }
      const nestsBy = new Map()
      for (const { cavity } of nests) {
        const key = level(cavity)
        if (key !== null) nestsBy.set(key, (nestsBy.get(key) ?? 0) + 1)
      }
      const keys = [...availableBy.keys()].sort(name === 'age'
        ? (a, b) => a - b
        : (a, b) => (order ? order(a) - order(b) : compareGroups(String(a), String(b))))
      panels[name] = {
        nests: [...nestsBy.values()].reduce((sum, count) => sum + count, 0),
        availableTotal: [...availableBy.values()].reduce((sum, count) => sum + count, 0),
        rows: keys.map(key => ({
          level: name === 'age' ? ordinal(key) : key,
          nests: nestsBy.get(key) ?? 0,
          available: availableBy.get(key),
        })),
      }
    }
    // Plug depth leaves out 2023 and has no availability tick.
    const depthCounts = new Map()
    for (const { cavity, run } of nests) {
      const depth = cavity.year === 2023 ? null : lastPlugDepth(run.observations)
      if (PLUG_DEPTH_LEVELS.includes(depth)) depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + 1)
    }
    panels.plugDepth = {
      nests: [...depthCounts.values()].reduce((sum, count) => sum + count, 0),
      rows: PLUG_DEPTH_LEVELS.map(level => ({ level, nests: depthCounts.get(level) ?? 0 })),
    }

    profiles[generalId] = {
      generalId,
      nests: nests.length,
      years: [...new Set(nests.map(n => n.cavity.year))].sort((a, b) => a - b),
      sites: new Set(nests.map(n => n.cavity.siteId)).size,
      sealedNests: nests.filter(n => n.run.observations.some(o => o.wholeOrHole === SEALED_VALUE)).length,
      parasitized: nests.filter(n => n.run.observations.some(o => o.wholeOrHole === 'Parasitism')).length,
      competition: {
        cavities: cavities.length,
        shared,
        sharedWith: [...sharedWith].map(([id, count]) => ({ generalId: id, cavities: count }))
          .sort((a, b) => b.cavities - a.cavities || compareGroups(a.generalId, b.generalId)),
      },
      panels,
    }
  }
  return profiles
}

// ---- Observation periods (US-31): the deck's fixed two-week calendar. ----

const DAY_MS = 86400000
const PERIOD_DAYS = 14
const seasonStart = year => Date.UTC(year, 2, 11)
const isoDate = ms => new Date(ms).toISOString().slice(0, 10)

// Index of the 14-day period (0 = starting 11 March) a survey date falls in, or null before the season.
function periodIndex(surveyDate) {
  const days = Math.floor((Date.parse(surveyDate) - seasonStart(Number(surveyDate.slice(0, 4)))) / DAY_MS)
  return days < 0 ? null : Math.floor(days / PERIOD_DAYS)
}

// Per period, how many cavities were occupied by each category: a cavity counts once per
// category in every period it has an occupied observation with a recorded type.
function periodCounts(cavities, keys, categorize, include) {
  const byPeriod = new Map()
  for (const { observations } of cavities) {
    const seen = new Set()
    for (const o of observations) {
      if (!isOccupiedStatus(o.observationStatus) || o.occupantType == null || !include(o.occupantType)) continue
      const period = periodIndex(o.surveyDate)
      if (period === null) continue
      seen.add(`${period}|${categorize(o.occupantType)}`)
    }
    for (const entry of seen) {
      const [period, category] = entry.split('|')
      const counts = byPeriod.get(Number(period)) ?? { ...zeroCounts(keys), total: 0 }
      counts[category] += 1
      counts.total += 1
      byPeriod.set(Number(period), counts)
    }
  }
  return byPeriod
}

// Rows for every period from the start of the season through one period past the last
// survey (empty periods are kept so the season's shape is honest).
function periodRows(year, lastSurveyPeriod, keys, byPeriod) {
  return Array.from({ length: lastSurveyPeriod + 2 }, (_, period) => ({
    period,
    start: isoDate(seasonStart(year) + period * PERIOD_DAYS * DAY_MS),
    end: isoDate(seasonStart(year) + (period * PERIOD_DAYS + PERIOD_DAYS - 1) * DAY_MS),
    ...(byPeriod.get(period) ?? { ...zeroCounts(keys), total: 0 }),
  }))
}

// ---- Site scorecards (US-35) ----

export const SCORE_THRESHOLD = 0.30
export const SCORE_MAX = 24
export const FLAGGED_CATEGORY = 'Flagged for Evaluation'
// Inferred boundaries (to confirm with Circle Ecology): the deck shows 5 = Low, 11-15 = High, 16-17 = Very High.
const SCORE_CATEGORIES = [{ min: 16, name: 'Very High' }, { min: 8, name: 'High' }, { min: 0, name: 'Low' }]
const FLAG_CONDITIONS = ['parasitism', 'chalkbrood', 'competition', 'other', 'megachile', 'osmiaMud']
const BONUS_CONDITIONS = ['parasitism', 'competition', 'other']
const SCORE_THRESHOLD_PERCENT = Math.round(SCORE_THRESHOLD * 100)

// Integer arithmetic so that exactly 30% is never flagged by a rounding error.
const exceedsThreshold = ({ numerator, denominator }) => numerator * 100 > SCORE_THRESHOLD_PERCENT * denominator
const withinThreshold = ({ numerator, denominator }) => numerator > 0 && numerator * 100 <= SCORE_THRESHOLD_PERCENT * denominator

/**
 * Pure: score one site in one year. `summary` is
 * { presentGenera, uniqueGenera, emergenceRecorded, conditions: { [id]: { numerator, denominator } } }.
 * +1 per genus present; +1 for each of Parasitism, Competition and Other Occupants that is above 0% and
 * at most 30%; +1 if Emergence is recorded; +1 (once) if any genus was found only at this site. Any
 * flag condition above 30% sets the score to 0 and the category to "Flagged for Evaluation".
 */
export function scoreSite({ presentGenera, uniqueGenera, emergenceRecorded, conditions }) {
  const flags = FLAG_CONDITIONS.filter(id => exceedsThreshold(conditions[id]))
  if (flags.length > 0) {
    return { score: 0, max: SCORE_MAX, category: FLAGGED_CATEGORY, flagged: true, flags, bonuses: [] }
  }
  const bonuses = BONUS_CONDITIONS.filter(id => withinThreshold(conditions[id]))
  if (emergenceRecorded) bonuses.push('emergence')
  if (uniqueGenera.length > 0) bonuses.push('uniqueGenus')
  const score = presentGenera.length + bonuses.length
  const category = SCORE_CATEGORIES.find(({ min }) => score >= min).name
  return { score, max: SCORE_MAX, category, flagged: false, flags: [], bonuses }
}

const ratePercent = ({ numerator, denominator }) => (denominator > 0 ? Math.round((numerator / denominator) * 100) : null)

function conditionState(id, condition) {
  if (FLAG_CONDITIONS.includes(id) && exceedsThreshold(condition)) return 'flag'
  if (BONUS_CONDITIONS.includes(id) && withinThreshold(condition)) return 'bonus'
  return 'none'
}

// Genus a nest counts under on the scorecard: bees, wasps and Unknown only, not the Other occupants.
function scorecardGenus({ occupantType, generalId }) {
  if (occupantType === null || generalId === null || generalId === 'Other') return null
  return occupantCategory(occupantType) === 'Other' ? null : generalId
}

// cavityYears: [{ year, siteId, tunnel, observations }].
function buildScorecards(cavityYears) {
  // Which genera exist (and whether each is a bee or a wasp genus), over all years.
  const votes = new Map()
  for (const { observations } of cavityYears) {
    for (const run of splitOccupantRuns(observations)) {
      const genus = scorecardGenus(run)
      if (genus === null) continue
      const tally = votes.get(genus) ?? { Bee: 0, Wasp: 0 }
      if (run.occupantType === 'Bee' || run.occupantType === 'Wasp') tally[run.occupantType] += 1
      votes.set(genus, tally)
    }
  }
  const groupOf = genus => (genus === 'Unknown' ? 'Unknown' : votes.get(genus).Wasp > votes.get(genus).Bee ? 'Wasp' : 'Bee')
  const groupOrder = { Bee: 0, Wasp: 1, Unknown: 2 }
  const genera = [...new Set([...votes.keys(), 'Unknown'])].map(genus => ({ genus, group: groupOf(genus) }))
    .sort((a, b) => groupOrder[a.group] - groupOrder[b.group] || compareGroups(a.genus, b.genus))

  // Group cavities by year and site.
  const bySiteYear = new Map()
  for (const cavity of cavityYears) {
    const key = `${cavity.year}|${cavity.siteId}`
    if (!bySiteYear.has(key)) bySiteYear.set(key, { year: cavity.year, siteId: cavity.siteId, cavities: [] })
    bySiteYear.get(key).cavities.push(cavity)
  }

  const summaries = [...bySiteYear.values()].map(({ year, siteId, cavities }) => {
    const nests = cavities.flatMap(c => splitOccupantRuns(c.observations)).filter(run => run.occupantType !== null)
    const sealed = nests.filter(run => run.observations.some(o => o.wholeOrHole === SEALED_VALUE))
    const count = (list, test) => list.filter(test).length
    const occupied = cavities.filter(c => classifyCavityOccupancy(c.observations) === 'occupied')
    const multiGenus = occupied.filter(c => new Set(c.observations
      .filter(o => isOccupiedStatus(o.observationStatus)).map(o => o.generalId).filter(id => id != null)).size > 1)
    const hasRecord = value => run => run.observations.some(o => o.wholeOrHole === value)
    const conditions = {
      parasitism: { numerator: count(nests, hasRecord('Parasitism')), denominator: sealed.length },
      chalkbrood: { numerator: count(nests, hasRecord('Chalkbrood Characteristics')), denominator: nests.length },
      competition: { numerator: multiGenus.length, denominator: occupied.length },
      other: { numerator: count(nests, run => occupantCategory(run.occupantType) === 'Other'), denominator: nests.length },
      megachile: { numerator: count(nests, run => run.generalId === 'Megachile (Eutricharaea)'), denominator: nests.length },
      osmiaMud: { numerator: count(nests, run => run.generalId === 'Osmia (mud)'), denominator: nests.length },
    }
    const emergence = { numerator: count(nests, hasRecord('Emergence')), denominator: sealed.length }
    return {
      year, siteId, conditions, emergence,
      siteNumber: cavities.map(c => c.tunnel.blockNumber).find(n => n != null) ?? null,
      presentGenera: [...new Set(nests.map(scorecardGenus).filter(g => g !== null))].sort(compareGroups),
      emergenceRecorded: nests.some(run => (run.occupantType === 'Bee' || run.occupantType === 'Wasp') && hasRecord('Emergence')(run)),
    }
  })

  const entries = summaries.map(summary => {
    const others = summaries.filter(o => o.year === summary.year && o.siteId !== summary.siteId)
    const uniqueGenera = summary.presentGenera.filter(g => !others.some(o => o.presentGenera.includes(g)))
    const scored = scoreSite({ ...summary, uniqueGenera, emergenceRecorded: summary.emergenceRecorded })
    const conditions = Object.fromEntries(Object.entries(summary.conditions).map(([id, c]) =>
      [id, { ...c, rate: ratePercent(c), state: conditionState(id, c) }]))
    conditions.emergence = { ...summary.emergence, rate: ratePercent(summary.emergence), recorded: summary.emergenceRecorded }
    return { year: summary.year, entry: {
      siteId: summary.siteId, siteNumber: summary.siteNumber,
      presentGenera: summary.presentGenera, uniqueGenera, conditions, ...scored,
    } }
  })

  const allSites = {}
  for (const { year, entry } of entries) (allSites[year] ??= []).push(entry)
  const siteLabel = entry => Number(entry.siteNumber ?? Infinity)
  for (const list of Object.values(allSites)) {
    list.sort((a, b) => siteLabel(a) - siteLabel(b) || compareGroups(a.siteId, b.siteId))
  }
  // A site across years: only sites with more than one year of data (the deck leaves out Site 2, 2023 only).
  const siteOverYears = {}
  for (const { year, entry } of entries) (siteOverYears[entry.siteId] ??= {})[year] = entry
  for (const siteId of Object.keys(siteOverYears)) {
    if (Object.keys(siteOverYears[siteId]).length < 2) delete siteOverYears[siteId]
  }
  return { genera, allSites, siteOverYears }
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

  const cavityYears = []
  const charts = {
    [CHART_IDS.occupancyByYear]: {},
    [CHART_IDS.occupancyBySite]: {},
    [CHART_IDS.occupantsByYearType]: {},
    [CHART_IDS.occupantsBySite]: {},
    [CHART_IDS.occupantsBySiteType]: {},
    [CHART_IDS.otherBySiteType]: {},
    [CHART_IDS.occupantsByTypeGenus]: {},
    [CHART_IDS.occupantsByGenus]: {},
    [CHART_IDS.multiGenusCavitiesBySite]: {},
    [CHART_IDS.richnessByDiameterSite]: {},
    [CHART_IDS.occupantsByPeriodType]: {},
    [CHART_IDS.otherByPeriodType]: {},
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

    for (const c of cavities) {
      cavityYears.push({ year: Number(year), siteId: c.siteId, tunnel: c.tunnel, observations: c.observations })
    }
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

    // Genus charts: every occupant run with a General ID label, by type and overall.
    const byGenus = new Map()
    for (const observations of allObservations) {
      for (const run of listOccupantRuns(observations)) {
        const generalId = genusLabel(run)
        if (generalId === null) continue
        const entry = byGenus.get(generalId) ?? { generalId, ...zeroCounts(OCCUPANT_TYPES), total: 0 }
        entry[occupantCategory(run.occupantType)] += 1
        entry.total += 1
        byGenus.set(generalId, entry)
      }
    }
    const genera = [...byGenus.values()].sort(byCountThenName)
    charts[CHART_IDS.occupantsByGenus][year] = genera
    charts[CHART_IDS.occupantsByTypeGenus][year] = OCCUPANT_TYPES.flatMap(occupantType => {
      const inType = genera.filter(row => row[occupantType] > 0)
        .map(row => ({ generalId: row.generalId, occupants: row[occupantType] }))
        .sort((a, b) => b.occupants - a.occupants || compareGroups(a.generalId, b.generalId))
      const typeTotal = inType.reduce((sum, row) => sum + row.occupants, 0)
      return inType.map(row => ({ occupantType, ...row, typeTotal }))
    })
    // Occupied cavities holding more than one General ID in the year, by site.
    charts[CHART_IDS.multiGenusCavitiesBySite][year] = [...bySite]
      .sort(([a], [b]) => byText(a, b))
      .map(([siteId, group]) => ({
        siteId,
        propertyName: siteById.get(siteId)?.propertyName ?? null,
        multiGenus: group.filter(observations =>
          new Set(listOccupantRuns(observations).map(run => run.generalId).filter(id => id !== null)).size > 1).length,
        occupied: group.filter(observations => classifyCavityOccupancy(observations) === 'occupied').length,
      }))

    // Seasonal occupancy by two-week observation period.
    const periods = observations.filter(o => yearOf(o) === year).map(o => periodIndex(o.surveyDate)).filter(p => p !== null)
    const lastPeriod = periods.length ? Math.max(...periods) : -1
    charts[CHART_IDS.occupantsByPeriodType][year] = periodRows(
      Number(year), lastPeriod, OCCUPANT_TYPES, periodCounts(cavities, OCCUPANT_TYPES, occupantCategory, () => true))
    charts[CHART_IDS.otherByPeriodType][year] = periodRows(
      Number(year), lastPeriod, OTHER_OCCUPANT_TYPES,
      periodCounts(cavities, OTHER_OCCUPANT_TYPES, otherCategory, type => occupantCategory(type) === 'Other'))

    // Richness: distinct General IDs among bee and wasp nests, by diameter and site.
    const richness = new Map()
    for (const c of cavities) {
      if (c.tunnel.tunnelDiameterInches == null) continue
      const diameter = String(c.tunnel.tunnelDiameterInches)
      const key = `${diameter}|${c.siteId}`
      const entry = richness.get(key) ?? { diameter, siteId: c.siteId, genera: { Bee: new Set(), Wasp: new Set() } }
      for (const run of listOccupantRuns(c.observations)) {
        if (entry.genera[run.occupantType] && run.generalId !== null) entry.genera[run.occupantType].add(run.generalId)
      }
      richness.set(key, entry)
    }
    charts[CHART_IDS.richnessByDiameterSite][year] = [...richness.values()]
      .sort((a, b) => Number(a.diameter) - Number(b.diameter) || byText(a.siteId, b.siteId))
      .map(({ diameter, siteId, genera }) => ({
        diameter, siteId, propertyName: siteById.get(siteId)?.propertyName ?? null,
        Bee: genera.Bee.size, Wasp: genera.Wasp.size,
      }))

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
  charts[CHART_IDS.genusProfile] = buildGenusProfiles(cavityYears)
  const scorecards = buildScorecards(cavityYears)
  charts[CHART_IDS.scorecardGenera] = { all: scorecards.genera }
  charts[CHART_IDS.scorecardAllSites] = scorecards.allSites
  charts[CHART_IDS.scorecardSiteOverYears] = scorecards.siteOverYears
  return { generatedAt, years: years.map(Number), charts }
}
