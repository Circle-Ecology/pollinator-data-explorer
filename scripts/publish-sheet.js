// #47: one-shot manual/staging run of the real fetch -> parse -> generate -> write
// pipeline against the actual Google Sheet. Unlike scripts/fetch-sheet.js (the
// production scheduler, not wired to a consumer yet), this fetches once, writes
// the public JSON artifacts to /data, and exits - for verifying real-data
// behavior and producing staging output to inspect, not for continuous running.
// Usage: npm run pipeline:publish [-- <output-directory>]
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { fetchSheetExport } from '../src/pipeline/fetchSheetExport.js'
import { parseExportCsv } from '../src/us08/parseExportCsv.js'
import { publishDatasetIfValid, readCurrentStatus, recordFetchFailure } from '../src/pipeline/publishDatasetIfValid.js'

const DEFAULT_OUTPUT_DIRECTORY = fileURLToPath(new URL('../data/', import.meta.url))

if (!process.env.SHEET_CSV_EXPORT_URL) {
  console.error('SHEET_CSV_EXPORT_URL is not set. Add it to .env (see env.example).')
  process.exit(1)
}

const outputDirectory = process.argv[2] ?? DEFAULT_OUTPUT_DIRECTORY
const currentStatus = await readCurrentStatus(outputDirectory)
const fetched = await fetchSheetExport(process.env.SHEET_CSV_EXPORT_URL)

// US-25: every failure path keeps the last published files, marks dataset-status.json,
// logs the structured failure entry and exits non-zero.
if (fetched.status === 'failed') {
  await recordFetchFailure(`Fetch failed: ${fetched.error}`, currentStatus, { outputDirectory })
  process.exit(1)
}

const parsed = parseExportCsv(fetched.rawCsv, `manual-${fetched.fetchedAt}`)
console.log(`Parsed ${parsed.totalRows} rows (${parsed.validRows} valid, ` +
  `${parsed.invalidRows} invalid, ${parsed.errors.length} diagnostics).`)

const { published, status } = await publishDatasetIfValid(parsed, currentStatus, { outputDirectory })
if (!published) {
  console.error('Not publishing; previous dataset left unchanged.')
  process.exit(1)
}
console.log(`Published ${status.siteCount} sites, ${status.tunnelCount} tunnels to ` +
  `${outputDirectory} (excludedRowCount: ${status.excludedRowCount}).`)
