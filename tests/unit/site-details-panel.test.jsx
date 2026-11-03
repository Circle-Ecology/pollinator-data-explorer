
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
})
