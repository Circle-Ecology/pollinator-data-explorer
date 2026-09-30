import {
  REQUIRED_HEADERS,
  ALLOWED_VALUES,
  NUMERIC_HEADERS,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
} from './csvSchema'
import { ERROR_CODES } from './errorCodes'
import { createValidationError } from './createValidationError'
import { normalizeNaValue } from '../utils/normalizeNaValue'
import { parseExportDate } from '../utils/parseExportDate'
import { parseCoordinatePair, MalformedCoordinatesError } from '../utils/parseCoordinatePair'

// True when both Observation Date and Observation Status are NA (installed but unsurveyed tunnel).
export function isUnsurveyedRow(row) {
  throw new Error('Not implemented: isUnsurveyedRow')
}

/**
 * Validates one data row.
 * @param {Object<string, string>} row - keyed by canonical export header (after validateCsvHeaders)
 * @param {number} rowNumber - 1-based, counts the header row
 * @returns {{
 *   isValid: boolean,
 *   isUnsurveyed: boolean,
 *   errors: ValidationError[],   // REQUIRED_FIELD_MISSING, INVALID_NUMBER, INVALID_DATE, FUTURE_DATE,
 *                                // MALFORMED_COORDINATES, OUT_OF_RANGE, UNEXPECTED_ENUM_VALUE
 *   warnings: ValidationError[], // UNSURVEYED_ROW
 * }}
 */
export function validateSurveyRow(row, rowNumber) {
  // TODO: treat NA as absent with normalizeNaValue
  // TODO: if isUnsurveyedRow -> UNSURVEYED_ROW warning and return early
  // TODO: REQUIRED_FIELD_MISSING for empty required fields
  // TODO: INVALID_DATE for non MM-DD-YYYY, FUTURE_DATE if after today
  // TODO: MALFORMED_COORDINATES, then OUT_OF_RANGE with column: 'Coordinates'
  // TODO: INVALID_NUMBER for NUMERIC_HEADERS
  // TODO: UNEXPECTED_ENUM_VALUE naming the column and the value
  throw new Error('Not implemented: validateSurveyRow')
}
