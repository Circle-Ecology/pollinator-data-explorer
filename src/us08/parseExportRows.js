
import { parseCoordinatePair } from './parseCoordinatePair.js'
import { normalizeNaValue } from './normalizeNaValue.js'

function normalizeNumber(raw) {
  const value = normalizeNaValue(raw)

  if (value === null) return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeBoolean(raw) {
  const value = normalizeNaValue(raw)

  if (value === null) return null
  if (typeof value === 'boolean') return value

  const normalized = String(value).trim().toLowerCase()

  if (normalized === 'true' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === 'no') return false

  return null
}

// Report each type of conflict once per site or tunnel.
// Keep the first record rather than silently overwriting data.
function reportFieldConflicts(
  existing,
  incoming,
  fields,
  entityId,
  code,
  errors,
  reportedConflicts
) {
  for (const field of fields) {
    const oldValue = existing[field]
    const newValue = incoming[field]

    // A missing value alone is not considered a conflict.
    if (oldValue === null || newValue === null) continue
    if (oldValue === newValue) continue

    const conflictKey = `${code}:${entityId}:${field}`

    if (reportedConflicts.has(conflictKey)) continue
    reportedConflicts.add(conflictKey)

    errors.push({
      code,
      message: `Conflicting ${field} for ${entityId}`,
      entityId,
      field,
      originalValue: oldValue,
      conflictingValue: newValue,
    })
  }
}

export function parseExportRows(rows, importBatchId) {
  const sitesByName = new Map()
  const tunnelsById = new Map()
  const surveysByKey = new Map()
  const errors = []

  const reportedConflicts = new Set()

  for (const row of rows) {
    const propertyName = normalizeNaValue(row['Property Name'])
    const city = normalizeNaValue(row['City'])
    const state = normalizeNaValue(row['State'])
    const tunnelId = normalizeNaValue(row['Unique ID'])
    const surveyDate = normalizeNaValue(row['Observation Date'])

    const coordinates =
      row.__parsedCoordinates ??
      parseCoordinatePair(row['Coordinates'])

    const isPublic = normalizeBoolean(row['Is Public'])

    const site = {
      siteId: propertyName,
      propertyName,
      city,
      state,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      elevationMeters: normalizeNumber(row['Elevation (meters)']),
      isPublic,
    }

    // Create one Site per property.
    if (!sitesByName.has(propertyName)) {
      sitesByName.set(propertyName, site)
    } else {
      const existingSite = sitesByName.get(propertyName)

      // Preserve the existing coordinate conflict error.
      if (
        existingSite.latitude !== site.latitude ||
        existingSite.longitude !== site.longitude
      ) {
        const conflictKey = `COORDINATE_CONFLICT:${propertyName}`

        if (!reportedConflicts.has(conflictKey)) {
          reportedConflicts.add(conflictKey)

          errors.push({
            code: 'COORDINATE_CONFLICT',
            message: `Conflicting coordinates for property: ${propertyName}`,
            propertyName,
          })
        }
      }

      // Preserve the existing public visibility conflict error.
      if (
        existingSite.isPublic !== null &&
        site.isPublic !== null &&
        existingSite.isPublic !== site.isPublic
      ) {
        const conflictKey =
          `PUBLIC_VISIBILITY_CONFLICT:${propertyName}`

        if (!reportedConflicts.has(conflictKey)) {
          reportedConflicts.add(conflictKey)

          errors.push({
            code: 'PUBLIC_VISIBILITY_CONFLICT',
            message: `Conflicting public visibility for property: ${propertyName}`,
            propertyName,
          })
        }
      }

      // Detect conflicting site attributes.
      reportFieldConflicts(
        existingSite,
        site,
        ['city', 'state', 'elevationMeters'],
        propertyName,
        'SITE_ATTRIBUTE_CONFLICT',
        errors,
        reportedConflicts
      )
    }

    if (tunnelId) {
      const tunnel = {
        tunnelId,
        siteId: propertyName,
        blockNumber: normalizeNaValue(row['Block # (site)']),
        direction: normalizeNaValue(row['Direction']),
        installationYear: normalizeNumber(row['Installation Year']),
        tunnelDiameterInches: normalizeNumber(
          row['Tunnel Diameter (inches)']
        ),
        coarseWoodyDebrisType: normalizeNaValue(
          row['Coarse Woody Debris Type'] ?? row['Type']
        ),
        substrateType: normalizeNaValue(row['Substrate Type']),
        sunExposure: normalizeNaValue(row['Sun Exposure']),
        gridRow: normalizeNaValue(row['Row']),
        gridColumn: normalizeNaValue(row['Column']),
      }

      // Create one Tunnel per unique tunnel ID.
      if (!tunnelsById.has(tunnelId)) {
        tunnelsById.set(tunnelId, tunnel)
      } else {
        const existingTunnel = tunnelsById.get(tunnelId)

        if (existingTunnel.siteId !== propertyName) {
          const conflictKey =
            `TUNNEL_SITE_CONFLICT:${tunnelId}`

          if (!reportedConflicts.has(conflictKey)) {
            reportedConflicts.add(conflictKey)

            errors.push({
              code: 'TUNNEL_SITE_CONFLICT',
              message: `Tunnel ${tunnelId} belongs to multiple properties`,
              tunnelId,
              originalSiteId: existingTunnel.siteId,
              conflictingSiteId: propertyName,
            })
          }
        }

        // Detect differences in other tunnel attributes.
        reportFieldConflicts(
          existingTunnel,
          tunnel,
          [
            'blockNumber',
            'direction',
            'installationYear',
            'tunnelDiameterInches',
            'coarseWoodyDebrisType',
            'substrateType',
            'sunExposure',
            'gridRow',
            'gridColumn',
          ],
          tunnelId,
          'TUNNEL_ATTRIBUTE_CONFLICT',
          errors,
          reportedConflicts
        )
      }
    }

    // Create one Survey per tunnel and survey date.
    if (tunnelId && surveyDate) {
      const surveyKey = `${tunnelId}:${surveyDate}`

      const survey = {
        tunnelId,
        surveyDate,
        observationStatus: normalizeNaValue(
          row['Observation Status']
        ),
        occupantType: normalizeNaValue(row['Occupant type']),
        nesterFamily: normalizeNaValue(row['Nester of family']),
        generalId: normalizeNaValue(row['General ID']),
        commonName: normalizeNaValue(row['Common Name']),
        plugDepth: normalizeNumber(row['Plug Depth']),
        plugComposition: normalizeNaValue(
          row['Plug Composition']
        ),
        plugColor: normalizeNaValue(row['Plug Color']),
        plugConfidence: normalizeNaValue(
          row['Plug confidence']
        ),
        wholeOrHole: normalizeNaValue(row['Whole or hole']),
        emergenceYear: normalizeNumber(row['Emergence Year']),
        manufacturedEmpty: normalizeBoolean(
          row['Manufactured Empty']
        ),
        recordStatus: 'pending',
        importBatchId,
      }

      if (!surveysByKey.has(surveyKey)) {
        surveysByKey.set(surveyKey, survey)
      } else {
        const existingSurvey = surveysByKey.get(surveyKey)

        const hasConflict = Object.keys(survey).some(
          (key) => existingSurvey[key] !== survey[key]
        )

        if (hasConflict) {
          const conflictKey = `DUPLICATE_SURVEY:${surveyKey}`

          if (!reportedConflicts.has(conflictKey)) {
            reportedConflicts.add(conflictKey)

            errors.push({
              code: 'DUPLICATE_SURVEY',
              message: `Conflicting survey records for ${surveyKey}`,
              tunnelId,
              surveyDate,
            })
          }
        }
      }
    }
  }

  return {
    sites: Array.from(sitesByName.values()),
    tunnels: Array.from(tunnelsById.values()),
    surveys: Array.from(surveysByKey.values()),
    errors,
  }
}
