import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishDatasetIfValid, readCurrentStatus } from '../../src/pipeline/publishDatasetIfValid.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true }))) })

describe('publish guard crash safety', () => {
  it('leaves a fully readable sites.json when a later run crashes mid-write', async () => {
    const base = await mkdtemp(join(tmpdir(), 'us25-crash-'))
    roots.push(base)
    const outputDirectory = join(base, 'data')
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, logger })
    const good = await readFile(join(outputDirectory, 'sites.json'), 'utf8')
    // Simulate a crashed earlier run that left half-written staging output behind.
    await writeFile(join(base, '.data.staging-1-1'), '{"half":')
    // A run whose clock is invalid fails after the candidate is built, before the swap.
    const result = await publishDatasetIfValid(makePublicDataset(), await readCurrentStatus(outputDirectory),
      { outputDirectory, logger, now: () => new Date(NaN) })
    expect(result.published).toBe(false)
    expect(await readFile(join(outputDirectory, 'sites.json'), 'utf8')).toBe(good)
    expect(JSON.parse(good)).toHaveLength(1)
    expect((await readdir(outputDirectory)).sort()).toEqual(
      ['dashboard.json', 'dataset-status.json', 'observations.json', 'sites.json'])
  })
})
