import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('/embed HTML', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

  it('has a <noscript> block that explains JavaScript is required', () => {
    const block = html.match(/<noscript>([\s\S]*?)<\/noscript>/)
    expect(block).not.toBeNull()
    expect(block[1]).toMatch(/JavaScript/)
  })

  it('offers the direct link inside the <noscript> block', () => {
    const block = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1]
    expect(block).toMatch(/href="%PUBLIC_APP_URL%\/embed"/)
    expect(block).toMatch(/Open the Pollinator Data Explorer/)
  })
})