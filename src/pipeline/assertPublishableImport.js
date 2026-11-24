// US-25: the single gate deciding whether a parsed import may replace the
// last published dataset. Shared by the scheduler handoff and the one-shot
// publish script so both refuse the same inputs.
export const DEFAULT_MAX_INVALID_RATIO = 0.9

export const UNPUBLISHABLE_IMPORT_MESSAGE = 'Cannot hand off an empty or mostly invalid normalized import'

export function invalidRatioOf(parsed) {
  return parsed?.totalRows > 0 ? parsed.invalidRows / parsed.totalRows : 1
}

// Refuse only on a shape-level problem or a parse that's mostly unusable, not
// merely imperfect; row-level errors on an otherwise-good batch are excluded
// downstream (#45). maxInvalidRatio also catches an all-invalid-but-nonzero
// fetch (renamed header, corrupted column) that would otherwise publish empty
// files over the live dataset.
export function assertPublishableImport(parsed, { maxInvalidRatio = DEFAULT_MAX_INVALID_RATIO } = {}) {
  if (!parsed || !Array.isArray(parsed.errors) || !Number.isSafeInteger(parsed.validRows) ||
    parsed.validRows === 0 || invalidRatioOf(parsed) > maxInvalidRatio) {
    throw new Error(UNPUBLISHABLE_IMPORT_MESSAGE)
  }
}
