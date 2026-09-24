// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmbedFallbackNotice from '../../src/components/EmbedFallbackNotice'

describe('EmbedFallbackNotice', () => {
  it('renders the direct link from PUBLIC_APP_URL', () => {
    const publicAppUrl = 'https://example.com'

    render(<EmbedFallbackNotice publicAppUrl={publicAppUrl} />)

    const link = screen.getByRole('link', {
      name: 'Open the Pollinator Data Explorer',
    })

    expect(link.getAttribute('href')).toBe(
      `${publicAppUrl}/embed`
    )
  })
})