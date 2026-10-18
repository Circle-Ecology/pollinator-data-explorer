import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writePublicDataset } from '../../src/pipeline/writePublicDataset.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'
import { HEADER_TO_FIELD, STAFF_ONLY_HEADERS } from '../../src/validation/csvSchema.js'

const temporaryDirectories = []
const now = () => new Date('2026-10-17T12:00:00.000Z')
async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'us24-'))
  temporaryDirectories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('US-24 JSON artifacts', () => {
  it('writes exactly three compact public JSON files and accurate separate metadata', async () => {
    const directory = await temporaryDirectory()
    const input = makePublicDataset()
    input.totalRows = 99
    input.sites.push({ ...input.sites[0], siteId: 'S2' }) // Public site without surveys.
    input.tunnels.push({ tunnelId: 'UNSURVEYED', siteId: 'S1' })
    input.surveys.push({ ...input.surveys[0], surveyDate: '2025-01-02' })
    for (const record of [...input.sites, ...input.surveys]) {
      for (const header of STAFF_ONLY_HEADERS) record[HEADER_TO_FIELD[header]] = 'synthetic secret'
      record.privateMetadata = { notes: 'synthetic secret' }
    }
    input.warnings = ['synthetic private warning']
    const metadata = await writePublicDataset(input, { outputDirectory: join(directory, 'data'), now })
    expect(metadata).toEqual({ generatedAt: now().toISOString(), sourceRowCount: 99,
      siteCount: 2, tunnelCount: 1, status: 'published' })
    const files = await readdir(join(directory, 'data'))
    expect(files.sort()).toEqual(['dataset-status.json', 'observations.json', 'sites.json'])
    const contents = await Promise.all(files.map(name => readFile(join(directory, 'data', name), 'utf8')))
    const parsed = contents.map(text => JSON.parse(text))
    expect(parsed[0]).toEqual(metadata)
    expect(parsed[1]).toHaveLength(2)
    expect(parsed[2]).toHaveLength(2)
    function checkKeys(value) {
      if (value === null || typeof value !== 'object') return
      for (const [key, child] of Object.entries(value)) {
        expect([...STAFF_ONLY_HEADERS.map(header => HEADER_TO_FIELD[header]),
          'importBatchId', 'errors', 'warnings', 'privateMetadata']).not.toContain(key)
        checkKeys(child)
      }
    }
    parsed.forEach(checkKeys)
    expect(contents.join('')).not.toContain('synthetic secret')
  })

  it('writes empty authorized results with zero published counts', async () => {
    const outputDirectory = await temporaryDirectory()
    const input = makePublicDataset()
    input.sites[0].isPublic = false
    const metadata = await writePublicDataset(input, { outputDirectory, now })
    expect(metadata).toMatchObject({ sourceRowCount: 1, siteCount: 0, tunnelCount: 0 })
    expect(JSON.parse(await readFile(join(outputDirectory, 'observations.json'), 'utf8'))).toEqual([])
  })

  it('uses an ISO timestamp by default', async () => {
    const outputDirectory = await temporaryDirectory()
    const metadata = await writePublicDataset(makePublicDataset(), { outputDirectory })
    expect(new Date(metadata.generatedAt).toISOString()).toBe(metadata.generatedAt)
  })

  it('rejects invalid inputs before creating output', async () => {
    const root = await temporaryDirectory()
    const input = makePublicDataset()
    input.errors = [{ message: 'synthetic private diagnostic' }]
    await expect(writePublicDataset(input, { outputDirectory: join(root, 'data'), now }))
      .rejects.toThrow('Cannot generate from an invalid import')
    expect(await readdir(root)).toEqual([])
  })

  it('rejects an invalid clock before writing', async () => {
    const outputDirectory = await temporaryDirectory()
    await expect(writePublicDataset(makePublicDataset(), { outputDirectory, now: () => new Date(NaN) }))
      .rejects.toThrow('Invalid generation timestamp')
    expect(await readdir(outputDirectory)).toEqual([])
  })

  it('reports an invalid destination without serializing raw input', async () => {
    const root = await temporaryDirectory()
    const outputDirectory = join(root, 'file')
    await writeFile(outputDirectory, 'existing file')
    await expect(writePublicDataset(makePublicDataset(), { outputDirectory, now }))
      .rejects.toThrow('Unable to write public dataset')
    expect(await readFile(outputDirectory, 'utf8')).toBe('existing file')
  })
})
