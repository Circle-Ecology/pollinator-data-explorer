
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
  occupancyRate: 0.4,
  firstSurveyDate: '2025-07-24',
  lastSurveyDate: '2026-07-24',
  surveyDateCount: 2,
}

describe('SiteDetailsPanel', () => {
  it('renders the site details in a table', () => {
    render(<SiteDetailsPanel site={site} />)

    expect(
      screen.getByRole('dialog', { name: 'Test Farm' })
    ).toBeInTheDocument()

    expect(screen.getByText('Test Farm')).toBeInTheDocument()

    expect(
      screen.getByRole('table', { name: 'Site information' })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('row', { name: /City/ })
    ).toHaveTextContent('Longmont')

    expect(
      screen.getByRole('row', { name: /State/ })
    ).toHaveTextContent('CO')

    expect(
      screen.getByRole('row', { name: /Elevation/ })
    ).toHaveTextContent('1520 meters')

    expect(
      screen.getByRole('row', { name: /Tunnel count/ })
    ).toHaveTextContent('10')

    expect(
      screen.getByRole('row', { name: /Occupancy rate/ })
    ).toHaveTextContent('40% (4 of 10)')

    expect(
      screen.getByRole('row', { name: /Survey dates/ })
    ).toHaveTextContent('July 24, 2025 - July 24, 2026')

    expect(
      screen.getByRole('row', { name: /Survey visits/ })
    ).toHaveTextContent('2')
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
      screen.queryByText('observer@circleecology.com')
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Private staff note')
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Private Observer')
    ).not.toBeInTheDocument()
  })

  it('displays the site activity duration from survey dates', () => {
    render(<SiteDetailsPanel site={site} />)

    expect(
      screen.getByRole('row', {
        name: /Site activity duration/,
      })
    ).toHaveTextContent('366 calendar days')
  })

  it('shows Not recorded when survey dates are missing', () => {
    const siteWithoutDates = {
      ...site,
      firstSurveyDate: null,
      lastSurveyDate: null,
    }

    render(<SiteDetailsPanel site={siteWithoutDates} />)

    expect(
      screen.getByRole('row', {
        name: /Site activity duration/,
      })
    ).toHaveTextContent('Not recorded')
  })

  // US-15: Verify public tunnel attributes.
  it('displays public tunnel details for multiple tunnels', () => {
    const siteWithTunnels = {
      ...site,
      tunnels: [
        {
          tunnelId: 'T1',
          direction: 'North',
          tunnelDiameterInches: 0.25,
          installationYear: 2024,
          substrateType: 'Wood',
          sunExposure: 'Full sun',
          coarseWoodyDebrisType: 'Log',
        },
        {
          tunnelId: 'T2',
          direction: 'South',
          tunnelDiameterInches: 0.375,
          installationYear: 2025,
          substrateType: 'Bamboo',
          sunExposure: 'Partial shade',
          coarseWoodyDebrisType: 'Branch',
        },
      ],
    }

    render(<SiteDetailsPanel site={siteWithTunnels} />)

    expect(
      screen.getByRole('region', { name: 'Tunnel details' })
    ).toBeInTheDocument()

    const tunnelOne = screen.getByRole('table', {
      name: 'Tunnel T1 information',
    })

    const tunnelTwo = screen.getByRole('table', {
      name: 'Tunnel T2 information',
    })

    expect(
      within(tunnelOne).getByRole('row', { name: /Direction/ })
    ).toHaveTextContent('North')

    expect(
      within(tunnelOne).getByRole('row', { name: /Diameter/ })
    ).toHaveTextContent('0.25')

    expect(
      within(tunnelOne).getByRole('row', { name: /Installation year/ })
    ).toHaveTextContent('2024')

    expect(
      within(tunnelOne).getByRole('row', { name: /Substrate type/ })
    ).toHaveTextContent('Wood')

    expect(
      within(tunnelOne).getByRole('row', { name: /Sun exposure/ })
    ).toHaveTextContent('Full sun')

    expect(
      within(tunnelOne).getByRole('row', {
        name: /Coarse woody debris type/,
      })
    ).toHaveTextContent('Log')

    expect(
      within(tunnelTwo).getByRole('row', { name: /Direction/ })
    ).toHaveTextContent('South')

    expect(
      within(tunnelTwo).getByRole('row', { name: /Diameter/ })
    ).toHaveTextContent('0.375')

    expect(
      within(tunnelTwo).getByRole('row', { name: /Substrate type/ })
    ).toHaveTextContent('Bamboo')

    expect(
      within(tunnelTwo).getByRole('row', { name: /Sun exposure/ })
    ).toHaveTextContent('Partial shade')
  })

  it('shows Not recorded for missing tunnel attributes', () => {
    const siteWithMissingTunnelData = {
      ...site,
      tunnels: [
        {
          tunnelId: 'T3',
          direction: null,
          tunnelDiameterInches: null,
          installationYear: null,
          substrateType: '',
          sunExposure: null,
          coarseWoodyDebrisType: null,
        },
      ],
    }

    render(<SiteDetailsPanel site={siteWithMissingTunnelData} />)

    const tunnelTable = screen.getByRole('table', {
      name: 'Tunnel T3 information',
    })

    expect(
      within(tunnelTable).getByRole('row', { name: /Direction/ })
    ).toHaveTextContent('Not recorded')

    expect(
      within(tunnelTable).getByRole('row', { name: /Diameter/ })
    ).toHaveTextContent('Not recorded')

    expect(
      within(tunnelTable).getByRole('row', { name: /Installation year/ })
    ).toHaveTextContent('Not recorded')

    expect(
      within(tunnelTable).getByRole('row', { name: /Substrate type/ })
    ).toHaveTextContent('Not recorded')

    expect(
      within(tunnelTable).getByRole('row', { name: /Sun exposure/ })
    ).toHaveTextContent('Not recorded')
  })

  it('does not display tunnel details when no tunnels exist', () => {
    render(<SiteDetailsPanel site={{ ...site, tunnels: [] }} />)

    expect(
      screen.queryByRole('region', { name: 'Tunnel details' })
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('table', { name: 'Site information' })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('row', { name: /Occupancy rate/ })
    ).toHaveTextContent('40% (4 of 10)')
  })
})
