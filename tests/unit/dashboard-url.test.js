import { describe, expect, it } from 'vitest'
import { dashboardConfig } from '../../src/content/dashboardConfig'
import {
  readDashboardParams,
  resolveSelection,
  writeDashboardParams,
} from '../../src/utils/dashboardSelection'
import { dashboardData } from '../fixtures/dashboardData'

describe('dashboard URL state - US-29', () => {
  it('restores a selection from the query string', () => {
    const requested = readDashboardParams(
      '?tab=occupancy&chart=occupancy-by-site&year=2025&measure=percent'
    )

    expect(resolveSelection(dashboardConfig, requested, dashboardData)).toEqual({
      tab: 'occupancy',
      chart: 'occupancy-by-site',
      year: 2025,
      measure: 'percent',
    })
  })

  it('falls back to the first tab, first chart and default measure', () => {
    const requested = readDashboardParams('?tab=nope&chart=nope&measure=nope')

    expect(resolveSelection(dashboardConfig, requested, dashboardData)).toEqual({
      tab: 'occupancy',
      chart: 'occupancy-by-year',
      year: null,
      measure: 'count',
    })
  })

  it('uses the latest year when the requested year has no data', () => {
    const requested = readDashboardParams(
      '?chart=occupancy-by-site&year=2024'
    )

    expect(
      resolveSelection(dashboardConfig, requested, dashboardData).year
    ).toBe(2026)
  })

  it('writes dashboard params and keeps unrelated ones', () => {
    const query = writeDashboardParams('?embed=1', {
      tab: 'occupancy',
      chart: 'occupancy-by-year',
      year: null,
      measure: 'count',
    })

    expect(query).toBe('?embed=1&tab=occupancy&chart=occupancy-by-year&measure=count')
  })
})
