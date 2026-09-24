// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmbedFallbackNotice from '../../src/components/EmbedFallbackNotice'

describe('fallback accessibility', () => {
  it('makes the fallback link keyboard focusable', () => {
    render(<EmbedFallbackNotice publicAppUrl="https://example.com" />)

    const link = screen.getByRole('link', {
      name: 'Open the Pollinator Data Explorer',
    })

    link.focus()

    expect(document.activeElement).toBe(link)
  })
})