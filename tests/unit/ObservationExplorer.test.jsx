
 // @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import ObservationExplorer from '../../src/components/ObservationExplorer'

afterEach(() => {
  cleanup()
})

describe('ObservationExplorer - US-15', () => {
  const site = {
    siteId: 'site-1',
    propertyName: 'Test Pollinator Garden',
    city: 'Denver',
    state: 'CO',
    latitude: 39.7392,
    longitude: -104.9903,
    elevationMeters: 1609,
  }

  it('displays the selected site details', () => {
    render(<ObservationExplorer site={site} />)

    const dialog = screen.getByRole('dialog', {
      name: 'Site details: Test Pollinator Garden',
    })

    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Denver, CO')
    expect(dialog).toHaveTextContent('39.7392')
    expect(dialog).toHaveTextContent('-104.9903')
    expect(dialog).toHaveTextContent('1609 meters')
  })

  it('closes the panel when Close is clicked', () => {
    const onCloseDetails = vi.fn()

    render(
      <ObservationExplorer
        site={site}
        onCloseDetails={onCloseDetails}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close site details',
      })
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onCloseDetails).toHaveBeenCalledTimes(1)
  })

  it('closes the panel when Escape is pressed', () => {
    const onCloseDetails = vi.fn()

    render(
      <ObservationExplorer
        site={site}
        onCloseDetails={onCloseDetails}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onCloseDetails).toHaveBeenCalledTimes(1)
  })

  it('updates the panel when another site is selected', () => {
    const { rerender } = render(
      <ObservationExplorer
        site={site}
        markerSelectionCount={1}
      />
    )

    rerender(
      <ObservationExplorer
        site={{
          ...site,
          siteId: 'site-2',
          propertyName: 'Second Garden',
          city: 'Boulder',
        }}
        markerSelectionCount={2}
      />
    )

    expect(
      screen.getByRole('dialog', {
        name: 'Site details: Second Garden',
      })
    ).toHaveTextContent('Boulder, CO')

    expect(screen.queryByText('Test Pollinator Garden'))
      .not.toBeInTheDocument()
  })

  it('reopens when the same marker is selected again', () => {
    const { rerender } = render(
      <ObservationExplorer
        site={site}
        markerSelectionCount={1}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close site details',
      })
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(
      <ObservationExplorer
        site={site}
        markerSelectionCount={2}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders nothing when no site is selected', () => {
    render(<ObservationExplorer site={null} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
