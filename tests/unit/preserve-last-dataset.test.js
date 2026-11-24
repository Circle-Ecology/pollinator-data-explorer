import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writePublicDataset } from '../../src/pipeline/writePublicDataset.js'
import { assertPublishableImport } from '../../src/pipeline/assertPublishableImport.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

const roots = []
async function liveDataDirectory() {
  const base = await mkdtemp(join(tmpdir(), 'us25-'))
  roots.push(base)
  const out = join(base, 'data')
  await mkdir(out)
  await writeFile(join(out, 'sites.json'), 'OLD')
  return { base, out }
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('US-25 preserve last published dataset', () => {
  it('replaces the previous dataset and leaves no staging directories behind', async () => {
    const { base, out } = await liveDataDirectory()
    await writePublicDataset(makePublicDataset(), { outputDirectory: out })
    expect(JSON.parse(await readFile(join(out, 'sites.json'), 'utf8'))).toHaveLength(1)
    expect(await readdir(base)).toEqual(['data'])
  })

  it('keeps the previous dataset when generation fails before any write', async () => {
    const { out } = await liveDataDirectory()
    await expect(writePublicDataset(makePublicDataset(), { outputDirectory: out, now: () => new Date(NaN) }))
      .rejects.toThrow('Invalid generation timestamp')
    expect(await readFile(join(out, 'sites.json'), 'utf8')).toBe('OLD')
  })

  it('keeps the previous dataset and leaves nothing behind when the write fails', async () => {
    const { base, out } = await liveDataDirectory()
    // Parent of the target is a file, so staging cannot be created.
    await expect(writePublicDataset(makePublicDataset(), { outputDirectory: join(out, 'sites.json', 'x') }))
      .rejects.toThrow('Unable to write public dataset')
    expect(await readFile(join(out, 'sites.json'), 'utf8')).toBe('OLD')
    expect(await readdir(base)).toEqual(['data'])
  })
})

describe('US-25 publishable import gate', () => {
  const good = { errors: [], validRows: 8, totalRows: 10, invalidRows: 2 }
  it('accepts a mostly valid import', () => {
    expect(() => assertPublishableImport(good)).not.toThrow()
  })
  it.each([
    ['null parse', null],
    ['zero valid rows', { ...good, validRows: 0, invalidRows: 10 }],
    ['mostly invalid', { ...good, validRows: 1, invalidRows: 9.5 }],
    ['missing errors array', { ...good, errors: undefined }],
  ])('refuses %s', (_label, parsed) => {
    expect(() => assertPublishableImport(parsed)).toThrow('empty or mostly invalid')
  })
})
