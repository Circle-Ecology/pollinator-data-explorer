
import { CONFLICT_CODES } from '../us08/parseExportRows.js'

// These allowlists mirror docs/data-contract.md. Never spread source records here.
const SITE_FIELDS = {
  siteId: 'string',
  propertyName: 'string',
  city: 'string',
  state: 'string',
  latitude: 'number',
  longitude: 'number',
  elevationMeters: 'number',
}

const TUNNEL_FIELDS = {
  tunnelId: 'string',
  siteId: 'string',
  blockNumber: 'string',
  direction: 'string',
  installationYear: 'number',
  tunnelDiameterInches: 'number',
  coarseWoodyDebrisType: 'string',
  substrateType: 'string',
  sunExposure: 'string',
  gridRow: 'string',
  gridColumn: 'string',
}

const SURVEY_FIELDS = {
  tunnelId: 'string',
  surveyDate: 'string',
  observationStatus: 'string',
  occupantType: 'string',
  nesterFamily: 'string',
  generalId: 'string',
  commonName: 'string',
  plugDepth: 'number',
  plugComposition: 'string',
  plugColor: 'string',
  plugConfidence: 'string',
  wholeOrHole: 'string',
  emergenceYear: 'number',
  manufacturedEmpty: 'boolean',
  recordStatus: 'string',
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function identifier(value) {
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value !== value.trim()
  ) {
    throw new TypeError('Invalid normalized identifier')
  }
  return value
}

function lookup(records, key) {
  const result = new Map()

  for (const record of records) {
    const id = identifier(record[key])

    if (result.has(id)) {
      throw new TypeError('Duplicate normalized identity')
    }

    result.set(id, record)
  }

  return result
}

function project(record, fields, required) {
  const output = {}

  for (const [key, type] of Object.entries(fields)) {
    const value = record[key] ?? null

    if (
      (value === null && required.includes(key)) ||
      (value !== null &&
        (typeof value !== type ||
          (type === 'number' && !Number.isFinite(value))))
    ) {
      throw new TypeError('Invalid public field')
    }

    output[key] = value
  }

  return output
}

function publicSite(site) {
  const output = project(
    site,
    SITE_FIELDS,
    ['siteId', 'propertyName', 'latitude', 'longitude']
  )

  if (
    output.propertyName.trim() === '' ||
    Math.abs(output.latitude) > 90 ||
    Math.abs(output.longitude) > 180
  ) {
    throw new TypeError('Invalid public field')
  }

  return output
}

function publicTunnel(tunnel) {
  return project(
    tunnel,
    TUNNEL_FIELDS,
    ['tunnelId', 'siteId']
  )
}

function publicSurvey(survey, siteId) {
  const date = survey.surveyDate

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    throw new TypeError('Invalid public survey date')
  }

  // siteId comes from the verified tunnel-to-site relationship.
  return {
    siteId: identifier(siteId),
    ...project(
      survey,
      SURVEY_FIELDS,
      ['tunnelId', 'surveyDate', 'recordStatus']
    ),
  }
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Exclude entities with conflicting source information.
function conflictedIds(errors, codeToIdField) {
  const ids = new Set()

  for (const error of errors) {
    if (!isRecord(error)) continue

    const idField = codeToIdField[error.code]

    if (idField) {
      ids.add(error[idField])
    }
  }

  return ids
}

function conflictedSurveyKeys(errors) {
  const keys = new Set()

  for (const error of errors) {
    if (
      isRecord(error) &&
      error.code in CONFLICT_CODES.survey
    ) {
      keys.add(`${error.tunnelId}:${error.surveyDate}`)
    }
  }

  return keys
}

/**
 * Count entities excluded because of reported conflicts.
 */
