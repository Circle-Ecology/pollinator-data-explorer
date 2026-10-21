
 // @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ObservationDetailsPanel from '../../src/components/ObservationDetailsPanel'

afterEach(() => {
  cleanup()
})

describe('ObservationDetailsPanel', () => {
  const observation = {
    siteId: 'site-1',
    tunnelId: 'tunnel-10',
    surveyDate: '2026-07-24',
    observationStatus: 'Occupied',
    occupantType: 'Bee',
    nesterFamily: 'Megachilidae',
    generalId: 'Mason bee',
    commonName: 'Blue orchard bee',
    plugDepth: 0,
    plugComposition: 'Mud',
    plugColor: null,
    plugConfidence: 'High',
    wholeOrHole: 'Whole',
    emergenceYear: 2026,
    manufacturedEmpty: false,
    recordStatus: 'Approved',
  }

  it('displays public observation details', () => {
    render(<ObservationDetailsPanel observation={observation} />)

    expect(screen.getByText('Observation Details')).toBeTruthy()
    expect(screen.getByText(/Blue orchard bee/)).toBeTruthy()
    expect(screen.getByText(/Megachilidae/)).toBeTruthy()
    expect(screen.getByText(/Mud/)).toBeTruthy()
  })

  it('displays Not recorded for missing values', () => {
    const { container } = render(
      <ObservationDetailsPanel observation={observation} />
    )

    expect(container.textContent).toContain('Plug color: Not recorded')
  })

  it('does not render when no observation is selected', () => {
    const { container } = render(
      <ObservationDetailsPanel observation={null} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('does not display private observation fields', () => {
    const observationWithPrivateData = {
      ...observation,
      observerId: 'private-123',
      observerEmail: 'private@example.com',
      observerFirstName: 'PrivateFirst',
      observerLastName: 'PrivateLast',
      notes: 'Confidential field notes',
      importBatchId: 'private-batch-123',
    }

    const { container } = render(
      <ObservationDetailsPanel
        observation={observationWithPrivateData}
      />
    )

    expect(container.textContent).not.toContain('private-123')
    expect(container.textContent).not.toContain('private@example.com')
    expect(container.textContent).not.toContain('PrivateFirst')
    expect(container.textContent).not.toContain('PrivateLast')
    expect(container.textContent).not.toContain('Confidential field notes')
    expect(container.textContent).not.toContain('private-batch-123')
  })

  it('renders an accessible non-modal dialog', () => {
    render(<ObservationDetailsPanel observation={observation} />)

    const dialog = screen.getByRole('dialog', {
      name: 'Observation details',
    })

    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('false')
  })

  it('does not render a dialog without an observation', () => {
    render(<ObservationDetailsPanel observation={null} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('displays a valid zero value and formats false as No', () => {
    const { container } = render(
      <ObservationDetailsPanel observation={observation} />
    )

    expect(container.textContent).toContain('Plug depth: 0')
    expect(container.textContent).toContain('Manufactured empty: No')
  })

  it('renders the observation details heading', () => {
    render(<ObservationDetailsPanel observation={observation} />)

    expect(
      screen.getByRole('heading', {
        name: 'Observation Details',
        level: 2,
      })
    ).toBeTruthy()
  })
})
