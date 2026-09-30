import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmbedFallbackNotice from '../../src/components/EmbedFallbackNotice'
import ExplorerErrorState from '../../src/components/ExplorerErrorState'

describe('fallback accessibility', () => {
  it('lets the fallback link take keyboard focus', () => {
    render(<EmbedFallbackNotice appUrl="https://explorer.example.org" />)
    const link = screen.getByRole('link', {
      name: 'Open the Pollinator Data Explorer',
    })

    link.focus()
    expect(link).toHaveFocus()
  })

  it('defines a visible focus ring in the global CSS', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const rule = css.match(/a:focus-visible\s*\{([^}]*)\}/)

    expect(rule).not.toBeNull()
    expect(rule[1]).toMatch(/outline:\s*\d+px solid/)
    expect(rule[1]).not.toMatch(/outline:\s*(none|0)/)
  })

  it('announces the error state to screen readers and offers a keyboard-reachable retry', () => {
    render(<ExplorerErrorState onRetry={() => {}} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    expect(retry).toHaveFocus()
  })
})