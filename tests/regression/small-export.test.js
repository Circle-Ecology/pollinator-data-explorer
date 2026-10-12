// A small, fully synthetic regression fixture that always runs in CI.
// tests/regression/production-export.test.js covers the real 42,420-row export, but that
// fixture holds real staff data and is gitignored, so it can only run locally - it is
// skipped in CI and never actually gates a merge. This file exercises the same scenarios
// (duplicates, unsurveyed rows, malformed coordinates, multiple sites) at a scale with no
// real data, so the import pipeline has at least one regression check CI always runs.
import { describe, expect, it } from 'vitest'
import { validateExportFile } from '../../src/validation/validateExportFile'
import { ERROR_CODES } from '../../src/validation/errorCodes'
import { EXPORT_HEADERS, makeRow, toRowArray } from '../fixtures/sampleExport'

const dataRows = [
  makeRow({ 'Unique ID': 'TUNNEL-A', 'Observation Date': '07-24-2025' }),
  makeRow({ 'Unique ID': 'TUNNEL-A', 'Observation Date': '08-01-2025' }),
  // Same tunnel + date as the row above: a duplicate.
  makeRow({ 'Unique ID': 'TUNNEL-A', 'Observation Date': '08-01-2025' }),
  // Installed but never surveyed.
  makeRow({ 'Unique ID': 'TUNNEL-B', 'Observation Date': 'NA', 'Observation Status': 'NA' }),
  // Malformed coordinates, flagged for staff review.
  makeRow({
    'Unique ID': 'TUNNEL-C',
    'Property Name': 'Test Grove OS',
    Coordinates: 'not-a-coordinate',
  }),
  // A second, unrelated site - should not be flagged.
  makeRow({ 'Unique ID': 'TUNNEL-D', 'Property Name': 'Sample Ranch' }),
]

const rows = [EXPORT_HEADERS, ...dataRows.map(toRowArray)]
const result = validateExportFile(rows)
const countOf = (code) => result.errors.filter((e) => e.code === code).length

describe('small synthetic export regression (always runs in CI)', () => {
  it('reads every row', () => {
    expect(result.totalRows).toBe(6)
  })

  it('counts 4 distinct tunnels', () => {
    expect(result.tunnelCount).toBe(4)
  })

  it('counts 1 unsurveyed row', () => {
    expect(result.unsurveyedRowCount).toBe(1)
  })

  it('flags exactly 1 duplicate tunnel-date row', () => {
    expect(countOf(ERROR_CODES.DUPLICATE_TUNNEL_DATE)).toBe(1)
  })

  it('flags exactly 1 malformed-coordinates row', () => {
    expect(countOf(ERROR_CODES.MALFORMED_COORDINATES)).toBe(1)
  })

  it('flags only the site with malformed coordinates for review', () => {
    expect(result.sitesFlaggedForReview).toEqual(['Test Grove OS'])
  })

  it('counts 2 invalid rows and 4 valid rows', () => {
    expect(result.invalidRows).toBe(2)
    expect(result.validRows).toBe(4)
  })
})
