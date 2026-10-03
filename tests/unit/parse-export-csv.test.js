
import { describe, it, expect } from 'vitest'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

describe('US-08: Parse Export CSV', () => {
  it('converts CSV data into Site, Tunnel, and Survey records', () => {
    const csv = [
      'Property Name,City,State,Coordinates,Unique ID,Observation Date,Observation Status',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T001,07-24-2025,Complete',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T001,07-24-2026,Complete',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T002,07-24-2026,Complete',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-001')

    expect(result.importBatchId).toBe('batch-001')
    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(3)
    expect(result.invalidRows).toBe(0)

    expect(result.siteCount).toBe(1)
    expect(result.tunnelCount).toBe(2)
    expect(result.surveyDateCount).toBe(2)

    expect(result.sites).toHaveLength(1)
    expect(result.tunnels).toHaveLength(2)
    expect(result.surveys).toHaveLength(3)

    expect(result.surveys[0].recordStatus).toBe('pending')
    expect(result.surveys[0].importBatchId).toBe('batch-001')
  })

  it('counts rows without survey dates', () => {
    const csv = [
      'Property Name,City,State,Coordinates,Unique ID,Observation Date',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T001,NA',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T002,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-002')

    expect(result.totalRows).toBe(2)
    expect(result.unsurveyedRowCount).toBe(1)
    expect(result.tunnels).toHaveLength(2)
    expect(result.surveys).toHaveLength(1)
  })

  it('handles a UTF-8 BOM and Windows line endings', () => {
    const csv = [
      '\uFEFFProperty Name,City,State,Coordinates,Unique ID,Observation Date',
      'Test Farm,Longmont,CO,"40.15506, -105.0034",T001,07-24-2026',
    ].join('\r\n')

    const result = parseExportCsv(
      new TextEncoder().encode(csv),
      'batch-003'
    )

    expect(result.totalRows).toBe(1)
    expect(result.siteCount).toBe(1)
    expect(result.tunnelCount).toBe(1)
    expect(result.surveys).toHaveLength(1)
  })

  it('returns empty records for a header-only CSV', () => {
    const csv =
      'Property Name,City,State,Coordinates,Unique ID,Observation Date'

    const result = parseExportCsv(csv, 'batch-004')

    expect(result.totalRows).toBe(0)
    expect(result.siteCount).toBe(0)
    expect(result.tunnelCount).toBe(0)
    expect(result.surveys).toHaveLength(0)
    expect(result.errors).toEqual([])
  })

  it('reports malformed coordinates without stopping the import', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,07-24-2026',
      'Test Farm,"40.15140.16231, -105.123483, -105.0403",T002,07-24-2026',
      'Test Farm,"40.15506, -105.0034",T003,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-005')

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.tunnels).toHaveLength(2)
    expect(result.surveys).toHaveLength(2)

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MALFORMED_COORDINATES',
          rowNumber: 3,
        }),
      ])
    )
  })

  it('reports missing property names', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      ',"40.15506, -105.0034",T001,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-006')

    expect(result.validRows).toBe(0)
    expect(result.invalidRows).toBe(1)
    expect(result.sites).toHaveLength(0)

    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: 'REQUIRED_FIELD_MISSING',
        rowNumber: 2,
      })
    )
  })

  it('reports missing tunnel IDs', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",NA,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-007')

    expect(result.validRows).toBe(0)
    expect(result.invalidRows).toBe(1)
    expect(result.tunnels).toHaveLength(0)

    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: 'REQUIRED_FIELD_MISSING',
        rowNumber: 2,
      })
    )
  })

  it('preserves valid records when other rows are invalid', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,07-24-2026',
      'Test Farm,"invalid coordinates",T002,07-24-2026',
      'Test Farm,"40.15506, -105.0034",T003,07-24-2026',
      'Test Farm,"40.15506, -105.0034",NA,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-008')

    expect(result.totalRows).toBe(4)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(2)

    expect(result.tunnels.map((tunnel) => tunnel.tunnelId)).toEqual([
      'T001',
      'T003',
    ])

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MALFORMED_COORDINATES',
          rowNumber: 3,
        }),
        expect.objectContaining({
          code: 'REQUIRED_FIELD_MISSING',
          rowNumber: 5,
        }),
      ])
    )
  })

  it('normalizes survey dates to YYYY-MM-DD', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-009')

    expect(result.surveys).toHaveLength(1)
    expect(result.surveys[0].surveyDate).toBe('2026-07-24')
  })

  it('reports invalid survey dates', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,13-45-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-010')

    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(0)
    expect(result.invalidRows).toBe(1)
    expect(result.surveys).toHaveLength(0)

    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: 'INVALID_DATE',
        rowNumber: 2,
      })
    )
  })

  it('keeps valid rows when another row has an invalid date', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,07-24-2026',
      'Test Farm,"40.15506, -105.0034",T002,13-45-2026',
      'Test Farm,"40.15506, -105.0034",T003,07-25-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-011')

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.tunnels).toHaveLength(2)
    expect(result.surveys).toHaveLength(2)

    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        code: 'INVALID_DATE',
        rowNumber: 3,
      })
    )
  })

  it('creates a Tunnel but no Survey for an unsurveyed row', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,NA',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-012')

    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(0)
    expect(result.unsurveyedRowCount).toBe(1)
    expect(result.tunnels).toHaveLength(1)
    expect(result.surveys).toHaveLength(0)
  })

  // NEW TEST 13
  it('maps the official US-07 CSV column names correctly', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date,Row,Column,Plug confidence,Whole or hole',
      'Test Farm,"40.15506, -105.0034",T001,07-24-2026,3,5,High,Whole',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-013')

    expect(result.errors).toEqual([])
    expect(result.tunnels).toHaveLength(1)
    expect(result.surveys).toHaveLength(1)

    expect(result.tunnels[0].gridRow).toBe('3')
    expect(result.tunnels[0].gridColumn).toBe('5')
    expect(result.surveys[0].plugConfidence).toBe('High')
    expect(result.surveys[0].wholeOrHole).toBe('Whole')
  })

  // NEW TEST 14
  it('reports UNSURVEYED_ROW warnings without creating Surveys', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID,Observation Date',
      'Test Farm,"40.15506, -105.0034",T001,NA',
      'Test Farm,"40.15506, -105.0034",T002,07-24-2026',
    ].join('\n')

    const result = parseExportCsv(csv, 'batch-014')

    expect(result.unsurveyedRowCount).toBe(1)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(0)
    expect(result.tunnels).toHaveLength(2)
    expect(result.surveys).toHaveLength(1)

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('UNSURVEYED_ROW'),
      ])
    )
  })
})
