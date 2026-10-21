import { fetchSheetExport } from './fetchSheetExport.js'
import { parseExportCsv } from '../us08/parseExportCsv.js'

const DEFAULT_INTERVAL_MINUTES = 15

// US-23: runs fetchSheetExport on startup and then every intervalMinutes.
// Runs on the server only, so site visitors never trigger a fetch.
export function startSheetScheduler({
  sheetCsvUrl = process.env.SHEET_CSV_EXPORT_URL,
  intervalMinutes = Number(process.env.SHEET_FETCH_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES,
  fetchExport = fetchSheetExport,
  parseExport = parseExportCsv,
  // Opt-in handoff only. Production wiring awaits approval/visibility and US-25.
  onParsedResult,
  logger = console,
} = {}) {
  let previousRawCsv = null
  let lastRowCount = 0
  let timer = null
  let stopped = false

  async function runOnce() {
    const startedAt = Date.now()
    let record

    try {
      const result = await fetchExport(sheetCsvUrl, { previousRawCsv })

      if (result.status === 'success') {
        const parsed = parseExport(result.rawCsv, `sheet-${result.fetchedAt}`)
        if (onParsedResult) {
          // Only refuse the handoff on a shape-level problem or a parse with nothing
          // usable; row-level errors on an otherwise-good batch are excluded
          // downstream, not grounds to refuse the whole batch - see #45. validRows
          // (not totalRows) catches an all-invalid fetch too, e.g. a renamed header
          // or a corrupted column that fails every row, not just an empty sheet -
          // otherwise that run would publish empty sites.json/observations.json
          // over a live dataset. This checks reported diagnostics, not the missing
          // full US-07 validation stage.
          if (!parsed || !Array.isArray(parsed.errors) ||
            !Number.isSafeInteger(parsed.validRows) || parsed.validRows === 0) {
            throw new Error('Cannot hand off an empty or entirely invalid normalized import')
          }
          await onParsedResult(parsed)
        }
        previousRawCsv = result.rawCsv
        lastRowCount = parsed.totalRows
      }

      record = {
        fetchedAt: result.fetchedAt,
        status: result.status,
        rowCount: result.status === 'failed' ? 0 : lastRowCount,
        durationMs: Date.now() - startedAt,
      }
      if (result.error) record.error = result.error
    } catch (error) {
      // fetchSheetExport never throws, but a parse error or bad stub must not kill the loop.
      record = {
        fetchedAt: new Date().toISOString(),
        status: 'failed',
        rowCount: 0,
        durationMs: Date.now() - startedAt,
        error: error.message,
      }
    }

    if (record.status === 'failed') {
      logger.error(record)
    } else {
      logger.info(record)
    }

    // Schedule the next run only after this one finishes, so slow fetches never overlap.
    if (!stopped) {
      timer = setTimeout(runOnce, intervalMinutes * 60 * 1000)
    }
  }

  runOnce()

  return {
    stop() {
      stopped = true
      clearTimeout(timer)
    },
  }
}
