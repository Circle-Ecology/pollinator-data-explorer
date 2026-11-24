import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { publishDatasetIfValid } from '../../src/pipeline/publishDatasetIfValid.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const netlifyToml = await readFile(join(projectRoot, 'netlify.toml'), 'utf8')
const envExample = await readFile(join(projectRoot, 'env.example'), 'utf8')

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true }))) })

describe('Netlify build - US-26', () => {
  it('publishes the dataset into public/data before vite build, and deploys dist', () => {
    expect(netlifyToml).toMatch(/command = "npm run pipeline:publish -- public\/data && npm run build"/)
    expect(netlifyToml).toMatch(/publish = "dist"/)
  })

  it('serves /data/* with a max-age of one SHEET_FETCH_INTERVAL_MINUTES window', () => {
    const minutes = Number(envExample.match(/SHEET_FETCH_INTERVAL_MINUTES=(\d+)/)[1])
    const headers = netlifyToml.slice(netlifyToml.indexOf('[[headers]]'))

    expect(headers).toMatch(/for = "\/data\/\*"/)
    expect(headers).toMatch(new RegExp(`Cache-Control = "public, max-age=${minutes * 60}, must-revalidate"`))
  })

  it('copies the published data files into the build output', async () => {
    const base = await mkdtemp(join(tmpdir(), 'us26-build-'))
    roots.push(base)
    const publicDir = join(base, 'public')
    const outDir = join(base, 'dist')
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

    const { published } = await publishDatasetIfValid(makePublicDataset(), null, {
      outputDirectory: join(publicDir, 'data'),
      logger,
    })
    expect(published).toBe(true)

    await build({
      root: projectRoot,
      publicDir,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    })

    const files = await readdir(join(outDir, 'data'))
    expect(files).toEqual(expect.arrayContaining(['sites.json', 'observations.json', 'dataset-status.json']))
    const sites = JSON.parse(await readFile(join(outDir, 'data', 'sites.json'), 'utf8'))
    expect(sites).toHaveLength(1)
  }, 60_000)
})
