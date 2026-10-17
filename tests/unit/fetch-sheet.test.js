import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchSheetExport } from '../../src/pipeline/fetchSheetExport.js'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/fake-id/pub?output=csv'

const SAMPLE_CSV = [
  'Property Name,City,State,Coordinates,Unique ID,Observation Date',
  'Test Farm,Longmont,CO,"40.15506, -105.0034",T001,07-24-2025',
].join('\n')

function mockFetchResponse({ ok = true, status = 200, body = SAMPLE_CSV } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(body),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('US-23: fetchSheetExport', () => {
  it('returns rawCsv and a fetchedAt timestamp for a 200 response', async () => {
    const fetchMock = mockFetchResponse()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchSheetExport(SHEET_URL)

    expect(fetchMock).toHaveBeenCalledWith(SHEET_URL)
    expect(result.status).toBe('success')
    expect(result.rawCsv).toBe(SAMPLE_CSV)
    expect(new Date(result.fetchedAt).toISOString()).toBe(result.fetchedAt)
  })

  it('returns status "failed" for a non-200 response without throwing', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({ ok: false, status: 503, body: '' }))

    const result = await fetchSheetExport(SHEET_URL)

    expect(result.status).toBe('failed')
    expect(result.rawCsv).toBeNull()
    expect(result.fetchedAt).toEqual(expect.any(String))
  })

  it('returns status "failed" for a network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await fetchSheetExport(SHEET_URL)

    expect(result.status).toBe('failed')
    expect(result.rawCsv).toBeNull()
  })

  it('reports noChanges: true when the CSV matches the previous run', async () => {
    vi.stubGlobal('fetch', mockFetchResponse())

    const first = await fetchSheetExport(SHEET_URL)
    const second = await fetchSheetExport(SHEET_URL, { previousRawCsv: first.rawCsv })

    expect(first.noChanges).toBe(false)
    expect(second.noChanges).toBe(true)
    expect(second.status).toBe('no_changes')
    expect(second.rawCsv).toBe(SAMPLE_CSV)
  })
})
