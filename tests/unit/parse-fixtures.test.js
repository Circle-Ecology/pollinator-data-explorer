
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

describe('US-08: CSV Fixture Tests', () => {
  // TEST 1: Valid CSV
  it('parses the valid CSV fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'fixtures/export.valid.csv'
    )

    const csv = fs.readFileSync(fixturePath)
    const result = parseExportCsv(csv, 'fixture-test')

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(3)
    expect(result.invalidRows).toBe(0)
    expect(result.siteCount).toBe(1)
    expect(result.tunnelCount).toBe(2)
    expect(result.surveys).toHaveLength(2)
    expect(result.unsurveyedRowCount).toBe(1)
  })

  // TEST 2: Malformed coordinates
  it('reports malformed coordinates without losing valid rows', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'fixtures/export.malformed-coordinates.csv'
    )

    const csv = fs.readFileSync(fixturePath)
    const result = parseExportCsv(csv, 'fixture-malformed')

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.tunnels).toHaveLength(2)

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MALFORMED_COORDINATES',
          rowNumber: 3,
        }),
      ])
    )
  })

  // TEST 3: Duplicate tunnel and survey date
  it('handles duplicate tunnel and survey date records', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'fixtures/export.duplicate-tunnel-date.csv'
    )

    const csv = fs.readFileSync(fixturePath)
    const result = parseExportCsv(csv, 'fixture-duplicate')

    expect(result.totalRows).toBe(2)
    expect(result.tunnelCount).toBe(1)

    const keys = result.surveys.map(
      (survey) => `${survey.tunnelId}|${survey.surveyDate}`
    )

    expect(new Set(keys).size).toBe(1)
  })

  // TEST 4: UTF-8 BOM and Windows CRLF line endings
  it('parses UTF-8 BOM and CRLF line endings', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'fixtures/export.crlf-bom.csv'
    )

    const csv = fs.readFileSync(fixturePath)

    // Verify the file contains a UTF-8 BOM
    expect([...csv.subarray(0, 3)]).toEqual([239, 187, 191])

    // Verify Windows-style CRLF line endings
    expect(csv.toString('utf8')).toContain('\r\n')

    // Verify the CSV parser handles both correctly
    const result = parseExportCsv(csv, 'fixture-bom')

    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(0)
    expect(result.surveys).toHaveLength(1)
  })

  // TEST 5: Production-style CSV sample
  it('parses a representative production-style sample', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      'fixtures/export.production-sample.csv'
    )

    const csv = fs.readFileSync(fixturePath)
    const result = parseExportCsv(csv, 'fixture-sample')

    expect(result.totalRows).toBe(5)
    expect(result.validRows).toBe(5)
    expect(result.invalidRows).toBe(0)
    expect(result.siteCount).toBe(2)
    expect(result.tunnelCount).toBe(4)
    expect(result.unsurveyedRowCount).toBe(1)
    expect(result.surveys).toHaveLength(4)
  })
})
