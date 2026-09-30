// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import EmbedFallbackNotice from '../../src/components/EmbedFallbackNotice'

afterEach(() => vi.unstubAllEnvs())

describe('EmbedFallbackNotice', () => {
  it('renders the direct link built from PUBLIC_APP_URL', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://explorer.example.org')
    render(<EmbedFallbackNotice />)

    expect(
      screen.getByRole('link', { name: 'Open the Pollinator Data Explorer' })
    ).toHaveAttribute('href', 'https://explorer.example.org/embed')
  })
})