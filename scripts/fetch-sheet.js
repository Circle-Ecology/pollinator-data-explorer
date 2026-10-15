// US-23: start the scheduled Google Sheet fetch.
// Usage: npm run pipeline:fetch (reads SHEET_CSV_EXPORT_URL and SHEET_FETCH_INTERVAL_MINUTES from .env)
import { startSheetScheduler } from '../src/pipeline/sheetScheduler.js'

if (!process.env.SHEET_CSV_EXPORT_URL) {
  console.error('SHEET_CSV_EXPORT_URL is not set. Add it to .env (see env.example).')
  process.exit(1)
}

const scheduler = startSheetScheduler()

process.on('SIGINT', () => {
  scheduler.stop()
  process.exit(0)
})
