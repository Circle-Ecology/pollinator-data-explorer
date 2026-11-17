
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import TypeGenusBarChart from '../../src/components/TypeGenusBarChart'
import HorizontalBarChart from '../../src/components/HorizontalBarChart'
import MultiGenusBarChart from '../../src/components/MultiGenusBarChart'

// US-32 chart configurations
const typeGenusChart = {
  id: 'occupants-by-type-genus',
  title: 'Occupants by Occupant Type and General ID',
}

const genusChart = {
  id: 'occupants-by-genus',
  title: 'Occupants by General ID',
}

const multiGenusChart = {
  id: 'multi-genus-cavities-by-site',
  title: 'Cavities Occupied by More Than One Genus, by Site',
}

// Mock Recharts so the chart components can be tested
// without needing actual browser measurements.
vi.mock('recharts', () => {
  const MockContainer = ({ children }) => <div>{children}</div>

  const MockBar = ({ dataKey }) => (
    <div data-testid={`bar-${dataKey}`} />
  )

  const MockYAxis = ({ dataKey }) => (
    <div data-testid={`y-axis-${dataKey}`} />
  )

  return {
    ResponsiveContainer: MockContainer,
    BarChart: MockContainer,
    Bar: MockBar,
    XAxis: () => null,
    YAxis: MockYAxis,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Cell: () => null,
    LabelList: () => null,
  }
})

afterEach(() => {
  cleanup()
})

describe('US-32: Genus Chart Components', () => {
  it('renders Chart 1: Occupants by Type and Genus', () => {
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

    const { container } = render(
      <TypeGenusBarChart
        chart={typeGenusChart}
        rows={rows}
        measure="count"
      />
    )

    expect(container.firstChild).toBeTruthy()
    expect(screen.getByTestId('bar-value')).toBeTruthy()
  })

  it('renders Chart 2: Occupants by General ID', () => {
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

    const { container } = render(
      <HorizontalBarChart
        chart={genusChart}
        rows={rows}
        measure="count"
      />
    )

    expect(container.firstChild).toBeTruthy()
    expect(screen.getByTestId('bar-value')).toBeTruthy()
  })

  it('renders Chart 3: Multi-genus Cavities by Site', () => {
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

    const { container } = render(
      <MultiGenusBarChart
        chart={multiGenusChart}
        rows={rows}
        measure="count"
      />
    )

    expect(container.firstChild).toBeTruthy()
    expect(screen.getByTestId('bar-value')).toBeTruthy()
  })

  it('supports percentage mode for Chart 1', () => {
    const rows = [
      {
        occupantType: 'Bee',
        category: 'Osmia',
        total: 3,
        percent: 75,
      },
    ]

    render(
      <TypeGenusBarChart
        chart={typeGenusChart}
        rows={rows}
        measure="percent"
      />
    )

    expect(screen.getByTestId('bar-value')).toBeTruthy()
  })

  it('supports percentage mode for Chart 2', () => {
    const rows = [
      {
        category: 'Megachile',
        total: 12,
        percent: 60,
      },
    ]

    render(
      <HorizontalBarChart
        chart={genusChart}
        rows={rows}
        measure="percent"
      />
    )

    expect(screen.getByTestId('bar-value')).toBeTruthy()
  })
})
