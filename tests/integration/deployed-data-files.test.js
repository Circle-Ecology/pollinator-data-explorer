import { describe, expect, it } from 'vitest'
import process from 'node:process'

// US-26: checks a real Netlify deploy (production or a deploy preview). Skipped
// unless DEPLOYED_URL is set, e.g.
//   DEPLOYED_URL=https://<site>.netlify.app npx vitest run tests/integration/deployed-data-files.test.js
const deployedUrl = process.env.DEPLOYED_URL?.replace(/\/$/, '')
const DATA_FILES = ['sites.json', 'observations.json', 'dataset-status.json']

describe.skipIf(!deployedUrl)('deployed data files - US-26', () => {
  it.each(DATA_FILES)('serves /data/%s over HTTPS with the documented Cache-Control', async (file) => {
    const response = await fetch(`${deployedUrl}/data/${file}`)

    expect(response.url.startsWith('https://')).toBe(true)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/json/)
    expect(response.headers.get('cache-control')).toMatch(/max-age=900/)
    await expect(response.json()).resolves.toBeDefined()
  })
})
