import { fetchSheetExport } from './fetchSheetExport.js'
import { parseExportCsv } from '../us08/parseExportCsv.js'
import { DEFAULT_MAX_INVALID_RATIO, assertPublishableImport, invalidRatioOf } from './assertPublishableImport.js'

const DEFAULT_INTERVAL_MINUTES = 15
// Below the refusal threshold but still worth a human looking, logged (not thrown).
const NOTABLE_INVALID_RATIO = 0.2

// US-23: runs fetchSheetExport on startup and then every intervalMinutes.
// Runs on the server only, so site visitors never trigger a fetch.
export function startSheetScheduler({
  sheetCsvUrl = process.env.SHEET_CSV_EXPORT_URL,
  intervalMinutes = Number(process.env.SHEET_FETCH_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES,
  fetchExport = fetchSheetExport,
  parseExport = parseExportCsv,
  maxInvalidRatio = DEFAULT_MAX_INVALID_RATIO,
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
        const invalidRatio = invalidRatioOf(parsed)
        if (onParsedResult) {
          // US-25: same gate as the publish script (see assertPublishableImport).
          assertPublishableImport(parsed, { maxInvalidRatio })
          await onParsedResult(parsed)
        }
        previousRawCsv = result.rawCsv
        lastRowCount = parsed.totalRows
        if (invalidRatio > NOTABLE_INVALID_RATIO) {
          logger.info({ fetchedAt: result.fetchedAt, status: 'notice',
            message: `${Math.round(invalidRatio * 100)}% of fetched rows invalid this run`,
            invalidRows: parsed.invalidRows, totalRows: parsed.totalRows })
        }
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
