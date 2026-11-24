import { describe, expect, it } from 'vitest'
import {
  getValueAxisProps,
  legendOrderBySeries,
  PERCENT_TICKS,
  tooltipOrderTopFirst,
} from '../../src/utils/stackedBarOptions'

describe('StackedBarChart options - US-30', () => {
  it('fixes the percentage axis at 0-100% even if shares add up to 100.1', () => {
    expect(getValueAxisProps(true)).toEqual({
      domain: [0, 100],
      allowDataOverflow: true,
      ticks: PERCENT_TICKS,
    })
    expect(PERCENT_TICKS).toEqual([0, 25, 50, 75, 100])
  })

  it('lets the count axis grow to fit the data', () => {
    expect(getValueAxisProps(false)).toEqual({
      domain: [0, 'auto'],
      allowDataOverflow: false,
      ticks: undefined,
    })
  })

  it('orders the legend by series (stack) order, not alphabetically', () => {
    const series = [{ key: 'Bee' }, { key: 'Wasp' }, { key: 'Unknown' }, { key: 'Other' }]
    const legendItems = ['Other', 'Bee', 'Unknown', 'Wasp'].map((dataKey) => ({ dataKey }))
    const sorter = legendOrderBySeries(series)

    const sorted = [...legendItems].sort((a, b) => sorter(a) - sorter(b))

    expect(sorted.map((item) => item.dataKey)).toEqual(['Bee', 'Wasp', 'Unknown', 'Other'])
  })

  // US-39: Georgia's 11/18 feedback. The tooltip reads like the bar: the top
  // segment first, the bottom one last (2023: Other 220, Wasp 18, Bee 30).
  it('lists tooltip items top of the stack first', () => {
    const series = [{ key: 'Bee' }, { key: 'Wasp' }, { key: 'Unknown' }, { key: 'Other' }]
    const tooltipItems = ['Bee', 'Wasp', 'Other'].map((dataKey) => ({ dataKey }))
    const sorter = tooltipOrderTopFirst(series)

    const sorted = [...tooltipItems].sort((a, b) => sorter(a) - sorter(b))

    expect(sorted.map((item) => item.dataKey)).toEqual(['Other', 'Wasp', 'Bee'])
  })
})
