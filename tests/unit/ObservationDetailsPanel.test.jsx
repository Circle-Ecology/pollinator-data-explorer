
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  const site = {
    siteId: 'site-1',
    propertyName: 'Test Pollinator Garden',
    city: 'Denver',
    state: 'Colorado',
    latitude: 39.7392,
    longitude: -104.9903,
    elevationMeters: 1609,
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
      observerName: 'Private Observer',
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
    expect(container.textContent).not.toContain('Private Observer')
    expect(container.textContent).not.toContain('Confidential field notes')
    expect(container.textContent).not.toContain('private-batch-123')
  })

  it('renders an accessible non-modal dialog', () => {
    render(<ObservationDetailsPanel observation={observation} />)

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
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

  it('formats the survey date correctly', () => {
    const { container } = render(
      <ObservationDetailsPanel observation={observation} />
    )

    expect(container.textContent).toContain(
      'Survey date: July 24, 2026'
    )
  })

  it('does not shift the survey date backward by one day', () => {
    const observationWithDate = {
      ...observation,
      surveyDate: '2026-01-01',
    }

    const { container } = render(
      <ObservationDetailsPanel observation={observationWithDate} />
    )

    expect(container.textContent).toContain(
      'Survey date: January 1, 2026'
    )

    expect(container.textContent).not.toContain(
      'December 31, 2025'
    )
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <ObservationDetailsPanel
        observation={observation}
        onClose={onClose}
      />
    )

    const closeButton = screen.getByRole('button', {
      name: 'Close observation details',
    })

    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()

    render(
      <ObservationDetailsPanel
        observation={observation}
        onClose={onClose}
      />
    )

    fireEvent.keyDown(document, {
      key: 'Escape',
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('displays Not recorded when site information is missing', () => {
    const siteWithMissingFields = {
      ...site,
      propertyName: null,
      city: null,
      state: undefined,
    }

    const { container } = render(
      <ObservationDetailsPanel
        observation={observation}
        site={siteWithMissingFields}
      />
    )

    expect(container.textContent).toContain(
      'Site name: Not recorded'
    )
    expect(container.textContent).toContain(
      'City: Not recorded'
    )
    expect(container.textContent).toContain(
      'State: Not recorded'
    )
    expect(container.textContent).not.toContain('undefined')
  })

  it('displays public site information and coordinates', () => {
    const { container } = render(
      <ObservationDetailsPanel
        observation={observation}
        site={site}
      />
    )

    expect(container.textContent).toContain(
      'Site name: Test Pollinator Garden'
    )
    expect(container.textContent).toContain('City: Denver')
    expect(container.textContent).toContain('State: Colorado')
    expect(container.textContent).toContain('Latitude: 39.7392')
    expect(container.textContent).toContain('Longitude: -104.9903')
  })

  it('updates details when a different observation is selected', () => {
    const { rerender } = render(
      <ObservationDetailsPanel observation={observation} />
    )

    expect(screen.getByText(/Blue orchard bee/)).toBeTruthy()

    const secondObservation = {
      ...observation,
      tunnelId: 'tunnel-20',
      commonName: 'Leafcutter bee',
    }

    rerender(
      <ObservationDetailsPanel observation={secondObservation} />
    )

    expect(screen.getByText(/Leafcutter bee/)).toBeTruthy()
    expect(screen.queryByText(/Blue orchard bee/)).toBeNull()
  })
})
