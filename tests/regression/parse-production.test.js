import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

const productionFile = path.join(
  process.env.USERPROFILE,
  'Downloads',
  'combined_data_clean_v02.csv'
)

describe('US-08: Production Export Regression', () => {
  it('parses the full stakeholder export correctly', () => {
    if (!fs.existsSync(productionFile)) {
      console.warn(
        `Production export not found at ${productionFile}. Skipping local regression test.`
      )
      return
    }

    const csv = fs.readFileSync(productionFile)

    const result = parseExportCsv(csv, 'production-test')

    console.log('RESULT:', {
      totalRows: result.totalRows,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
      tunnelCount: result.tunnelCount,
      siteCount: result.siteCount,
      surveyDateCount: result.surveyDateCount,
      unsurveyedRowCount: result.unsurveyedRowCount,
      errorCount: result.errors.length,
    })

    console.log(
      'ERROR COUNTS:',
      Object.entries(
        result.errors.reduce((counts, error) => {
          counts[error.code] = (counts[error.code] || 0) + 1
          return counts
        }, {})
      )
    )

    expect(result.totalRows).toBe(42420)
    expect(result.tunnelCount).toBe(2973)
    expect(result.siteCount).toBe(6)
    expect(result.surveyDateCount).toBe(52)

    expect(result.tunnels).toHaveLength(2973)
    expect(result.sites).toHaveLength(6)

    const tunnelIds = result.tunnels.map((tunnel) => tunnel.tunnelId)

    expect(new Set(tunnelIds).size).toBe(2973)
  })
})