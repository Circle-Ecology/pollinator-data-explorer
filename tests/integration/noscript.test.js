import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('embed noscript fallback', () => {
  it('contains a noscript block with the direct link', () => {
    const html = fs.readFileSync(
      path.resolve('index.html'),
      'utf8'
    )

    expect(html).toContain('<noscript')
    expect(html).toContain('Open the Pollinator Data Explorer')
  })
})