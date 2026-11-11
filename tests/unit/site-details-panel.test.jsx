
 // @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SiteDetailsPanel from '../../src/components/SiteDetailsPanel'

afterEach(() => {
  cleanup()
})

const site = {
  siteId: 'site-1',
  propertyName: 'Test Farm',
  city: 'Longmont',
  state: 'CO',
  latitude: 40.1672,
  longitude: -105.1019,
  elevationMeters: 1520,
}

describe('SiteDetailsPanel - US-15', () => {
  it('renders the required site information', () => {
    render(<SiteDetailsPanel site={site} />)

    const dialog = screen.getByRole('dialog', {
      name: 'Site details: Test Farm',
    })

    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(dialog).toHaveTextContent('Test Farm')
    expect(dialog).toHaveTextContent('Longmont, CO')
    expect(dialog).toHaveTextContent('40.1672')
    expect(dialog).toHaveTextContent('-105.1019')
    expect(dialog).toHaveTextContent('1520 meters')
  })

  it('shows Not recorded for missing optional values', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          city: null,
          state: null,
          latitude: null,
          longitude: null,
          elevationMeters: null,
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(
      screen.getAllByText('Not recorded').length
    ).toBeGreaterThanOrEqual(4)

    expect(dialog).not.toHaveTextContent('undefined')
    expect(dialog).not.toHaveTextContent('null')
  })

  it('does not expose staff-only fields', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          observerName: 'Private Observer',
          observerEmail: 'private@example.com',
          notes: 'Confidential staff note',
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).not.toHaveTextContent('Private Observer')
    expect(dialog).not.toHaveTextContent('private@example.com')
    expect(dialog).not.toHaveTextContent('Confidential staff note')
  })

  it('shows the tunnel count without exposing individual tunnel data', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          generalIds: ['Bee A'],
          tunnelCount: 10,
          holeCount: 25,
          tunnels: [{ tunnelId: 'T1' }],
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent('Tunnel count: 10')
    expect(dialog).not.toHaveTextContent('Bee A')
    expect(dialog).not.toHaveTextContent('Tunnel ID')
    expect(dialog).not.toHaveTextContent('T1')
    expect(dialog).not.toHaveTextContent('Total holes')
  })

  it('updates when the selected site changes', () => {
    const { rerender } = render(
      <SiteDetailsPanel site={site} />
    )

    rerender(
      <SiteDetailsPanel
        site={{
          ...site,
          siteId: 'site-2',
          propertyName: 'Second Farm',
          city: 'Boulder',
        }}
      />
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Site details: Second Farm',
    })

    expect(dialog).toHaveTextContent('Boulder, CO')
    expect(dialog).not.toHaveTextContent('Test Farm')
  })

  it('preserves zero as a valid coordinate and elevation', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          latitude: 0,
          longitude: 0,
          elevationMeters: 0,
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent('Latitude: 0')
    expect(dialog).toHaveTextContent('Longitude: 0')
    expect(dialog).toHaveTextContent('Elevation: 0 meters')
  })

  it('displays survey statistics and occupancy rate', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          firstSurveyDate: '2023-05-07',
          lastSurveyDate: '2026-10-01',
          surveyedInLatestSeason: true,
          surveyDateCount: 32,
          tunnelCount: 449,
          occupiedTunnelCount: 170,
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent('Survey visits: 32')
    expect(dialog).toHaveTextContent('Tunnel count: 449')
    expect(dialog).toHaveTextContent(
      'Occupancy rate: 38% (170 of 449)'
    )
    expect(dialog).toHaveTextContent('Survey dates: May 7, 2023 - Current')
    expect(dialog).not.toHaveTextContent('October 1, 2026')
    expect(dialog).not.toHaveTextContent('Site activity duration')
  })

  it('ends the survey dates at the last survey for a site no longer surveyed', () => {
    render(
      <SiteDetailsPanel
        site={{
          ...site,
          firstSurveyDate: '2023-05-07',
          lastSurveyDate: '2023-10-08',
          surveyedInLatestSeason: false,
        }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent(
      'Survey dates: May 7, 2023 - October 8, 2023'
    )
    expect(dialog).not.toHaveTextContent('Current')
  })

  it('does not display unsupported occupant information', () => {
    render(
      <SiteDetailsPanel
        site={{ ...site, taxaCounts: [] }}
      />
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).not.toHaveTextContent(
      'No identified occupants recorded.'
    )

    expect(dialog).not.toHaveTextContent('Top taxa')
  })
})
