// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ChartView from '../../src/components/ChartView'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import { dashboardData } from '../fixtures/dashboardData'

// Capture what ChartView hands the chart: the legend is built from these
// series, so this is what decides which types the legend shows and in what
// order.
const { chartProps } = vi.hoisted(() => ({ chartProps: [] }))

vi.mock('../../src/components/StackedBarChart', () => ({
  default: (props) => {
    chartProps.push(props)
    return null
  },
}))

const occupantCharts = dashboardConfig.find((tab) => tab.id === 'occupants').charts
const chart = (id) => occupantCharts.find((c) => c.id === id)

function renderChart(id, year, measure = 'count') {
  render(
    <ChartView
      chart={chart(id)}
      data={dashboardData}
      year={year}
      measure={measure}
      onChangeYear={() => {}}
      onChangeMeasure={() => {}}
    />
  )
  return chartProps.at(-1)
}

beforeEach(() => {
  chartProps.length = 0
})

afterEach(cleanup)

describe('ChartView legend series - US-30', () => {
  it('leaves Unknown out of the 2025 legend', () => {
    const { chart: passed } = renderChart('occupants-by-site-type', 2025)

    expect(passed.series.map((s) => s.key)).toEqual(['Bee', 'Wasp', 'Other'])
  })

  it('includes Unknown in the 2026 legend, in stack order', () => {
    const { chart: passed } = renderChart('occupants-by-site-type', 2026)

    expect(passed.series.map((s) => s.key)).toEqual([
      'Bee',
      'Wasp',
      'Unknown',
      'Other',
    ])
  })

  it('passes the selected measure through to the chart', () => {
    expect(renderChart('occupants-by-site-type', 2026, 'percent').measure).toBe(
      'percent'
    )
  })
})
