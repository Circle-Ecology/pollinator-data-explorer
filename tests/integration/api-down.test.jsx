// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExplorerErrorState from '../../src/components/ExplorerErrorState'

describe('ExplorerErrorState', () => {
  it('shows a message when the API is unavailable', () => {
    render(<ExplorerErrorState />)

    const message = screen.getByText(
      /the pollinator data is temporarily unavailable/i
    )

    expect(message).toBeTruthy()
  })
})