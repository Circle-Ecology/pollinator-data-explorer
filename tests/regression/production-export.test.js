// Runs against the full production export converted to JSON by scripts/csv-to-json.js.
// The fixture holds staff data, so it is gitignored. Generate it with:
//   npm run export:json -- path/to/combined_data_clean_v02.csv tests/fixtures/production-export.json
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateExportFile } from '../../src/validation/validateExportFile'
import { ERROR_CODES } from '../../src/validation/errorCodes'

const FIXTURE = fileURLToPath(new URL('../fixtures/production-export.json', import.meta.url))

describe.skipIf(!existsSync(FIXTURE))('production export regression', () => {
  const rows = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : []
  const result = validateExportFile(rows)
  const countOf = (code) => result.errors.filter((e) => e.code === code).length

  it('reads every row', () => {
    expect(result.totalRows).toBe(42420)
  })

  it('reports 2,973 distinct tunnels', () => {
    expect(result.tunnelCount).toBe(2973)
  })

  it('reports 1,722 unsurveyed rows', () => {
    expect(result.unsurveyedRowCount).toBe(1722)
  })

  it('reports 263 duplicate tunnel-date rows', () => {
    expect(countOf(ERROR_CODES.DUPLICATE_TUNNEL_DATE)).toBe(263)
  })

  it('rejects no rows for any other reason than duplicates or malformed coordinates', () => {
    const unexplained = result.errors.filter(
      (e) =>
        e.code !== ERROR_CODES.DUPLICATE_TUNNEL_DATE &&
        e.code !== ERROR_CODES.MALFORMED_COORDINATES,
    )

    expect(unexplained).toEqual([])
  })

  it('flags only Rogers Grove OS when coordinates are malformed', () => {
    // v02: 7,464 Rogers Grove rows carry the corrupted value; 451 of them are unsurveyed and skip
    // row checks, so 7,013 errors. v02-2 fixed the value, so 0.
    expect([0, 7013]).toContain(countOf(ERROR_CODES.MALFORMED_COORDINATES))
    expect(result.sitesFlaggedForReview.every((site) => site === 'Rogers Grove OS')).toBe(true)
  })
})
