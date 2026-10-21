// #47: one-shot manual/staging run of the real fetch -> parse -> generate -> write
// pipeline against the actual Google Sheet. Unlike scripts/fetch-sheet.js (the
// production scheduler, not wired to a consumer yet), this fetches once, writes
// the public JSON artifacts to /data, and exits - for verifying real-data
// behavior and producing staging output to inspect, not for continuous running.
// Usage: npm run pipeline:publish [-- <output-directory>]
import process from 'node:process'
import { fetchSheetExport } from '../src/pipeline/fetchSheetExport.js'
import { parseExportCsv } from '../src/us08/parseExportCsv.js'
import { writePublicDataset } from '../src/pipeline/writePublicDataset.js'

if (!process.env.SHEET_CSV_EXPORT_URL) {
  console.error('SHEET_CSV_EXPORT_URL is not set. Add it to .env (see env.example).')
  process.exit(1)
}

const outputDirectory = process.argv[2]
const fetched = await fetchSheetExport(process.env.SHEET_CSV_EXPORT_URL)

if (fetched.status === 'failed') {
  console.error(`Fetch failed: ${fetched.error}`)
  process.exit(1)
}

const parsed = parseExportCsv(fetched.rawCsv, `manual-${fetched.fetchedAt}`)
console.log(`Parsed ${parsed.totalRows} rows (${parsed.validRows} valid, ` +
  `${parsed.invalidRows} invalid, ${parsed.errors.length} diagnostics).`)

const metadata = await writePublicDataset(parsed, outputDirectory ? { outputDirectory } : {})
console.log(`Published ${metadata.siteCount} sites, ${metadata.tunnelCount} tunnels to ` +
  `${outputDirectory ?? 'data/'} (excludedRowCount: ${metadata.excludedRowCount}).`)
