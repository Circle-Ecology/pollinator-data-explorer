
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react'
import GenusChartDataTable from '../../src/components/GenusChartDataTable'

// Remove rendered components after each test
afterEach(() => {
  cleanup()
})

describe('US-32: Genus Chart Data Table', () => {
  it('displays occupant type, genus, count, and percentage for Chart 1', () => {
    const chart = {
      id: 'occupants-by-type-genus',
      title: 'Occupants by Occupant Type and General ID',
    }

    const rows = [
      {
        occupantType: 'Bee',
        category: 'Osmia',
        total: 3,
        percent: 75,
      },
      {
        occupantType: 'Bee',
        category: 'Bombus',
        total: 1,
        percent: 25,
      },
    ]

    render(<GenusChartDataTable chart={chart} rows={rows} />)

    const table = screen.getByRole('table', { hidden: true })

    expect(within(table).getByText('Occupant Type')).toBeTruthy()
    expect(within(table).getByText('General ID')).toBeTruthy()
    expect(within(table).getByText('Count')).toBeTruthy()
    expect(within(table).getByText('Percentage')).toBeTruthy()
    expect(within(table).getByText('Osmia')).toBeTruthy()
    expect(within(table).getByText('75%')).toBeTruthy()
    expect(within(table).getByText('Bombus')).toBeTruthy()
    expect(within(table).getByText('25%')).toBeTruthy()
  })

  it('displays genus, count, and percentage for Chart 2', () => {
    const chart = {
      id: 'occupants-by-genus',
      title: 'Occupants by General ID',
    }

    const rows = [
      {
        category: 'Megachile',
        total: 12,
        percent: 60,
      },
      {
        category: 'Unknown genus',
        total: 8,
        percent: 40,
      },
    ]

    render(<GenusChartDataTable chart={chart} rows={rows} />)

    const table = screen.getByRole('table', { hidden: true })

    expect(within(table).getByText('General ID')).toBeTruthy()
    expect(within(table).getByText('Count')).toBeTruthy()
    expect(within(table).getByText('Percentage')).toBeTruthy()
    expect(within(table).getByText('Megachile')).toBeTruthy()
    expect(within(table).getByText('Unknown genus')).toBeTruthy()
    expect(within(table).getByText('60%')).toBeTruthy()
    expect(within(table).getByText('40%')).toBeTruthy()
  })

  it('displays site names and multi-genus cavity counts for Chart 3', () => {
    const chart = {
      id: 'multi-genus-cavities-by-site',
      title: 'Cavities Occupied by More Than One Genus, by Site',
    }

    const rows = [
      {
        category: 'Sandstone Ranch',
        total: 3,
      },
      {
        category: 'Another Site',
        total: 0,
      },
    ]

    render(<GenusChartDataTable chart={chart} rows={rows} />)

    const table = screen.getByRole('table', { hidden: true })

    expect(within(table).getByText('Site')).toBeTruthy()
    expect(within(table).getByText('Multi-genus Cavities')).toBeTruthy()
    expect(within(table).getByText('Sandstone Ranch')).toBeTruthy()
    expect(within(table).getByText('Another Site')).toBeTruthy()
    expect(within(table).getByText('3')).toBeTruthy()
    expect(within(table).getByText('0')).toBeTruthy()
  })
})
