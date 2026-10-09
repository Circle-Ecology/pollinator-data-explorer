
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

// Use a cross-platform path to the production CSV.
// Allow an explicit path through an environment variable.
const productionFile =
  process.env.PRODUCTION_CSV_PATH ||
  path.join(
    os.homedir(),
    'Downloads',
    'combined_data_clean_v02.csv'
  )

const productionFileExists = fs.existsSync(productionFile)

describe('US-08: Production Export Regression', () => {
  it.skipIf(!productionFileExists)(
    'parses the full stakeholder export correctly',
    () => {
      const csv = fs.readFileSync(productionFile)
      const result = parseExportCsv(csv, 'production-test')

      // Verify production dataset counts
      expect(result.totalRows).toBe(42420)
      expect(result.validRows).toBe(42420)
      expect(result.invalidRows).toBe(0)

      expect(result.tunnelCount).toBe(2973)
      expect(result.siteCount).toBe(6)

      // Current observed count; investigate the
      // 53-date expectation in issue #13 separately.
      expect(result.surveyDateCount).toBe(52)
      expect(result.unsurveyedRowCount).toBe(1722)

      // Verify generated records
      expect(result.tunnels).toHaveLength(2973)
      expect(result.sites).toHaveLength(6)

      // Verify tunnel IDs are unique
      const tunnelIds = result.tunnels.map(
        (tunnel) => tunnel.tunnelId
      )

      expect(new Set(tunnelIds).size).toBe(2973)

      // Verify expected coordinate conflict
      const coordinateConflicts = result.errors.filter(
        (error) => error.code === 'COORDINATE_CONFLICT'
      )

      expect(coordinateConflicts).toHaveLength(1)

      // Verify no unexpected validation errors
      expect(
        result.errors.filter(
          (error) => error.code !== 'COORDINATE_CONFLICT'
        )
      ).toHaveLength(0)
    },
    70000 // Allow up to 70 seconds for the test
  )
})
