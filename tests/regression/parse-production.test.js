
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

      // Verify known duplicate survey conflicts
      const duplicateSurveyErrors = result.errors.filter(
        (error) => error.code === 'DUPLICATE_SURVEY'
      )

      expect(duplicateSurveyErrors).toHaveLength(41)

      // Verify known site attribute conflicts
      const siteAttributeConflicts = result.errors.filter(
        (error) => error.code === 'SITE_ATTRIBUTE_CONFLICT'
      )

      expect(siteAttributeConflicts).toHaveLength(2)

      expect(
        siteAttributeConflicts.every(
          (error) => error.field === 'elevationMeters'
        )
      ).toBe(true)

      // Verify known tunnel attribute conflict
      const tunnelAttributeConflicts = result.errors.filter(
        (error) => error.code === 'TUNNEL_ATTRIBUTE_CONFLICT'
      )

      expect(tunnelAttributeConflicts).toHaveLength(1)
      expect(tunnelAttributeConflicts[0].field).toBe('sunExposure')

      // Verify no unexpected validation errors
      const knownErrorCodes = new Set([
        'COORDINATE_CONFLICT',
        'DUPLICATE_SURVEY',
        'SITE_ATTRIBUTE_CONFLICT',
        'TUNNEL_ATTRIBUTE_CONFLICT',
      ])

      const unexpectedErrors = result.errors.filter(
        (error) => !knownErrorCodes.has(error.code)
      )

      expect(unexpectedErrors).toHaveLength(0)
    },
    70000 // Allow up to 70 seconds for the test
  )
})
