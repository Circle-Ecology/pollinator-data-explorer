export const MARKER_MIN_PX = 14
export const MARKER_MAX_PX = 40
export const MARKER_MIN_METERS = 60
export const MARKER_MAX_METERS = 160

function scale(count, allCounts, min, max) {
  const minCount = Math.min(...allCounts)
  const maxCount = Math.max(...allCounts)
  if (maxCount === minCount) {
    return (min + max) / 2
  }
  const t = (Math.sqrt(count) - Math.sqrt(minCount)) / (Math.sqrt(maxCount) - Math.sqrt(minCount))
  return min + t * (max - min)
}

// Pixel radius, used when zoomed out - a fixed on-screen size stays visible
// regardless of how small the real-world circle would project to.
export function computeMarkerSizePx(occupiedTunnelCount, allCounts) {
  if (!allCounts || allCounts.length === 0) {
    return MARKER_MIN_PX
  }
  return scale(occupiedTunnelCount, allCounts, MARKER_MIN_PX, MARKER_MAX_PX)
}

// Meter radius, used when zoomed in - true-to-scale sizing reads better once
// the map is close enough that a meter-accurate circle isn't near-invisible.
export function computeMarkerRadiusMeters(occupiedTunnelCount, allCounts) {
  if (!allCounts || allCounts.length === 0) {
    return MARKER_MIN_METERS
  }
  return scale(occupiedTunnelCount, allCounts, MARKER_MIN_METERS, MARKER_MAX_METERS)
}
