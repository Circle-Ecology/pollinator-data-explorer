import {
  REQUIRED_HEADERS,
  ALL_KNOWN_HEADERS,
  HEADER_ALIASES,
} from './csvSchema'
import { ERROR_CODES } from './errorCodes'
import { createValidationError } from './createValidationError'

const HEADER_ROW_NUMBER = 1

// Trims whitespace and lowercases a header so " observation date " matches "Observation Date".
export function normalizeHeader(header) {
  return String(header ?? '').trim().toLowerCase()
}

const KNOWN_BY_NORMALIZED = new Map(ALL_KNOWN_HEADERS.map((h) => [normalizeHeader(h), h]))
const ALIAS_BY_NORMALIZED = new Map(
  Object.entries(HEADER_ALIASES).map(([alias, current]) => [normalizeHeader(alias), current]),
)

// Returns the current header name for a known alias (e.g. "Type" -> "Coarse Woody Debris Type"),
// or null when the header is not an alias.
export function resolveHeaderAlias(header) {
  return ALIAS_BY_NORMALIZED.get(normalizeHeader(header)) ?? null
}

/**
 * Validates the header row of an export.
 * @param {string[]} headers - raw header row from the CSV
 * @returns {{
 *   isValid: boolean,
 *   headerMap: Object<string, string>,   // raw header -> canonical export header
 *   errors: ValidationError[],           // MISSING_HEADER
 *   warnings: ValidationError[],         // RENAMED_HEADER, UNKNOWN_HEADER
 * }}
 */
export function validateCsvHeaders(headers) {
  const headerMap = {}
  const errors = []
  const warnings = []

  for (const raw of headers) {
    const known = KNOWN_BY_NORMALIZED.get(normalizeHeader(raw))
    if (known) {
      headerMap[raw] = known
      continue
    }

    const alias = resolveHeaderAlias(raw)
    if (alias) {
      headerMap[raw] = alias
      warnings.push(
        createValidationError({
          rowNumber: HEADER_ROW_NUMBER,
          column: alias,
          code: ERROR_CODES.RENAMED_HEADER,
          message: `Header "${raw}" was accepted as "${alias}".`,
        }),
      )
      continue
    }

    warnings.push(
      createValidationError({
        rowNumber: HEADER_ROW_NUMBER,
        column: raw,
        code: ERROR_CODES.UNKNOWN_HEADER,
        message: `Unknown header "${raw}" was ignored.`,
      }),
    )
  }

  const found = new Set(Object.values(headerMap))
  for (const required of REQUIRED_HEADERS) {
    if (!found.has(required)) {
      errors.push(
        createValidationError({
          rowNumber: HEADER_ROW_NUMBER,
          column: required,
          code: ERROR_CODES.MISSING_HEADER,
          message: `Required header "${required}" is missing.`,
        }),
      )
    }
  }

  return { isValid: errors.length === 0, headerMap, errors, warnings }
}
