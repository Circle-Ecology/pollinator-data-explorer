
import { describe, it, expect } from 'vitest'
import { parseExportRows } from '../../src/us08/parseExportRows.js'

describe('US-08: Normalize Export Rows', () => {
  it('creates one Site record for repeated property rows', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
      },
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T002',
      },
    ]

    const result = parseExportRows(rows)

    expect(result.sites).toHaveLength(1)
    expect(result.sites[0]).toMatchObject({
      propertyName: 'Test Farm',
      city: 'Longmont',
      state: 'CO',
      latitude: 40.15506,
      longitude: -105.0034,
    })
  })

  it('creates separate Site records for different properties', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
      },
      {
        'Property Name': 'Second Farm',
        'City': 'Boulder',
        'State': 'CO',
        'Coordinates': '40.0150, -105.2705',
        'Unique ID': 'T002',
      },
    ]

    const result = parseExportRows(rows)

    expect(result.sites).toHaveLength(2)
    expect(result.sites[0].propertyName).toBe('Test Farm')
    expect(result.sites[1].propertyName).toBe('Second Farm')
  })

  it('reports conflicting coordinates for the same property', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
      },
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.20000, -105.1000',
        'Unique ID': 'T002',
      },
    ]

    const result = parseExportRows(rows)

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'COORDINATE_CONFLICT',
        }),
      ])
    )
  })

  it('creates one Tunnel record for repeated surveys of the same tunnel', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2025',
      },
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2026',
      },
    ]

    const result = parseExportRows(rows)

    expect(result.tunnels).toHaveLength(1)
    expect(result.tunnels[0]).toMatchObject({
      tunnelId: 'T001',
      siteId: 'Test Farm',
    })
  })

  it('creates 3 Tunnel records and 12 TunnelSurvey records', () => {
    const tunnelIds = ['T001', 'T002', 'T003']
    const surveyDates = [
      '07-24-2023',
      '07-24-2024',
      '07-24-2025',
      '07-24-2026',
    ]

    const rows = tunnelIds.flatMap((tunnelId) =>
      surveyDates.map((surveyDate) => ({
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': tunnelId,
        'Observation Date': surveyDate,
        'Observation Status': 'Complete',
      }))
    )

    const result = parseExportRows(rows)

    expect(result.sites).toHaveLength(1)
    expect(result.tunnels).toHaveLength(3)
    expect(result.surveys).toHaveLength(12)

    expect(
      new Set(result.tunnels.map((t) => t.tunnelId)).size
    ).toBe(3)

    expect(
      new Set(
        result.surveys.map(
          (s) => `${s.tunnelId}:${s.surveyDate}`
        )
      ).size
    ).toBe(12)
  })

  it('normalizes NA values in survey records', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2026',
        'Observation Status': 'NA',
        'Occupant type': '  Bee  ',
        'Nester of family': '',
      },
    ]

    const result = parseExportRows(rows, 'batch-001')

    expect(result.surveys).toHaveLength(1)
    expect(result.surveys[0]).toMatchObject({
      tunnelId: 'T001',
      observationStatus: null,
      occupantType: 'Bee',
      nesterFamily: null,
      recordStatus: 'pending',
      importBatchId: 'batch-001',
    })
  })

  it('creates a Tunnel but no TunnelSurvey for an unsurveyed row', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': 'NA',
        'Observation Status': 'NA',
      },
    ]

    const result = parseExportRows(rows, 'batch-001')

    expect(result.sites).toHaveLength(1)
    expect(result.tunnels).toHaveLength(1)
    expect(result.tunnels[0].tunnelId).toBe('T001')
    expect(result.surveys).toHaveLength(0)
  })

  it('creates one survey for duplicate tunnel and date combinations', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2026',
        'Observation Status': 'Complete',
      },
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2026',
        'Observation Status': 'Complete',
      },
    ]

    const result = parseExportRows(rows, 'batch-001')

    expect(result.sites).toHaveLength(1)
    expect(result.tunnels).toHaveLength(1)
    expect(result.surveys).toHaveLength(1)

    expect(result.surveys[0]).toMatchObject({
      tunnelId: 'T001',
      surveyDate: '07-24-2026',
      recordStatus: 'pending',
      importBatchId: 'batch-001',
    })
  })

  it('converts numeric and boolean CSV fields into correct types', () => {
    const rows = [
      {
        'Property Name': 'Test Farm',
        'City': 'Longmont',
        'State': 'CO',
        'Coordinates': '40.15506, -105.0034',
        'Unique ID': 'T001',
        'Observation Date': '07-24-2026',
        'Installation Year': '2025',
        'Tunnel Diameter (inches)': '0.25',
        'Plug Depth': '2.5',
        'Emergence Year': '2026',
        'Manufactured Empty': 'false',
      },
    ]

    const result = parseExportRows(rows, 'batch-001')

    expect(result.tunnels[0].installationYear).toBe(2025)
    expect(result.tunnels[0].tunnelDiameterInches).toBe(0.25)
    expect(result.surveys[0].plugDepth).toBe(2.5)
    expect(result.surveys[0].emergenceYear).toBe(2026)
    expect(result.surveys[0].manufacturedEmpty).toBe(false)
  })
})
