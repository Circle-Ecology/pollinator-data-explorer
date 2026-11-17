
function percentage(count, total) {
  return total > 0
    ? Math.round((count / total) * 1000) / 10
    : 0
}

function genusName(generalId) {
  if (
    generalId == null ||
    String(generalId).trim() === '' ||
    String(generalId).trim().toLowerCase() === 'unknown'
  ) {
    return 'Unknown genus'
  }

  return String(generalId)
}

// Chart 2: Occupants by General ID
export function buildGenusRows(data) {
  const totalOccupants = data.reduce(
    (sum, row) => sum + (Number(row.total) || 0),
    0,
  )

  return data
    .map((row) => {
      const total = Number(row.total) || 0

      return {
        category: genusName(row.generalId),
        total,
        percent: percentage(total, totalOccupants),
      }
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.category.localeCompare(b.category),
    )
}

// Chart 1: Occupants by Occupant Type and General ID
export function buildTypeGenusRows(data) {
  return data.map((row) => {
    const occupants = Number(row.occupants) || 0
    const typeTotal = Number(row.typeTotal) || 0

    return {
      occupantType: row.occupantType,
      category: genusName(row.generalId),
      total: occupants,
      percent: percentage(occupants, typeTotal),
    }
  })
}

// Chart 3: Cavities Occupied by More Than One Genus, by Site
export function buildMultiGenusRows(data) {
  return data.map((row) => ({
    category: row.propertyName || row.siteId || 'Unknown site',
    total: Number(row.multiGenus) || 0,
  }))
}
