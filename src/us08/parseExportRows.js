
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

  for (const row of rows) {
    const propertyName = normalizeNaValue(row['Property Name'])
    const city = normalizeNaValue(row['City'])
    const state = normalizeNaValue(row['State'])
    const tunnelId = normalizeNaValue(row['Unique ID'])
    const surveyDate = normalizeNaValue(row['Observation Date'])

    const coordinates = parseCoordinatePair(row['Coordinates'])

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
        isPublic: normalizeBoolean(row['Is Public']),
      })
    } else {
      const existingSite = sitesByName.get(propertyName)

      if (
        existingSite.latitude !== coordinates.latitude ||
        existingSite.longitude !== coordinates.longitude
      ) {
        errors.push({
          code: 'COORDINATE_CONFLICT',
          message: `Conflicting coordinates for property: ${propertyName}`,
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
    }

    // Create one Survey per unique tunnel and date
    if (tunnelId && surveyDate) {
      const surveyKey = `${tunnelId}:${surveyDate}`

      if (!surveysByKey.has(surveyKey)) {
        surveysByKey.set(surveyKey, {
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
        })
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
