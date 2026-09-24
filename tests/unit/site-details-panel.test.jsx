// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SiteDetailsPanel from '../../src/components/SiteDetailsPanel'

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
  it('renders the site details', () => {
    render(<SiteDetailsPanel site={site} />)

    expect(
      screen.getByRole('dialog', { name: 'Test Farm' })
    ).toBeInTheDocument()

    expect(screen.getByText('Test Farm')).toBeInTheDocument()
    expect(screen.getByText(/Longmont/)).toBeInTheDocument()
    expect(screen.getByText(/CO/)).toBeInTheDocument()
    expect(screen.getByText(/1520/)).toBeInTheDocument()

    expect(
      screen.getByText(/Tunnel count/).parentElement
    ).toHaveTextContent('Tunnel count: 10')

    expect(
      screen.getByText(/Occupancy rate/).parentElement
    ).toHaveTextContent('Occupancy rate: 40% (4 of 10)')

    expect(screen.getByText(/July 24, 2025/)).toBeInTheDocument()
    expect(screen.getByText(/July 24, 2026/)).toBeInTheDocument()

    expect(
      screen.getByText(/Survey visits/).parentElement
    ).toHaveTextContent('Survey visits: 2')
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
})