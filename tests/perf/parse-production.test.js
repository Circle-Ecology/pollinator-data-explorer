
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { performance } from 'node:perf_hooks'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'

const productionFile =
  process.env.PRODUCTION_CSV_PATH ||
  path.join(
    os.homedir(),
    'Downloads',
    'combined_data_clean_v02.csv'
  )

const productionFileExists = fs.existsSync(productionFile)

describe('US-08: Production CSV Performance', () => {
  it.skipIf(!productionFileExists)(
    'parses 42,420 rows in under 60 seconds',
    () => {
      const csv = fs.readFileSync(productionFile)

      const start = performance.now()
      const result = parseExportCsv(csv, 'performance-test')
      const elapsed = performance.now() - start

      expect(result.totalRows).toBe(42420)
      expect(elapsed).toBeLessThan(60000)
    },
    70000
  )
})
