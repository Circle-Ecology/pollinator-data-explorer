// US-23: download the sheet's published-to-web CSV export (no Google API auth).
// Never throws, so a failed run can't crash the scheduler.
export async function fetchSheetExport(sheetCsvUrl, { previousRawCsv = null } = {}) {
  const fetchedAt = new Date().toISOString()

  try {
    const response = await fetch(sheetCsvUrl)
    if (!response.ok) {
      return {
        rawCsv: null,
        fetchedAt,
        status: 'failed',
        noChanges: false,
        error: `Sheet request failed: ${response.status}`,
      }
    }

    const rawCsv = await response.text()
    const noChanges = previousRawCsv !== null && rawCsv === previousRawCsv

    return {
      rawCsv,
      fetchedAt,
      status: noChanges ? 'no_changes' : 'success',
      noChanges,
    }
  } catch (error) {
    return {
      rawCsv: null,
      fetchedAt,
      status: 'failed',
      noChanges: false,
      error: error.message,
    }
  }
}
