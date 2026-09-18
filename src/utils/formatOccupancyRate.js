export function formatOccupancyRate(occupied, total) {
  if (!total) {
    return 'Not recorded'
  }

  const percentage = Math.round((occupied / total) * 100)

  return `${percentage}% (${occupied} of ${total})`
}