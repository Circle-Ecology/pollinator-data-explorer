
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

// Report each conflicting field once per entity.
// Preserve the first record rather than overwriting it.
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

    if (oldValue == null || newValue == null) continue
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

// Resolve coordinates for both validated CSV rows
// and direct calls to parseExportRows.
function resolveCoordinates(row, errors) {
  if (row.__parsedCoordinates != null) {
    return row.__parsedCoordinates
  }

  try {
    return parseCoordinatePair(row['Coordinates'])
  } catch {
    errors.push({
      code: 'MALFORMED_COORDINATES',
      rowNumber: row.__csvRowNumber ?? null,
      message: 'Invalid coordinates',
    })

    return null
  }
}

export function parseExportRows(rows, importBatchId) {
  const sitesByName = new Map()
  const tunnelsById = new Map()
  const surveysByKey = new Map()
  const errors = []
  const reportedConflicts = new Set()

  for (const row of rows) {
    const coordinates = resolveCoordinates(row, errors)

    // Skip malformed coordinates without crashing.
    if (coordinates === null) continue

    const propertyName = normalizeNaValue(row['Property Name'])
    const city = normalizeNaValue(row['City'])
    const state = normalizeNaValue(row['State'])
    const tunnelId = normalizeNaValue(row['Unique ID'])
    const surveyDate = normalizeNaValue(row['Observation Date'])
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

    if (!sitesByName.has(propertyName)) {
      sitesByName.set(propertyName, site)
    } else {
      const existingSite = sitesByName.get(propertyName)

      // Keep the existing coordinate conflict error shape.
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

      // Keep the existing public visibility conflict error shape.
      if (
        existingSite.isPublic !== null &&
        site.isPublic !== null &&
        existingSite.isPublic !== site.isPublic
      ) {
        const conflictKey = `PUBLIC_VISIBILITY_CONFLICT:${propertyName}`

        if (!reportedConflicts.has(conflictKey)) {
          reportedConflicts.add(conflictKey)

          errors.push({
            code: 'PUBLIC_VISIBILITY_CONFLICT',
            message: `Conflicting public visibility for property: ${propertyName}`,
            propertyName,
          })
        }
      }

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

      if (!tunnelsById.has(tunnelId)) {
        tunnelsById.set(tunnelId, tunnel)
      } else {
        const existingTunnel = tunnelsById.get(tunnelId)

        if (existingTunnel.siteId !== propertyName) {
          const conflictKey = `TUNNEL_SITE_CONFLICT:${tunnelId}`

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
