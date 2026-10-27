
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ObservationSelector from '../../src/components/ObservationSelector'

afterEach(() => {
  cleanup()
})

describe('ObservationSelector', () => {
  const site = {
    siteId: 'site-1',
    propertyName: 'Test Pollinator Garden',
  }

  const observations = [
    {
      siteId: 'site-1',
      tunnelId: 'tunnel-10',
      surveyDate: '2026-07-24',
      commonName: 'Blue orchard bee',
    },
    {
      siteId: 'site-1',
      tunnelId: 'tunnel-20',
      surveyDate: '2026-07-25',
      commonName: 'Leafcutter bee',
    },
    {
      siteId: 'site-2',
      tunnelId: 'tunnel-30',
      surveyDate: '2026-07-26',
      commonName: 'Bumblebee',
    },
  ]

  it('renders nothing when no site is selected', () => {
    const { container } = render(
      <ObservationSelector observations={observations} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('shows only observations belonging to the selected site', () => {
    render(
      <ObservationSelector
        site={site}
        observations={observations}
      />
    )

    expect(screen.getByText(/Blue orchard bee/)).toBeTruthy()
    expect(screen.getByText(/Leafcutter bee/)).toBeTruthy()
    expect(screen.queryByText(/Bumblebee/)).toBeNull()
  })

  it('calls onSelectObservation with the selected observation ID', () => {
    const onSelectObservation = vi.fn()

    render(
      <ObservationSelector
        site={site}
        observations={observations}
        onSelectObservation={onSelectObservation}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Leafcutter bee/ })
    )

    expect(onSelectObservation).toHaveBeenCalledWith(
      'tunnel-20:2026-07-25'
    )
  })

  it('marks the selected observation', () => {
    render(
      <ObservationSelector
        site={site}
        observations={observations}
        selectedObservationId="tunnel-10:2026-07-24"
      />
    )

    expect(
      screen.getByRole('button', { name: /Blue orchard bee/ })
        .getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('shows a message when the site has no observations', () => {
    render(
      <ObservationSelector
        site={site}
        observations={[]}
      />
    )

    expect(
      screen.getByText('No observations available for this site.')
    ).toBeTruthy()
  })

  it('does not display private observation fields', () => {
    const privateObservation = {
      ...observations[0],
      observerName: 'Private Observer',
      observerEmail: 'private@example.com',
    }

    const { container } = render(
      <ObservationSelector
        site={site}
        observations={[privateObservation]}
      />
    )

    expect(container.textContent).not.toContain('Private Observer')
    expect(container.textContent).not.toContain('private@example.com')
  })
})
