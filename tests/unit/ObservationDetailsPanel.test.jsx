
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
      observerName: 'Private Observer',
      observerEmail: 'private@example.com',
      privateNotes: 'Confidential field notes',
    }

    render(
      <ObservationDetailsPanel
        observation={observationWithPrivateData}
      />
    )

    expect(screen.queryByText(/Private Observer/)).toBeNull()
    expect(screen.queryByText(/private@example.com/)).toBeNull()
    expect(screen.queryByText(/Confidential field notes/)).toBeNull()
  })
})
