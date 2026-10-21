import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startSheetScheduler } from '../../src/pipeline/sheetScheduler.js'
import { writePublicDataset } from '../../src/pipeline/writePublicDataset.js'
import { parseExportCsv } from '../../src/us08/parseExportCsv.js'
import { generatePublicDataset } from '../../src/pipeline/generatePublicDataset.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

let scheduler
const directories = []
beforeEach(() => vi.useFakeTimers())
afterEach(async () => {
  scheduler?.stop()
  scheduler = undefined
  vi.useRealTimers()
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})
const success = { status: 'success', rawCsv: 'synthetic', fetchedAt: '2026-10-17T12:00:00.000Z' }
function start(overrides = {}) {
  const options = { fetchExport: vi.fn().mockResolvedValue(success),
    parseExport: vi.fn().mockReturnValue(makePublicDataset()),
    logger: { info: vi.fn(), error: vi.fn() }, ...overrides }
  scheduler = startSheetScheduler(options)
  return options
}

describe('US-24 opt-in scheduler boundary', () => {
  it('hands the exact normalized result to the optional async consumer and awaits it', async () => {
    let finish
    const waiting = new Promise(resolve => { finish = resolve })
    const onParsedResult = vi.fn().mockReturnValue(waiting)
    const options = start({ onParsedResult })
    await vi.advanceTimersByTimeAsync(0)
    expect(onParsedResult).toHaveBeenCalledWith(options.parseExport.mock.results[0].value)
    expect(options.logger.info).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(options.fetchExport).toHaveBeenCalledTimes(1)
    finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(options.logger.info).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(options.fetchExport).toHaveBeenCalledTimes(2)
  })

  it.each(['failed', 'no_changes'])('does not consume a %s fetch', async status => {
    const onParsedResult = vi.fn()
    start({ onParsedResult, fetchExport: vi.fn().mockResolvedValue({ ...success, status }) })
    await vi.advanceTimersByTimeAsync(0)
    expect(onParsedResult).not.toHaveBeenCalled()
  })

  it.each(['errors', 'invalidRows', 'isValid'])('still hands off a result with row-level %s elsewhere in the batch (#45)', async field => {
    const parsed = makePublicDataset()
    if (field === 'errors') parsed.errors = [{ message: 'malformed coordinates on some other row' }]
    if (field === 'invalidRows') parsed.invalidRows = 1
    if (field === 'isValid') parsed.isValid = false
    const onParsedResult = vi.fn()
    start({ onParsedResult, parseExport: vi.fn().mockReturnValue(parsed) })
    await vi.advanceTimersByTimeAsync(0)
    expect(onParsedResult).toHaveBeenCalledWith(parsed)
  })

  it.each(['missingDiagnostics', 'empty'])('does not hand off a shape-invalid or empty %s result', async field => {
    const parsed = makePublicDataset()
    if (field === 'missingDiagnostics') delete parsed.errors
    if (field === 'empty') parsed.totalRows = 0
    const onParsedResult = vi.fn()
    const options = start({ onParsedResult, parseExport: vi.fn().mockReturnValue(parsed) })
    await vi.advanceTimersByTimeAsync(0)
    expect(onParsedResult).not.toHaveBeenCalled()
    expect(options.logger.error).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed',
      error: 'Cannot hand off an invalid normalized import' }))
  })

  it('catches a parse exception without invoking the consumer', async () => {
    const onParsedResult = vi.fn()
    const options = start({ onParsedResult, parseExport: () => { throw new Error('parse failed') } })
    await vi.advanceTimersByTimeAsync(0)
    expect(onParsedResult).not.toHaveBeenCalled()
    expect(options.logger.error).toHaveBeenCalled()
  })

  it('logs a consumer failure and schedules another attempt', async () => {
    const onParsedResult = vi.fn().mockRejectedValueOnce(new Error('write failed')).mockResolvedValue(undefined)
    const options = start({ onParsedResult })
    await vi.advanceTimersByTimeAsync(0)
    expect(options.logger.error).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(onParsedResult).toHaveBeenCalledTimes(2)
    expect(options.fetchExport.mock.calls[1][1].previousRawCsv).toBeNull()
  })

  it('skips an unchanged run after a successful handoff', async () => {
    const onParsedResult = vi.fn()
    const fetchExport = vi.fn().mockResolvedValueOnce(success)
      .mockResolvedValue({ ...success, status: 'no_changes' })
    start({ onParsedResult, fetchExport })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    expect(onParsedResult).toHaveBeenCalledOnce()
  })

  it('can write all three artifacts from explicitly authorized synthetic normalized input', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'us24-handoff-'))
    directories.push(outputDirectory)
    let complete
    const completed = new Promise(resolve => { complete = resolve })
    start({ onParsedResult: async parsed => { await writePublicDataset(parsed, { outputDirectory }); complete() } })
    await completed
    expect(JSON.parse(await readFile(join(outputDirectory, 'sites.json'), 'utf8'))).toHaveLength(1)
    expect(JSON.parse(await readFile(join(outputDirectory, 'observations.json'), 'utf8'))).toHaveLength(1)
    expect(JSON.parse(await readFile(join(outputDirectory, 'dataset-status.json'), 'utf8')))
      .toMatchObject({ sourceRowCount: 1, siteCount: 1, tunnelCount: 1, status: 'published' })
  })

  it('does not alter the US-08 pending default or invent site authorization', () => {
    const parsed = parseExportCsv('Property Name,Coordinates,Unique ID,Observation Date\nSynthetic,"40, -105",T1,01-01-2025', 'synthetic')
    expect(parsed.surveys[0].recordStatus).toBe('pending')
    expect(parsed.sites[0].isPublic).toBeNull()
    const result = generatePublicDataset(parsed)
    expect(result.sites).toEqual([])
    expect(result.observations).toEqual([])
  })
})
