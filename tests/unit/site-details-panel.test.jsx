
 // @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SiteDetailsPanel from '../../src/components/SiteDetailsPanel'

afterEach(() => {
  cleanup()
})

const site = {
  propertyName: 'Test Farm',
  city: 'Longmont',
  state: 'CO',
  elevationMeters: 1520,
  tunnelCount: 10,
  occupiedTunnelCount: 4,
  firstSurveyDate: '2025-07-24',
  lastSurveyDate: '2026-07-24',
  surveyDateCount: 2,
  generalIds: ['Bee A', 'Bee B'],
  tunnels: [],
}

describe('SiteDetailsPanel', () => {
  it('renders the selected site summary', () => {
    render(<SiteDetailsPanel site={site} />)

    expect(
      screen.getByRole('dialog', {
        name: 'Site details: Test Farm',
      })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Site Details' })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Test Farm' })
    ).toBeInTheDocument()

    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Longmont, CO')).toBeInTheDocument()

    expect(screen.getByText('Elevation')).toBeInTheDocument()
    expect(screen.getByText('1520 meters')).toBeInTheDocument()

    expect(screen.getByText('Total tunnels')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    expect(screen.getByText('General IDs')).toBeInTheDocument()
    expect(screen.getByText('Bee A, Bee B')).toBeInTheDocument()

    expect(screen.getByText('Total holes')).toBeInTheDocument()
    expect(screen.getByText('Active duration')).toBeInTheDocument()
  })

  it('does not show private observer information or notes', () => {
    const siteWithPrivateData = {
      ...site,
      observerName: 'Private Observer',
      observerEmail: 'observer@circleecology.com',
      notes: 'Private staff note',
    }

    render(<SiteDetailsPanel site={siteWithPrivateData} />)

    expect(
      screen.queryByText('Private Observer')
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('observer@circleecology.com')
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Private staff note')
    ).not.toBeInTheDocument()
  })

  it('displays the site activity duration from survey dates', () => {
    render(<SiteDetailsPanel site={site} />)

    expect(
      screen.getByText('366 calendar days')
    ).toBeInTheDocument()
  })

  it('shows Not recorded when survey dates are missing', () => {
    const siteWithoutDates = {
      ...site,
      firstSurveyDate: null,
      lastSurveyDate: null,
    }

    render(<SiteDetailsPanel site={siteWithoutDates} />)

    expect(
      screen.getByText('Active duration').parentElement
    ).toHaveTextContent('Not recorded')
  })

  it('displays public tunnel information in one table', () => {
    const siteWithTunnels = {
      ...site,
      tunnels: [
        {
          tunnelId: 'T1',
          tunnelDiameterInches: 0.25,
          preference: 'Wood',
        },
        {
          tunnelId: 'T2',
          tunnelDiameterInches: 0.375,
          preference: 'Bamboo',
        },
      ],
    }

    render(<SiteDetailsPanel site={siteWithTunnels} />)

    expect(
      screen.getByRole('region', {
        name: 'Tunnel Information',
      })
    ).toBeInTheDocument()

    const table = screen.getByRole('table', {
      name: 'Tunnel information table',
    })

    expect(
      within(table).getByRole('columnheader', {
        name: 'Tunnel ID',
      })
    ).toBeInTheDocument()

    expect(
      within(table).getByRole('columnheader', {
        name: 'Preference',
      })
    ).toBeInTheDocument()

    expect(
      within(table).getByRole('columnheader', {
        name: 'Diameter',
      })
    ).toBeInTheDocument()

    expect(
      within(table).getByRole('row', { name: /T1/ })
    ).toHaveTextContent('Wood')

    expect(
      within(table).getByRole('row', { name: /T1/ })
    ).toHaveTextContent('0.25 inches')

    expect(
      within(table).getByRole('row', { name: /T2/ })
    ).toHaveTextContent('Bamboo')

    expect(
      within(table).getByRole('row', { name: /T2/ })
    ).toHaveTextContent('0.375 inches')

    expect(
      within(table).getAllByRole('row')
    ).toHaveLength(3)
  })

  it('shows Not recorded for missing tunnel attributes', () => {
    const siteWithMissingTunnelData = {
      ...site,
      tunnels: [
        {
          tunnelId: 'T3',
          preference: null,
          tunnelDiameterInches: null,
        },
      ],
    }

    render(<SiteDetailsPanel site={siteWithMissingTunnelData} />)

    const table = screen.getByRole('table', {
      name: 'Tunnel information table',
    })

    const tunnelRow = within(table).getByRole('row', {
      name: /T3/,
    })

    const cells = within(tunnelRow).getAllByRole('cell')

    expect(cells).toHaveLength(3)
    expect(cells[0]).toHaveTextContent('T3')
    expect(cells[1]).toHaveTextContent('Not recorded')
    expect(cells[2]).toHaveTextContent('Not recorded')
  })

  it('shows an empty-state message when no tunnels exist', () => {
    render(<SiteDetailsPanel site={{ ...site, tunnels: [] }} />)

    const table = screen.getByRole('table', {
      name: 'Tunnel information table',
    })

    expect(table).toBeInTheDocument()

    expect(
      within(table).getByText('No tunnel information recorded.')
    ).toBeInTheDocument()
  })

  it('shows Not recorded when General IDs are missing', () => {
    render(
      <SiteDetailsPanel
        site={{ ...site, generalIds: [] }}
      />
    )

    expect(
      screen.getByText('General IDs').parentElement
    ).toHaveTextContent('Not recorded')
  })

  it('displays a supplied hole count', () => {
    render(
      <SiteDetailsPanel
        site={{ ...site, holeCount: 25 }}
      />
    )

    expect(screen.getByText('Total holes')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('does not display another sites information', () => {
    const selectedSite = {
      ...site,
      propertyName: 'Selected Farm',
      generalIds: ['Bee C'],
      tunnels: [
        {
          tunnelId: 'T9',
          preference: 'Wood',
          tunnelDiameterInches: 0.5,
        },
      ],
    }

    render(<SiteDetailsPanel site={selectedSite} />)

    expect(screen.getByText('Selected Farm')).toBeInTheDocument()
    expect(screen.getByText('Bee C')).toBeInTheDocument()

    expect(
      screen.getByRole('row', { name: /T9/ })
    ).toBeInTheDocument()

    expect(
      screen.queryByText('Test Farm')
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Bee A, Bee B')
    ).not.toBeInTheDocument()
  })
})
