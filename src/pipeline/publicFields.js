// The public site fields and their types, shared by the pipeline modules that
// write sites.json. Mirrors docs/data-contract.md. Output is always built from
// this allowlist; source records are never spread into public files.
export const SITE_FIELDS = {
  siteId: 'string', propertyName: 'string', city: 'string', state: 'string',
  latitude: 'number', longitude: 'number', elevationMeters: 'number',
}

export const PUBLIC_SITE_FIELDS = Object.keys(SITE_FIELDS)
