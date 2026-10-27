export const DEFAULT_CENTER = { latitude: 40.1672, longitude: -105.1019 }
export const DEFAULT_ZOOM = 12
const BOUNDS_PADDING_PX = [40, 40]

export function computeMapBounds(sites) {
  if (!sites || sites.length === 0) {
    return null
  }

  if (sites.length === 1) {
    const [site] = sites
    return { center: [site.latitude, site.longitude], zoom: DEFAULT_ZOOM }
  }

  const latitudes = sites.map((site) => site.latitude)
  const longitudes = sites.map((site) => site.longitude)

  return {
    bounds: [
      [Math.min(...latitudes), Math.min(...longitudes)],
      [Math.max(...latitudes), Math.max(...longitudes)],
    ],
    boundsOptions: { padding: BOUNDS_PADDING_PX },
  }
}
