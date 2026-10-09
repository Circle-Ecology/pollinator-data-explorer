
import { parseCsvText } from './parseCsvText.js'
import { parseExportRows } from './parseExportRows.js'
import { parseCoordinatePair } from './parseCoordinatePair.js'
import { parseExportDate } from './parseExportDate.js'
import { normalizeNaValue } from './normalizeNaValue.js'

export function parseExportCsv(fileBuffer, importBatchId) {
  const rows = parseCsvText(fileBuffer)

  const validRows = []
  const errors = []
  const warnings = []
  let unsurveyedRowCount = 0

  rows.forEach((row, index) => {
    const rowNumber = row.__csvRowNumber ?? index + 2

    // Report malformed rows and continue processing.
    if (row.__malformedRow === true) {
      errors.push({
        code: 'MALFORMED_ROW',
        rowNumber,
        message:
          `CSV row ${rowNumber} has ${row.__actualColumns} columns; ` +
          `expected ${row.__expectedColumns}`,
      })
      return
    }

    const propertyName = normalizeNaValue(row['Property Name'])
    const tunnelId = normalizeNaValue(row['Unique ID'])
    const surveyDate = normalizeNaValue(row['Observation Date'])

    if (!propertyName || !tunnelId) {
      errors.push({
        code: 'REQUIRED_FIELD_MISSING',
        rowNumber,
        message: 'Property Name and Unique ID are required',
      })
      return
    }

    let coordinates

    try {
      coordinates = parseCoordinatePair(row['Coordinates'])
    } catch {
      errors.push({
        code: 'MALFORMED_COORDINATES',
        rowNumber,
        message: 'Invalid coordinates',
      })
      return
    }

    if (!surveyDate) {
      unsurveyedRowCount++

      warnings.push(
        `UNSURVEYED_ROW: Row ${rowNumber} has no survey date`
      )

      validRows.push({
        ...row,
        'Observation Date': null,
        __parsedCoordinates: coordinates,
      })

      return
    }

    try {
      const normalizedDate = parseExportDate(surveyDate)

      validRows.push({
        ...row,
        'Observation Date': normalizedDate,
        __parsedCoordinates: coordinates,
      })
    } catch {
      errors.push({
        code: 'INVALID_DATE',
        rowNumber,
        message: `Invalid survey date: ${surveyDate}`,
      })
    }
  })

  const result = parseExportRows(validRows, importBatchId)

  return {
    importBatchId,
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.length - validRows.length,
    siteCount: result.sites.length,
    tunnelCount: result.tunnels.length,
    surveyDateCount: new Set(
      result.surveys.map((survey) => survey.surveyDate)
    ).size,
    unsurveyedRowCount,
    errors: [...errors, ...result.errors],
    warnings,
    sites: result.sites,
    tunnels: result.tunnels,
    surveys: result.surveys,
  }
}
