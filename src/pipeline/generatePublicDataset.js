// These allowlists mirror docs/data-contract.md. Never spread source records here.
const SITE_FIELDS = {
  siteId: 'string', propertyName: 'string', city: 'string', state: 'string',
  latitude: 'number', longitude: 'number', elevationMeters: 'number',
}
const SURVEY_FIELDS = {
  tunnelId: 'string', surveyDate: 'string', observationStatus: 'string',
  occupantType: 'string', nesterFamily: 'string', generalId: 'string', commonName: 'string',
  plugDepth: 'number', plugComposition: 'string', plugColor: 'string', plugConfidence: 'string',
  wholeOrHole: 'string', emergenceYear: 'number', manufacturedEmpty: 'boolean', recordStatus: 'string',
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function identifier(value) {
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim()) {
    throw new TypeError('Invalid normalized identifier')
  }
  return value
}

function lookup(records, key) {
  const result = new Map()
  for (const record of records) {
    const id = identifier(record[key])
    if (result.has(id)) throw new TypeError('Duplicate normalized identity')
    result.set(id, record)
  }
  return result
}

function project(record, fields, required) {
  const output = {}
  for (const [key, type] of Object.entries(fields)) {
    const value = record[key] ?? null
    if ((value === null && required.includes(key)) ||
      (value !== null && (typeof value !== type ||
        (type === 'number' && !Number.isFinite(value))))) {
      throw new TypeError('Invalid public field')
    }
    output[key] = value
  }
  return output
}

function publicSite(site) {
  const output = project(site, SITE_FIELDS, ['siteId', 'propertyName', 'latitude', 'longitude'])
  if (output.propertyName.trim() === '' || Math.abs(output.latitude) > 90 || Math.abs(output.longitude) > 180) {
    throw new TypeError('Invalid public field')
  }
  return output
}

function publicSurvey(survey) {
  const date = survey.surveyDate
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new TypeError('Invalid public survey date')
  }
  return project(survey, SURVEY_FIELDS, ['tunnelId', 'surveyDate', 'recordStatus'])
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Pure public projection of a normalized US-08 ImportValidationResult.
 * `status` retains that INTERNAL result per #32; never serialize it publicly.
 * Missing optional public scalars become null; invalid eligible scalars throw.
 * Sites are explicitly public sites, including those without approved surveys.
 */
export function generatePublicDataset(parsedResult) {
  if (!isRecord(parsedResult) || !Number.isSafeInteger(parsedResult.totalRows) || parsedResult.totalRows < 0 ||
    !Number.isSafeInteger(parsedResult.invalidRows) || parsedResult.invalidRows < 0 ||
    !Array.isArray(parsedResult.errors) ||
    !['sites', 'tunnels', 'surveys'].every(key => Array.isArray(parsedResult[key]))) {
    throw new TypeError('Invalid normalized import')
  }
  if (parsedResult.errors.length || parsedResult.invalidRows || parsedResult.isValid === false) {
    throw new TypeError('Cannot generate from an invalid import')
  }
  for (const key of ['sites', 'tunnels', 'surveys']) {
    if (!parsedResult[key].every(isRecord)) throw new TypeError('Invalid normalized record')
  }
  const sitesById = lookup(parsedResult.sites, 'siteId')
  const tunnelsById = lookup(parsedResult.tunnels, 'tunnelId')
  for (const tunnel of tunnelsById.values()) identifier(tunnel.siteId)

  const surveysByKey = new Map()
  for (const survey of parsedResult.surveys) {
    // Exact authorization checks precede projection; no truthy/case coercion.
    if (survey.recordStatus !== 'approved') continue
    const tunnel = tunnelsById.get(identifier(survey.tunnelId))
    const site = tunnel && sitesById.get(tunnel.siteId)
    if (!site || site.isPublic !== true) continue
    const output = publicSurvey(survey)
    const key = JSON.stringify([output.tunnelId, output.surveyDate])
    const existing = surveysByKey.get(key)
    if (existing && JSON.stringify(existing) !== JSON.stringify(output)) {
      throw new TypeError('Conflicting public survey')
    }
    if (!existing) surveysByKey.set(key, output)
  }

  const sites = Array.from(sitesById.values()).filter(site => site.isPublic === true).map(publicSite)
  const observations = Array.from(surveysByKey.values())
  sites.sort((a, b) => compare(a.siteId, b.siteId))
  observations.sort((a, b) => compare(a.tunnelId, b.tunnelId) || compare(a.surveyDate, b.surveyDate))
  return { sites, observations, status: parsedResult }
}
