import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startSheetScheduler } from '../../src/pipeline/sheetScheduler.js'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/fake-id/pub?output=csv'
const SAMPLE_CSV = 'Property Name,Unique ID\nTest Farm,T001'
const MINUTE = 60 * 1000

function successResult(rawCsv = SAMPLE_CSV) {
  return { rawCsv, fetchedAt: new Date().toISOString(), status: 'success', noChanges: false }
}

function failedResult() {
  return {
    rawCsv: null,
    fetchedAt: new Date().toISOString(),
    status: 'failed',
    noChanges: false,
    error: 'Sheet request failed: 503',
  }
}

function makeLogger() {
  return { info: vi.fn(), error: vi.fn() }
}

let scheduler

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  scheduler?.stop()
  scheduler = undefined
  vi.useRealTimers()
})

describe('US-23: sheet fetch scheduler', () => {
  it('runs the job again after the configured interval elapses', async () => {
    const fetchExport = vi.fn().mockResolvedValue(successResult())

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      intervalMinutes: 5,
      fetchExport,
      parseExport: vi.fn().mockReturnValue({ totalRows: 1 }),
      logger: makeLogger(),
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchExport).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5 * MINUTE - 1)
    expect(fetchExport).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchExport).toHaveBeenCalledTimes(2)
    expect(fetchExport).toHaveBeenLastCalledWith(SHEET_URL, expect.any(Object))
  })

  it('logs a failed run with a timestamp and still fires the next run', async () => {
    const fetchExport = vi
      .fn()
      .mockResolvedValueOnce(failedResult())
      .mockResolvedValueOnce(successResult())
    const logger = makeLogger()

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      intervalMinutes: 5,
      fetchExport,
      parseExport: vi.fn().mockReturnValue({ totalRows: 1 }),
      logger,
    })
    await vi.advanceTimersByTimeAsync(0)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        fetchedAt: expect.any(String),
        rowCount: 0,
        durationMs: expect.any(Number),
      })
    )

    await vi.advanceTimersByTimeAsync(5 * MINUTE)
    expect(fetchExport).toHaveBeenCalledTimes(2)
  })

  it('keeps running if the fetch itself throws unexpectedly', async () => {
    const fetchExport = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(successResult())
    const logger = makeLogger()

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      intervalMinutes: 5,
      fetchExport,
      parseExport: vi.fn().mockReturnValue({ totalRows: 1 }),
      logger,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))

    await vi.advanceTimersByTimeAsync(5 * MINUTE)
    expect(fetchExport).toHaveBeenCalledTimes(2)
  })

  it('hands rawCsv to parseExport unchanged and logs the run record', async () => {
    const fetchExport = vi.fn().mockResolvedValue(successResult())
    const parseExport = vi.fn().mockReturnValue({ totalRows: 1 })
    const logger = makeLogger()

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      intervalMinutes: 5,
      fetchExport,
      parseExport,
      logger,
    })
    await vi.advanceTimersByTimeAsync(0)

    expect(parseExport).toHaveBeenCalledWith(SAMPLE_CSV, expect.any(String))
    expect(logger.info).toHaveBeenCalledWith({
      fetchedAt: expect.any(String),
      status: 'success',
      rowCount: 1,
      durationMs: expect.any(Number),
    })
  })

  it('passes the previous CSV to the next run so unchanged sheets report no_changes', async () => {
    const fetchExport = vi
      .fn()
      .mockResolvedValueOnce(successResult())
      .mockResolvedValueOnce({ ...successResult(), status: 'no_changes', noChanges: true })
    const parseExport = vi.fn().mockReturnValue({ totalRows: 1 })

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      intervalMinutes: 5,
      fetchExport,
      parseExport,
      logger: makeLogger(),
    })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(5 * MINUTE)

    expect(fetchExport).toHaveBeenNthCalledWith(1, SHEET_URL, { previousRawCsv: null })
    expect(fetchExport).toHaveBeenNthCalledWith(2, SHEET_URL, { previousRawCsv: SAMPLE_CSV })
    expect(parseExport).toHaveBeenCalledTimes(1)
  })

  it('defaults to a 15 minute interval', async () => {
    const fetchExport = vi.fn().mockResolvedValue(successResult())

    scheduler = startSheetScheduler({
      sheetCsvUrl: SHEET_URL,
      fetchExport,
      parseExport: vi.fn().mockReturnValue({ totalRows: 1 }),
      logger: makeLogger(),
    })
    await vi.advanceTimersByTimeAsync(15 * MINUTE - 1)
    expect(fetchExport).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(fetchExport).toHaveBeenCalledTimes(2)
  })
})
