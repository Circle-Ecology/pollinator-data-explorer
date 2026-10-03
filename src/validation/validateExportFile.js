import { ERROR_CODES } from './errorCodes'
import { createValidationError } from './createValidationError'
import { validateCsvHeaders } from './validateCsvHeaders'
import { validateSurveyRow } from './validateSurveyRow'
import { normalizeNaValue } from '../utils/normalizeNaValue'
import { parseExportDate } from '../utils/parseExportDate'

// Natural key from the Data Contract: tunnelId + surveyDate.
export function buildNaturalKey(tunnelId, surveyDate) {
  return `${tunnelId}|${surveyDate}`
}

// Puts MM-DD-YYYY and M/D/YYYY for the same day on one key. Unparseable dates (including NA) stay raw.
function surveyDateKey(rawDate) {
  const date = parseExportDate(rawDate)
  if (!date) {
    return rawDate
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

function emptyResult(totalRows, errors, warnings = []) {
  return {
    isValid: false,
    totalRows,
    validRows: 0,
    invalidRows: 0,
    tunnelCount: 0,
    unsurveyedRowCount: 0,
    sitesFlaggedForReview: [],
    errors,
    warnings,
  }
}

/**
 * Validates a whole export.
 * @param {string[][]} rows - rows[0] is the header row, rows[1..] are data rows
 * @returns {{
 *   isValid: boolean,
 *   totalRows: number,
 *   validRows: number,
 *   invalidRows: number,
 *   tunnelCount: number,
 *   unsurveyedRowCount: number,
 *   sitesFlaggedForReview: string[], // Property Names with MALFORMED_COORDINATES
 *   errors: ValidationError[],   // EMPTY_FILE, NO_DATA_ROWS, MISSING_HEADER, DUPLICATE_TUNNEL_DATE, row errors
 *   warnings: ValidationError[],
 * }}
 * Count names match ImportValidationResult in US-08 (#13).
 */
export function validateExportFile(rows) {
  if (!rows || rows.length === 0) {
    return emptyResult(0, [
      createValidationError({ code: ERROR_CODES.EMPTY_FILE, message: 'The file is empty.' }),
    ])
  }

  const [headers, ...dataRows] = rows
  if (dataRows.length === 0) {
    return emptyResult(0, [
      createValidationError({
        code: ERROR_CODES.NO_DATA_ROWS,
        message: 'The file has a header row but no data rows.',
      }),
    ])
  }

  const headerResult = validateCsvHeaders(headers)
  if (!headerResult.isValid) {
    return emptyResult(dataRows.length, headerResult.errors, headerResult.warnings)
  }

  const errors = []
  const warnings = [...headerResult.warnings]
  const seenKeys = new Set()
  const tunnelIds = new Set()
  const flaggedSites = new Set()
  let invalidRows = 0
  let unsurveyedRowCount = 0

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2
    const row = {}
    headers.forEach((rawHeader, column) => {
      const canonical = headerResult.headerMap[rawHeader]
      if (canonical) {
        row[canonical] = cells[column]
      }
    })

    const rowResult = validateSurveyRow(row, rowNumber)
    const rowErrors = [...rowResult.errors]

    const tunnelId = normalizeNaValue(row['Unique ID'])
    if (tunnelId) {
      tunnelIds.add(tunnelId)
      const key = buildNaturalKey(tunnelId, surveyDateKey(normalizeNaValue(row['Observation Date'])))
      if (seenKeys.has(key)) {
        rowErrors.push(
          createValidationError({
            rowNumber,
            column: 'Unique ID',
            code: ERROR_CODES.DUPLICATE_TUNNEL_DATE,
            message: `Tunnel "${tunnelId}" already has a row for Observation Date "${row['Observation Date']}".`,
          }),
        )
      }
      seenKeys.add(key)
    }

    if (rowResult.isUnsurveyed) {
      unsurveyedRowCount += 1
    }
    if (rowErrors.some((e) => e.code === ERROR_CODES.MALFORMED_COORDINATES)) {
      flaggedSites.add(rowResult.values['Property Name'])
    }
    if (rowErrors.length > 0) {
      invalidRows += 1
    }

    errors.push(...rowErrors)
    warnings.push(...rowResult.warnings)
  })

  return {
    isValid: errors.length === 0,
    totalRows: dataRows.length,
    validRows: dataRows.length - invalidRows,
    invalidRows,
    tunnelCount: tunnelIds.size,
    unsurveyedRowCount,
    sitesFlaggedForReview: [...flaggedSites],
    errors,
    warnings,
  }
}
