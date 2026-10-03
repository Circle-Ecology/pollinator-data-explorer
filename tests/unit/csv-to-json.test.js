import { describe, expect, it } from 'vitest'
import { parseCsv } from '../../scripts/csv-to-json'

describe('parseCsv', () => {
  it('keeps quoted commas inside one field', () => {
    expect(parseCsv('Property Name,Coordinates\nSherwood OS,"40.14456, -105.0416"\n')).toEqual([
      ['Property Name', 'Coordinates'],
      ['Sherwood OS', '40.14456, -105.0416'],
    ])
  })

  it('handles a BOM, CRLF line endings, and escaped quotes', () => {
    expect(parseCsv('﻿Notes,City\r\n"said ""hi""",Longmont')).toEqual([
      ['Notes', 'City'],
      ['said "hi"', 'Longmont'],
    ])
  })
})
