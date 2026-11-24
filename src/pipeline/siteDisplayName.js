// US-39 (#87): the public name of a site is its property name plus its
// Circle Ecology site number, e.g. "Sherwood OS (Site 5)", so that two sites
// on one property stay distinguishable on the map and in every chart. Some
// property names in the sheet already carry it ("Boulder Creek Estates OS
// (Site 1)"); those are left as they are. `siteId` keeps the sheet's name.
export function siteDisplayName(propertyName, siteNumber) {
  if (siteNumber === null || siteNumber === undefined || String(siteNumber).trim() === '') {
    return propertyName
  }
  if (/\(Site \d+\)\s*$/.test(propertyName)) return propertyName
  return `${propertyName} (Site ${String(siteNumber).trim()})`
}

// Site number per siteId, from the tunnels' "Block # (site)" column. The first
// tunnel with a number wins.
export function siteNumbersBySiteId(tunnels) {
  const numbers = new Map()
  for (const { siteId, blockNumber } of tunnels) {
    if (siteId != null && blockNumber != null && !numbers.has(siteId)) {
      numbers.set(siteId, String(blockNumber))
    }
  }
  return numbers
}
