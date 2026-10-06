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

const NUMBER = /^-?\d+(\.\d+)?$/

// True when both Observation Date and Observation Status are NA (installed but unsurveyed tunnel).
export function isUnsurveyedRow(row) {
  return (
    normalizeNaValue(row['Observation Date']) === null &&
    normalizeNaValue(row['Observation Status']) === null
  )
}

function toDayNumber({ year, month, day }) {
  return year * 10000 + month * 100 + day
}

function todayDayNumber() {
  const now = new Date()
  return toDayNumber({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
}

function isInRange(value, { min, max }) {
  return value >= min && value <= max
}

/**
 * Validates one data row.
 * @param {Object<string, string>} row - keyed by canonical export header (after validateCsvHeaders)
 * @param {number} rowNumber - 1-based, counts the header row
 * @returns {{
 *   isValid: boolean,
 *   isUnsurveyed: boolean,
 *   values: Object<string, string|null>, // row values with NA and blanks normalized to null
 *   errors: ValidationError[],   // REQUIRED_FIELD_MISSING, INVALID_NUMBER, INVALID_DATE, FUTURE_DATE,
 *                                // MALFORMED_COORDINATES, OUT_OF_RANGE, UNEXPECTED_ENUM_VALUE
 *   warnings: ValidationError[], // UNSURVEYED_ROW
 * }}
 */
export function validateSurveyRow(row, rowNumber) {
  const values = {}
  for (const [header, value] of Object.entries(row)) {
    values[header] = normalizeNaValue(value)
  }

  const errors = []
  const warnings = []
  const failedColumns = new Set()
  const addError = (column, code, message) => {
    failedColumns.add(column)
    errors.push(createValidationError({ rowNumber, column, code, message }))
  }

  if (isUnsurveyedRow(row)) {
    warnings.push(
      createValidationError({
        rowNumber,
        column: 'Observation Date',
        code: ERROR_CODES.UNSURVEYED_ROW,
        message: 'Observation Date and Observation Status are NA; tunnel has not been surveyed.',
      }),
    )
    return { isValid: true, isUnsurveyed: true, values, errors, warnings }
  }

  for (const header of REQUIRED_HEADERS) {
    if (values[header] === null || values[header] === undefined) {
      addError(header, ERROR_CODES.REQUIRED_FIELD_MISSING, `Required field "${header}" is empty.`)
    }
  }

  const rawDate = values['Observation Date']
  if (rawDate) {
    const date = parseExportDate(rawDate)
    if (!date) {
      addError(
        'Observation Date',
        ERROR_CODES.INVALID_DATE,
        `Observation Date "${rawDate}" is not a valid MM-DD-YYYY or M/D/YYYY date.`,
      )
    } else if (toDayNumber(date) > todayDayNumber()) {
      addError('Observation Date', ERROR_CODES.FUTURE_DATE, `Observation Date "${rawDate}" is in the future.`)
    }
  }

  const rawCoordinates = values.Coordinates
  if (rawCoordinates) {
    try {
      const { latitude, longitude } = parseCoordinatePair(rawCoordinates)
      if (!isInRange(latitude, LATITUDE_RANGE)) {
        addError('Coordinates', ERROR_CODES.OUT_OF_RANGE, `Latitude ${latitude} is outside -90..90.`)
      }
      if (!isInRange(longitude, LONGITUDE_RANGE)) {
        addError('Coordinates', ERROR_CODES.OUT_OF_RANGE, `Longitude ${longitude} is outside -180..180.`)
      }
    } catch (error) {
      if (!(error instanceof MalformedCoordinatesError)) {
        throw error
      }
      addError(
        'Coordinates',
        ERROR_CODES.MALFORMED_COORDINATES,
        `Coordinates "${rawCoordinates}" are not two comma-separated decimal numbers.`,
      )
    }
  }

  for (const header of NUMERIC_HEADERS) {
    const value = values[header]
    if (value && !NUMBER.test(value)) {
      addError(header, ERROR_CODES.INVALID_NUMBER, `${header} "${value}" is not a number.`)
    }
  }

  for (const [header, allowed] of Object.entries(ALLOWED_VALUES)) {
    const value = values[header]
    if (value && !failedColumns.has(header) && !allowed.includes(value)) {
      addError(
        header,
        ERROR_CODES.UNEXPECTED_ENUM_VALUE,
        `${header} has unexpected value "${value}".`,
      )
    }
  }

  return { isValid: errors.length === 0, isUnsurveyed: false, values, errors, warnings }
}
