import { describe, it, expect } from 'vitest'
import { parseExportRows } from '../../src/us08/parseExportRows.js'

function makeRow(overrides = {}) {
  return {
    'Property Name': 'Boulder Creek Estates OS',
    'Block # (site)': '1',
    City: 'Longmont',
    State: 'CO',
    Coordinates: '40.15506, -105.0034',
    'Elevation (meters)': '1482',
    'Unique ID': 'T-1-A',
    'Observation Date': '2026-07-20',
    'Observation Status': 'Active',
    ...overrides,
  }
}
const site3 = overrides => makeRow({
  'Block # (site)': '3', Coordinates: '40.15467, -104.9992',
  'Elevation (meters)': '1483', 'Unique ID': 'T-3-A', ...overrides,
})

describe('site identity: one property name spanning several site blocks', () => {
  it('treats each block as its own site, with no conflict', () => {
    const result = parseExportRows([makeRow(), site3(), makeRow(), site3()], 'b')
    expect(result.errors).toEqual([])
    expect(result.sites.map(s => s.siteId)).toEqual([
      'Boulder Creek Estates OS (Site 1)', 'Boulder Creek Estates OS (Site 3)',
    ])
    expect(result.sites.map(s => [s.propertyName, s.latitude])).toEqual([
      ['Boulder Creek Estates OS (Site 1)', 40.15506], ['Boulder Creek Estates OS (Site 3)', 40.15467],
    ])
  })

  it('attaches each tunnel to the site for its own block', () => {
    const result = parseExportRows([makeRow(), site3()], 'b')
    expect(result.tunnels.map(t => [t.tunnelId, t.siteId])).toEqual([
      ['T-1-A', 'Boulder Creek Estates OS (Site 1)'], ['T-3-A', 'Boulder Creek Estates OS (Site 3)'],
    ])
  })

  it('does not depend on row order', () => {
    const result = parseExportRows([site3(), makeRow()], 'b')
    expect(result.sites.map(s => s.siteId).sort()).toEqual([
      'Boulder Creek Estates OS (Site 1)', 'Boulder Creek Estates OS (Site 3)',
    ])
  })

  it('leaves a single-block property named exactly as before', () => {
    const result = parseExportRows([makeRow(), makeRow({ 'Unique ID': 'T-1-B' })], 'b')
    expect(result.sites.map(s => s.siteId)).toEqual(['Boulder Creek Estates OS'])
    expect(result.tunnels.every(t => t.siteId === 'Boulder Creek Estates OS')).toBe(true)
  })

  it('still reports a coordinate conflict inside one block', () => {
    const result = parseExportRows([makeRow(), site3(), makeRow({ Coordinates: '40.2, -105.0' })], 'b')
    expect(result.errors).toEqual([expect.objectContaining({
      code: 'COORDINATE_CONFLICT', propertyName: 'Boulder Creek Estates OS (Site 1)',
    })])
  })
})
