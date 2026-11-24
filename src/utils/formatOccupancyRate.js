export function formatOccupancyRate(occupied, total) {
  if (!total) {
    return 'Not recorded'
  }

  const percentage = Math.round((occupied / total) * 100)

  return `${percentage}% (${occupied} of ${total})`
}
// US-39: share of a site's holes found occupied, as a whole-number percent,
// or null when either figure is missing. Sites have different numbers of
// holes, so the map compares sites by this share rather than the total.
export function occupiedHolesPercent({ occupiedTunnelCount, tunnelCount }) {
  if (occupiedTunnelCount == null || !tunnelCount) return null
  return Math.round((occupiedTunnelCount / tunnelCount) * 100)
}
