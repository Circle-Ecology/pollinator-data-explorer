// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TaxaBreakdownList from '../../src/components/TaxaBreakdownList'

describe('TaxaBreakdownList', () => {
  it('renders the top taxa by count', () => {
    const taxaCounts = [
      { commonName: 'Leafcutter Bee', nesterFamily: 'Megachilidae', count: 12 },
      { commonName: null, nesterFamily: 'Apidae', count: 5 },
    ]

    render(<TaxaBreakdownList taxaCounts={taxaCounts} />)

    expect(screen.getByText(/Leafcutter Bee.*12/)).toBeInTheDocument()
    expect(screen.getByText(/Apidae.*5/)).toBeInTheDocument()
  })

  it('shows a message when there are no identified occupants', () => {
    render(<TaxaBreakdownList taxaCounts={[]} />)

    expect(
      screen.getByText('No identified occupants recorded.')
    ).toBeInTheDocument()
  })
})
