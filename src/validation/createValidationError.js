// ValidationError shape from US-07 (#12): { rowNumber, column, code, message }.
// rowNumber is 1-based and counts the header row; null for file-level errors.
export function createValidationError({ rowNumber = null, column = null, code, message }) {
  return { rowNumber, column, code, message }
}
