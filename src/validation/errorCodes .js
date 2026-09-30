import {
  REQUIRED_HEADERS,
  ALL_KNOWN_HEADERS,
  HEADER_ALIASES,
} from './csvSchema'
import { ERROR_CODES } from './errorCodes'
import { createValidationError } from './createValidationError'

// Trims whitespace and lowercases a header so " observation date " matches "Observation Date".
export function normalizeHeader(header) {
  throw new Error('Not implemented: normalizeHeader')
}

// Returns the current header name for a known alias (e.g. "Type" -> "Coarse Woody Debris Type"),
// or null when the header is not an alias.
export function resolveHeaderAlias(header) {
  throw new Error('Not implemented: resolveHeaderAlias')
}

/**
 * Validates the header row of an export.
 * @param {string[]} headers - raw header row from the CSV
 * @returns {{
 *   isValid: boolean,
 *   headerMap: Object<string, string>,   // raw header -> canonical export header
 *   errors: ValidationError[],           // MISSING_HEADER
 *   warnings: ValidationError[],         // RENAMED_HEADER, unknown extra headers
 * }}
 */
export function validateCsvHeaders(headers) {
  // TODO: normalize each header
  // TODO: resolve aliases and add a RENAMED_HEADER warning for each substitution
  // TODO: add a warning for unknown extra headers and ignore them
  // TODO: add MISSING_HEADER for each required header not found
  throw new Error('Not implemented: validateCsvHeaders')
}
