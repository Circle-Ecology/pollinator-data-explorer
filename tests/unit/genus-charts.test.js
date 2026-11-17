
import { describe, expect, it } from 'vitest'
import {
  buildGenusRows,
  buildTypeGenusRows,
  buildMultiGenusRows,
} from '../../src/utils/genusChartRows'

describe('US-32: Occupants by General ID', () => {
  it('sorts genera from highest to lowest count', () => {
    const data = [
      { generalId: 'Osmia', total: 3 },
      { generalId: 'Megachile', total: 12 },
      { generalId: 'Bombus', total: 7 },
    ]

    const rows = buildGenusRows(data)

    expect(rows.map(row => row.category)).toEqual([
      'Megachile',
      'Bombus',
      'Osmia',
    ])
  })

  it('displays an unknown General ID as Unknown genus', () => {
    const rows = buildGenusRows([
      { generalId: 'Unknown', total: 4 },
    ])

    expect(rows[0].category).toBe('Unknown genus')
  })
})

describe('US-32: Occupants by Occupant Type and General ID', () => {
  it('calculates percentages within each occupant type', () => {
    const data = [
      { occupantType: 'Bee', generalId: 'Osmia', occupants: 3, typeTotal: 4 },
      { occupantType: 'Bee', generalId: 'Bombus', occupants: 1, typeTotal: 4 },
      { occupantType: 'Wasp', generalId: 'Vespula', occupants: 2, typeTotal: 2 },
    ]

    const rows = buildTypeGenusRows(data)

    expect(rows.map(row => row.percent)).toEqual([75, 25, 100])
  })
})

describe('US-32: Multi-genus chart data', () => {
  it('uses the existing pipeline counts and site names', () => {
    const data = [
      {
        siteId: 'site-1',
        propertyName: 'Sandstone Ranch',
        multiGenus: 3,
      },
      {
        siteId: 'site-2',
        propertyName: 'Another Site',
        multiGenus: 0,
      },
    ]

    expect(buildMultiGenusRows(data)).toEqual([
      { category: 'Sandstone Ranch', total: 3 },
      { category: 'Another Site', total: 0 },
    ])
  })
})
