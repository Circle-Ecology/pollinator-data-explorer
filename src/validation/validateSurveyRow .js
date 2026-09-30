import { ERROR_CODES } from './errorCodes'
import { createValidationError } from './createValidationError'
import { validateCsvHeaders } from './validateCsvHeaders'
import { validateSurveyRow } from './validateSurveyRow'

// Natural key from the Data Contract: tunnelId + surveyDate.
export function buildNaturalKey(tunnelId, surveyDate) {
  throw new Error('Not implemented: buildNaturalKey')
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
 *   errors: ValidationError[],   // EMPTY_FILE, NO_DATA_ROWS, MISSING_HEADER, DUPLICATE_TUNNEL_DATE, row errors
 *   warnings: ValidationError[],
 * }}
 * Count names match ImportValidationResult in US-08 (#13).
 */
export function validateExportFile(rows) {
  // TODO: EMPTY_FILE if no rows, NO_DATA_ROWS if header only
  // TODO: validateCsvHeaders(rows[0]); stop if MISSING_HEADER (no rows processed)
  // TODO: validateSurveyRow for each data row (rowNumber = index + 1)
  // TODO: DUPLICATE_TUNNEL_DATE on the later row only, using buildNaturalKey
  // TODO: count distinct tunnelId values and unsurveyed rows
  throw new Error('Not implemented: validateExportFile')
}
