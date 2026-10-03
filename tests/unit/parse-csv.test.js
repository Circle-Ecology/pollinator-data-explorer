
import { describe, it, expect } from 'vitest'
import { parseCsvText } from '../../src/us08/parseCsvText.js'

describe('US-08: Parse CSV Text', () => {
  it('converts CSV rows into objects using column headers', () => {
    const csv = [
      'Property Name,City,State,Unique ID',
      'Test Farm,Longmont,CO,T001',
      'Second Farm,Boulder,CO,T002',
    ].join('\n')

    const result = parseCsvText(csv)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      'Property Name': 'Test Farm',
      City: 'Longmont',
      State: 'CO',
      'Unique ID': 'T001',
    })
  })

  it('handles quoted fields containing commas', () => {
    const csv = [
      'Property Name,Coordinates,Unique ID',
      'Test Farm,"40.15506, -105.0034",T001',
    ].join('\n')

    const result = parseCsvText(csv)

    expect(result[0].Coordinates).toBe(
      '40.15506, -105.0034'
    )
  })

  it('handles escaped quotation marks', () => {
    const csv = [
      'Property Name,Notes',
      'Test Farm,"Observed ""Bee"" activity"',
    ].join('\n')

    const result = parseCsvText(csv)

    expect(result[0].Notes).toBe('Observed "Bee" activity')
  })

  it('handles Windows CRLF line endings', () => {
    const csv = 'Property Name,Unique ID\r\nTest Farm,T001\r\n'

    const result = parseCsvText(csv)

    expect(result).toHaveLength(1)
    expect(result[0]['Unique ID']).toBe('T001')
  })

  it('removes UTF-8 BOM characters', () => {
    const csv = '\uFEFFProperty Name,Unique ID\nTest Farm,T001'

    const result = parseCsvText(csv)

    expect(result[0]['Property Name']).toBe('Test Farm')
  })

  it('handles line breaks inside quoted fields', () => {
    const csv =
      'Property Name,Notes\nTest Farm,"First line\nSecond line"'

    const result = parseCsvText(csv)

    expect(result[0].Notes).toBe('First line\nSecond line')
  })

  it('rejects rows with the wrong number of columns', () => {
    const csv = 'Property Name,Unique ID\nTest Farm'

    expect(() => parseCsvText(csv)).toThrow(
      /columns; expected/
    )
  })

  it('rejects unclosed quoted fields', () => {
    const csv = 'Property Name,Notes\nTest Farm,"Unclosed'

    expect(() => parseCsvText(csv)).toThrow(
      'CSV contains an unclosed quoted field'
    )
  })

  it('returns an empty array for an empty CSV', () => {
    expect(parseCsvText('')).toEqual([])
  })
})