export function countConflictedEntities(parsedResult) {
  if (
    !isRecord(parsedResult) ||
    !Array.isArray(parsedResult.errors)
  ) {
    return 0
  }

  return (
    conflictedIds(parsedResult.errors, CONFLICT_CODES.site).size +
    conflictedIds(parsedResult.errors, CONFLICT_CODES.tunnel).size +
    conflictedSurveyKeys(parsedResult.errors).size
  )
}

/**
 * Generate the public dataset from normalized import records.
 *
 * Only explicitly approved fields are projected.
 * Private sites and conflicted entities are excluded.
 * Internal status is retained for internal callers only.
 */
export function generatePublicDataset(parsedResult) {
  if (
    !isRecord(parsedResult) ||
    !Number.isSafeInteger(parsedResult.totalRows) ||
    parsedResult.totalRows < 0 ||
    !Number.isSafeInteger(parsedResult.invalidRows) ||
    parsedResult.invalidRows < 0 ||
    !Array.isArray(parsedResult.errors) ||
    !['sites', 'tunnels', 'surveys'].every(
      key => Array.isArray(parsedResult[key])
    )
  ) {
    throw new TypeError('Invalid normalized import')
  }

  for (const key of ['sites', 'tunnels', 'surveys']) {
    if (!parsedResult[key].every(isRecord)) {
      throw new TypeError('Invalid normalized record')
    }
  }

  const conflictedSiteIds = conflictedIds(
    parsedResult.errors,
    CONFLICT_CODES.site
  )

  const conflictedTunnelIds = conflictedIds(
    parsedResult.errors,
    CONFLICT_CODES.tunnel
  )

  const conflictedSurveys = conflictedSurveyKeys(
    parsedResult.errors
  )

  const sitesById = lookup(
    parsedResult.sites.filter(
      site => !conflictedSiteIds.has(site.siteId)
    ),
    'siteId'
  )

  const tunnelsById = lookup(
    parsedResult.tunnels.filter(
      tunnel => !conflictedTunnelIds.has(tunnel.tunnelId)
    ),
    'tunnelId'
  )

  for (const tunnel of tunnelsById.values()) {
    identifier(tunnel.siteId)
  }

  // Publish only tunnels belonging to verified public sites.
  const tunnels = []

  for (const tunnel of tunnelsById.values()) {
    const site = sitesById.get(tunnel.siteId)

    if (!site || site.isPublic !== true) {
      continue
    }

    tunnels.push(publicTunnel(tunnel))
  }

  const surveysByKey = new Map()

  for (const survey of parsedResult.surveys) {
    if (
      conflictedSurveys.has(
        `${survey.tunnelId}:${survey.surveyDate}`
      )
    ) {
      continue
    }

    // Only approved survey records may be published.
    if (survey.recordStatus !== 'approved') {
      continue
    }

    const tunnel = tunnelsById.get(
      identifier(survey.tunnelId)
    )

    const site = tunnel && sitesById.get(tunnel.siteId)

    if (!site || site.isPublic !== true) {
      continue
    }

    const output = publicSurvey(survey, site.siteId)

    const key = JSON.stringify([
      output.tunnelId,
      output.surveyDate,
    ])

    const existing = surveysByKey.get(key)

    if (
      existing &&
      JSON.stringify(existing) !== JSON.stringify(output)
    ) {
      throw new TypeError('Conflicting public survey')
    }

    if (!existing) {
      surveysByKey.set(key, output)
    }
  }

  const sites = Array.from(sitesById.values())
    .filter(site => site.isPublic === true)
    .map(publicSite)

  const observations = Array.from(
    surveysByKey.values()
  )

  sites.sort((a, b) =>
    compare(a.siteId, b.siteId)
  )

  tunnels.sort((a, b) =>
    compare(a.tunnelId, b.tunnelId)
  )

  observations.sort((a, b) =>
    compare(a.tunnelId, b.tunnelId) ||
    compare(a.surveyDate, b.surveyDate)
  )

  return {
    sites,
    tunnels,
    observations,
    status: parsedResult,
  }
}
