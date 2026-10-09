
import { parseCoordinatePair } from './parseCoordinatePair.js'
import { normalizeNaValue } from './normalizeNaValue.js'

// Convert CSV numbers to actual numbers
function normalizeNumber(raw) {
  const value = normalizeNaValue(raw)

  if (value === null) return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// Convert CSV true/false values to booleans
function normalizeBoolean(raw) {
  const value = normalizeNaValue(raw)

  if (value === null) return null
  if (typeof value === 'boolean') return value

  const normalized = String(value).toLowerCase()

  if (normalized === 'true' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === 'no') return false

  return null
}

export function parseExportRows(rows, importBatchId) {
  const sitesByName = new Map()
  const tunnelsById = new Map()
  const surveysByKey = new Map()
  const errors = []
  const coordinateConflicts = new Set()
  const visibilityConflicts = new Set()

  for (const row of rows) {
    const propertyName = normalizeNaValue(row['Property Name'])
    const city = normalizeNaValue(row['City'])
    const state = normalizeNaValue(row['State'])
    const tunnelId = normalizeNaValue(row['Unique ID'])
    const surveyDate = normalizeNaValue(row['Observation Date'])

    const coordinates =
      row.__parsedCoordinates ?? parseCoordinatePair(row['Coordinates'])

    const isPublic = normalizeBoolean(row['Is Public'])

    // Create one Site per property
    if (!sitesByName.has(propertyName)) {
      sitesByName.set(propertyName, {
        siteId: propertyName,
        propertyName,
        city,
        state,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        elevationMeters: normalizeNumber(row['Elevation (meters)']),
        isPublic,
      })
    } else {
      const existingSite = sitesByName.get(propertyName)

      if (
        (existingSite.latitude !== coordinates.latitude ||
          existingSite.longitude !== coordinates.longitude) &&
        !coordinateConflicts.has(propertyName)
      ) {
        coordinateConflicts.add(propertyName)

        errors.push({
          code: 'COORDINATE_CONFLICT',
          message: `Conflicting coordinates for property: ${propertyName}`,
          propertyName,
        })
      }

      // Report conflicting public visibility settings
      if (
        existingSite.isPublic !== null &&
        isPublic !== null &&
        existingSite.isPublic !== isPublic &&
        !visibilityConflicts.has(propertyName)
      ) {
        visibilityConflicts.add(propertyName)

        errors.push({
          code: 'PUBLIC_VISIBILITY_CONFLICT',
          message: `Conflicting public visibility for property: ${propertyName}`,
          propertyName,
        })
      }
    }

    // Create one Tunnel per unique tunnel ID
    if (tunnelId && !tunnelsById.has(tunnelId)) {
      tunnelsById.set(tunnelId, {
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
      })
    } else if (tunnelId) {
      const existingTunnel = tunnelsById.get(tunnelId)

      // Report when the same tunnel ID belongs to different sites
      if (existingTunnel.siteId !== propertyName) {
        errors.push({
          code: 'TUNNEL_SITE_CONFLICT',
          message: `Tunnel ${tunnelId} belongs to multiple properties`,
          tunnelId,
          originalSiteId: existingTunnel.siteId,
          conflictingSiteId: propertyName,
        })
      }
    }

    // Create one Survey per unique tunnel and date
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

        // Report duplicate surveys when their data differs
        const hasConflict = Object.keys(survey).some(
          (key) => existingSurvey[key] !== survey[key]
        )

        if (hasConflict) {
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

  return {
    sites: Array.from(sitesByName.values()),
    tunnels: Array.from(tunnelsById.values()),
    surveys: Array.from(surveysByKey.values()),
    errors,
  }
}
