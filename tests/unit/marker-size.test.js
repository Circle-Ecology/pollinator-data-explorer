import { describe, expect, it } from 'vitest'
import {
  computeMarkerSizePx,
  computeMarkerRadiusMeters,
  MARKER_MIN_PX,
  MARKER_MAX_PX,
  MARKER_MIN_METERS,
  MARKER_MAX_METERS,
} from '../../src/utils/markerSize'

describe('computeMarkerSizePx', () => {
  it('returns the minimum size when there is nothing to scale against', () => {
    expect(computeMarkerSizePx(0, [])).toBe(MARKER_MIN_PX)
  })

  it('returns the midpoint when every site has the same count', () => {
    expect(computeMarkerSizePx(5, [5, 5, 5])).toBe((MARKER_MIN_PX + MARKER_MAX_PX) / 2)
  })

  it('returns the minimum size for the least active site and the max for the most active', () => {
    const counts = [0, 3, 8]
    expect(computeMarkerSizePx(0, counts)).toBe(MARKER_MIN_PX)
    expect(computeMarkerSizePx(8, counts)).toBe(MARKER_MAX_PX)
  })

  it('scales sub-linearly (by sqrt) so small counts are still visually distinct', () => {
    const counts = [0, 4, 16]
    const atQuarter = computeMarkerSizePx(4, counts)
    // sqrt-scaled: halfway between sqrt(min) and sqrt(max), not a linear 25%.
    expect(atQuarter).toBeCloseTo(MARKER_MIN_PX + 0.5 * (MARKER_MAX_PX - MARKER_MIN_PX), 5)
  })
})

describe('computeMarkerRadiusMeters', () => {
  it('returns the minimum radius when there is nothing to scale against', () => {
    expect(computeMarkerRadiusMeters(0, [])).toBe(MARKER_MIN_METERS)
  })

  it('returns the minimum and maximum meter radius at the extremes', () => {
    const counts = [1, 5, 9]
    expect(computeMarkerRadiusMeters(1, counts)).toBe(MARKER_MIN_METERS)
    expect(computeMarkerRadiusMeters(9, counts)).toBe(MARKER_MAX_METERS)
  })
})
