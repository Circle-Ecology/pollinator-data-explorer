
import { parseCsvText } from './parseCsvText.js'
import { parseExportRows } from './parseExportRows.js'
import { parseCoordinatePair } from './parseCoordinatePair.js'
import { parseExportDate } from './parseExportDate.js'

export function parseExportCsv(fileBuffer, importBatchId) {
  const rows = parseCsvText(fileBuffer)

  const validRows = []
  const errors = []
  const warnings = []
  let unsurveyedRowCount = 0

  // Validate each CSV row
  rows.forEach((row, index) => {
    const rowNumber = index + 2

    const propertyName = row['Property Name']?.trim()
    const tunnelId = row['Unique ID']?.trim()
    const surveyDate = row['Observation Date']?.trim()

    // Check required fields
    if (
      !propertyName ||
      propertyName.toUpperCase() === 'NA' ||
      !tunnelId ||
      tunnelId.toUpperCase() === 'NA'
    ) {
      errors.push({
        code: 'REQUIRED_FIELD_MISSING',
        rowNumber,
        message: 'Property Name and Unique ID are required',
      })
      return
    }

    // Validate coordinates
    try {
      parseCoordinatePair(row['Coordinates'])
    } catch {
      errors.push({
        code: 'MALFORMED_COORDINATES',
        rowNumber,
        message: 'Invalid coordinates',
      })
      return
    }

    // Handle rows without a survey date
    if (!surveyDate || surveyDate.toUpperCase() === 'NA') {
      unsurveyedRowCount++

      warnings.push(
        `UNSURVEYED_ROW: Row ${rowNumber} has no survey date`
      )

      validRows.push({
        ...row,
        'Observation Date': null,
      })

      return
    }

    // Validate and normalize the survey date
    try {
      const normalizedDate = parseExportDate(surveyDate)

      validRows.push({
        ...row,
        'Observation Date': normalizedDate,
      })
    } catch {
      errors.push({
        code: 'INVALID_DATE',
        rowNumber,
        message: `Invalid survey date: ${surveyDate}`,
      })
    }
  })

  // Convert valid rows into Site, Tunnel, and Survey records
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
