import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishDatasetIfValid, readCurrentStatus, recordFetchFailure, ALERT_AFTER_FAILURES }
  from '../../src/pipeline/publishDatasetIfValid.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

const roots = []
const now = () => new Date('2026-11-23T12:00:00.000Z')
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
async function liveDirectory() {
  const base = await mkdtemp(join(tmpdir(), 'us25-guard-'))
  roots.push(base)
  return join(base, 'data')
}
const bad = () => ({ ...makePublicDataset(), totalRows: 10, validRows: 0, invalidRows: 10,
  errors: [{ rowNumber: 7, column: 'Coordinates', code: 'MALFORMED', message: 'bad coordinates' }] })
const read = async (dir, name) => JSON.parse(await readFile(join(dir, name), 'utf8'))
afterEach(async () => { await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true }))) })

describe('publishDatasetIfValid', () => {
  it('publishes a clean candidate and returns the new status', async () => {
    const outputDirectory = await liveDirectory()
    const result = await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, now, logger: logger() })
    expect(result.published).toBe(true)
    expect(result.status).toMatchObject({ status: 'published', generatedAt: now().toISOString(), siteCount: 1 })
    expect(await read(outputDirectory, 'dataset-status.json')).toEqual(result.status)
  })

  it('does not replace the published files when the candidate is invalid, and marks publish_failed', async () => {
    const outputDirectory = await liveDirectory()
    const log = logger()
    const first = await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, now, logger: log })
    const sitesBefore = await readFile(join(outputDirectory, 'sites.json'), 'utf8')
    const later = () => new Date('2026-11-24T12:00:00.000Z')
    const result = await publishDatasetIfValid(bad(), await readCurrentStatus(outputDirectory),
      { outputDirectory, now: later, logger: log })
    expect(result.published).toBe(false)
    expect(await readFile(join(outputDirectory, 'sites.json'), 'utf8')).toBe(sitesBefore)
    // generatedAt and counts still describe the last good publish.
    expect(result.status).toMatchObject({ status: 'publish_failed', generatedAt: first.status.generatedAt,
      siteCount: first.status.siteCount, tunnelCount: first.status.tunnelCount, consecutiveFailureCount: 1 })
    expect(await read(outputDirectory, 'dataset-status.json')).toEqual(result.status)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ occurredAt: '2026-11-24T12:00:00.000Z',
      reason: expect.stringContaining('mostly invalid'), consecutiveFailureCount: 1,
      firstError: { rowNumber: 7, column: 'Coordinates', code: 'MALFORMED', message: 'bad coordinates' } }))
  })

  it('keeps publishing a batch with a few invalid rows (#45), excluding them', async () => {
    const outputDirectory = await liveDirectory()
    const some = { ...makePublicDataset(), totalRows: 100, invalidRows: 5,
      errors: [{ rowNumber: 3, column: 'x', code: 'c', message: 'm' }] }
    expect((await publishDatasetIfValid(some, null, { outputDirectory, now, logger: logger() })).published).toBe(true)
  })

  it('counts consecutive failures, emits an alert on the third, and resets after a success', async () => {
    const outputDirectory = await liveDirectory()
    const log = logger()
    let status = (await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, now, logger: log })).status
    for (let i = 1; i <= ALERT_AFTER_FAILURES; i++) {
      status = (await publishDatasetIfValid(bad(), status, { outputDirectory, now, logger: log })).status
      expect(status.consecutiveFailureCount).toBe(i)
    }
    expect(log.error.mock.calls.filter(([entry]) => entry.alert)).toHaveLength(1)
    expect(log.error.mock.calls.at(-1)[0]).toMatchObject({ alert: true, consecutiveFailureCount: 3 })
    const ok = await publishDatasetIfValid(makePublicDataset(), status, { outputDirectory, now, logger: log })
    expect(ok.status.consecutiveFailureCount).toBeUndefined()
  })

  it('treats a write failure as publish_failed and preserves the last good files', async () => {
    const outputDirectory = await liveDirectory()
    await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, now, logger: logger() })
    const sitesBefore = await readFile(join(outputDirectory, 'sites.json'), 'utf8')
    const result = await publishDatasetIfValid(makePublicDataset(), await readCurrentStatus(outputDirectory),
      { outputDirectory, now: () => new Date(NaN), logger: logger() })
    expect(result).toMatchObject({ published: false, status: { status: 'publish_failed' } })
    expect(await readFile(join(outputDirectory, 'sites.json'), 'utf8')).toBe(sitesBefore)
  })
})

describe('recordFetchFailure', () => {
  it('marks fetch_failed without touching sites.json or observations.json', async () => {
    const outputDirectory = await liveDirectory()
    const log = logger()
    const first = await publishDatasetIfValid(makePublicDataset(), null, { outputDirectory, now, logger: log })
    const before = await Promise.all(['sites.json', 'observations.json'].map(n => readFile(join(outputDirectory, n), 'utf8')))
    const result = await recordFetchFailure('Sheet request failed: 500', first.status, { outputDirectory, now, logger: log })
    expect(result).toMatchObject({ published: false, status: { status: 'fetch_failed',
      generatedAt: first.status.generatedAt, consecutiveFailureCount: 1 } })
    const after = await Promise.all(['sites.json', 'observations.json'].map(n => readFile(join(outputDirectory, n), 'utf8')))
    expect(after).toEqual(before)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Sheet request failed: 500' }))
  })

  it('does not create a status file when nothing has ever been published', async () => {
    const outputDirectory = await liveDirectory()
    await recordFetchFailure('down', null, { outputDirectory, now, logger: logger() })
    await expect(readdir(outputDirectory)).rejects.toThrow()
  })
})
