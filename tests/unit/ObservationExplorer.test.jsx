
 // @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ObservationExplorer from '../../src/components/ObservationExplorer'

afterEach(() => {
  cleanup()
})

describe('ObservationExplorer', () => {
  const site = {
    siteId: 'site-1',
    propertyName: 'Test Pollinator Garden',
    latitude: 39.7392,
    longitude: -104.9903,
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
  ]

  it('shows the observation selector for a selected site', () => {
    render(
      <ObservationExplorer site={site} observations={observations} />
    )

    expect(screen.getByText('Observations at Test Pollinator Garden')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the details panel when an observation is selected', () => {
    render(
      <ObservationExplorer site={site} observations={observations} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Blue orchard bee/ }))

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
    })

    expect(dialog.textContent).toContain('Blue orchard bee')
    expect(dialog.textContent).toContain('Test Pollinator Garden')
  })

  it('updates the details panel when another observation is selected', () => {
    render(
      <ObservationExplorer site={site} observations={observations} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Blue orchard bee/ }))
    fireEvent.click(screen.getByRole('button', { name: /Leafcutter bee/ }))

    const dialog = screen.getByRole('dialog', {
      name: 'Observation Details',
    })

    expect(dialog.textContent).toContain('Leafcutter bee')
    expect(dialog.textContent).not.toContain('Blue orchard bee')
  })

  it('closes the panel when Close is clicked', () => {
    render(
      <ObservationExplorer site={site} observations={observations} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Blue orchard bee/ }))
    fireEvent.click(screen.getByRole('button', {
      name: 'Close observation details',
    }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the panel when Escape is pressed', () => {
    render(
      <ObservationExplorer site={site} observations={observations} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Blue orchard bee/ }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
