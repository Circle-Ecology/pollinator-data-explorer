
import { describe, it, expect } from 'vitest'
import { parseExportRows } from '../../src/us08/parseExportRows.js'

function makeRow(overrides = {}) {
  return {
    'Property Name': 'Test Site',
    City: 'Longmont',
    State: 'CO',
    Coordinates: '40.17, -105.10',
    'Elevation (meters)': '1500',
    'Is Public': 'true',
    'Unique ID': 'T001',
    'Observation Date': '2026-07-20',
    'Observation Status': 'occupied',
    Direction: 'N',
    'Sun Exposure': 'partial sun',
    ...overrides,
  }
}

describe('US-08: Data conflict detection', () => {
  it('detects conflicting site elevation', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow({ 'Elevation (meters)': '1510' }),
    ], 'test-batch')

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SITE_ATTRIBUTE_CONFLICT',
          field: 'elevationMeters',
        }),
      ])
    )

    expect(result.sites[0].elevationMeters).toBe(1500)
  })

  it('detects conflicting tunnel sun exposure', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow({ 'Sun Exposure': 'full sun' }),
    ], 'test-batch')

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TUNNEL_ATTRIBUTE_CONFLICT',
          field: 'sunExposure',
        }),
      ])
    )

    expect(result.tunnels[0].sunExposure).toBe('partial sun')
  })

  it('detects conflicting public visibility', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow({ 'Is Public': 'false' }),
    ], 'test-batch')

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PUBLIC_VISIBILITY_CONFLICT',
        }),
      ])
    )
  })

  it('detects a tunnel assigned to different sites', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow({ 'Property Name': 'Other Site' }),
    ], 'test-batch')

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'TUNNEL_SITE_CONFLICT',
          tunnelId: 'T001',
        }),
      ])
    )
  })

  it('detects conflicting duplicate survey observations', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow({ 'Observation Status': 'empty' }),
    ], 'test-batch')

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_SURVEY',
          tunnelId: 'T001',
        }),
      ])
    )

    expect(result.surveys).toHaveLength(1)
    expect(result.surveys[0].observationStatus).toBe('occupied')
  })

  it('does not report conflicts for identical records', () => {
    const result = parseExportRows([
      makeRow(),
      makeRow(),
    ], 'test-batch')

    expect(result.errors).toHaveLength(0)
    expect(result.sites).toHaveLength(1)
    expect(result.tunnels).toHaveLength(1)
    expect(result.surveys).toHaveLength(1)
  })
})
