
import { describe, it, expect } from 'vitest'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

describe('US-08: Synthetic CSV Regression and Performance', () => {
  it('parses 42,420 generated rows without requiring the production CSV', () => {
    const rowCount = 42420
    const tunnelCount = 2973
    const siteCount = 6

    const headers = [
      'Property Name',
      'City',
      'State',
      'Coordinates',
      'Unique ID',
      'Observation Date',
      'Observation Status',
    ].join(',')

    const rows = [headers]

    for (let index = 0; index < rowCount; index++) {
      const tunnelIndex = index % tunnelCount
      const siteIndex = tunnelIndex % siteCount

      // Use a date format found in the stakeholder export.
      const month = (Math.floor(index / tunnelCount) % 12) + 1
      const day = (Math.floor(index / (tunnelCount * 12)) % 28) + 1

      const surveyDate = `${month}/${day}/2026`

      rows.push([
        `Synthetic Site ${siteIndex + 1}`,
        'Longmont',
        'CO',
        '"40.15506, -105.0034"',
        `T${String(tunnelIndex + 1).padStart(4, '0')}`,
        surveyDate,
        'Complete',
      ].join(','))
    }

    const csv = rows.join('\n')

    const start = performance.now()
    const result = parseExportCsv(csv, 'synthetic-test')
    const elapsed = performance.now() - start

    expect(result.totalRows).toBe(rowCount)
    expect(result.validRows).toBe(rowCount)
    expect(result.invalidRows).toBe(0)

    expect(result.siteCount).toBe(siteCount)
    expect(result.tunnelCount).toBe(tunnelCount)

    expect(result.sites).toHaveLength(siteCount)
    expect(result.tunnels).toHaveLength(tunnelCount)

    // Verify the generated dates are normalized.
    expect(result.surveys.length).toBeGreaterThan(0)
    expect(
      result.surveys.every(
        (survey) => /^\d{4}-\d{2}-\d{2}$/.test(survey.surveyDate)
      )
    ).toBe(true)

    // Generated rows should not contain conflicts.
    expect(result.errors).toEqual([])

    // Keep the same performance requirement as the production test.
    expect(elapsed).toBeLessThan(60000)
  }, 70000)
})
