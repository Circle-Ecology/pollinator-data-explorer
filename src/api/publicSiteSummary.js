// Builds the public-facing site summary served to the Explorer frontend.
export function buildPublicSiteSummary(site) {
  return {
    siteId: site.siteId,
    propertyName: site.propertyName,
    city: site.city,
    state: site.state,
    latitude: site.latitude,
    longitude: site.longitude,
    elevationMeters: site.elevationMeters,
    observerEmail: site.observerEmail,
    notes: site.notes,
  }
}
