// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import EmbedPage from '../../src/components/EmbedPage'

afterEach(() => vi.unstubAllGlobals())

describe('/embed when the API is down', () => {
  it('renders ExplorerErrorState instead of a blank map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<EmbedPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pollinator data is temporarily unavailable'
    )
    expect(screen.queryByTestId('explorer-map')).not.toBeInTheDocument()
  })
})