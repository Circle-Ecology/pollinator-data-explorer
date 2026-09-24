// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OccupancyByYearChart from '../../src/components/OccupancyByYearChart'

describe('OccupancyByYearChart', () => {
  it('shows only years that have survey data', () => {
    const yearlyData = [
      { year: 2023, occupied: 4, total: 10 },
      { year: 2025, occupied: 6, total: 10 },
      { year: 2026, occupied: 8, total: 10 },
    ]

    render(<OccupancyByYearChart yearlyData={yearlyData} />)

    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()

    expect(screen.queryByText('2024')).not.toBeInTheDocument()
  })
})