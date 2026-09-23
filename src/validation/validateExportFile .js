// US-07 (#12) — CSV export schema constants.
// Header strings match the Circle Ecology export exactly.
// Field names on the right match docs/data-contract.md exactly.

export const NULL_SENTINEL = 'NA'
export const EXPORT_DATE_FORMAT = 'MM-DD-YYYY'

export const REQUIRED_HEADERS = [
  'Unique ID',
  'Observation Date',
  'Observation Status',
  'Property Name',
  'City',
  'State',
  'Coordinates',
  'Block # (site)',
  'Direction',
  'Installation Year',
  'Tunnel Diameter (inches)',
  'Substrate Type',
  'Coarse Woody Debris Type',
  'Sun Exposure',
]

export const OPTIONAL_HEADERS = [
  'Emergence Year',
  'Plug Depth',
  'Plug Composition',
  'Plug Color',
  'Occupant type',
  'Plug confidence',
  'Nester of family',
  'General ID',
  'Whole or hole',
  'Common Name',
  'Notes',
  'Manufactured Empty',
  'Row',
  'Column',
  'Elevation (meters)',
  'Site',
]

// Ingested but never published (Data Contract: Staff-Only Fields).
export const STAFF_ONLY_HEADERS = [
  'Observer',
  'Observer Email',
  'First Name',
  'Last Name',
]

export const ALL_KNOWN_HEADERS = [
  ...REQUIRED_HEADERS,
  ...OPTIONAL_HEADERS,
  ...STAFF_ONLY_HEADERS,
]

// Old export header -> current export header.
export const HEADER_ALIASES = {
  Type: 'Coarse Woody Debris Type',
}

// Export header -> Data Contract field name.
export const HEADER_TO_FIELD = {
  'Unique ID': 'tunnelId',
  'Observation Date': 'surveyDate',
  'Observation Status': 'observationStatus',
  'Property Name': 'propertyName',
  City: 'city',
  State: 'state',
  Coordinates: null, // split into latitude + longitude by parseCoordinatePair (US-08)
  'Block # (site)': 'blockNumber',
  Direction: 'direction',
  'Installation Year': 'installationYear',
  'Tunnel Diameter (inches)': 'tunnelDiameterInches',
  'Substrate Type': 'substrateType',
  'Coarse Woody Debris Type': 'coarseWoodyDebrisType',
  'Sun Exposure': 'sunExposure',
  'Emergence Year': 'emergenceYear',
  'Plug Depth': 'plugDepth',
  'Plug Composition': 'plugComposition',
  'Plug Color': 'plugColor',
  'Occupant type': 'occupantType',
  'Plug confidence': 'plugConfidence',
  'Nester of family': 'nesterFamily',
  'General ID': 'generalId',
  'Whole or hole': 'wholeOrHole',
  'Common Name': 'commonName',
  Notes: 'notes',
  'Manufactured Empty': 'manufacturedEmpty',
  Row: 'gridRow',
  Column: 'gridColumn',
  'Elevation (meters)': 'elevationMeters',
  Site: 'siteId', // TODO(team): confirm "Site" maps to siteId
  Observer: 'observerId',
  'Observer Email': 'observerEmail',
  'First Name': 'observerFirstName',
  'Last Name': 'observerLastName',
}

// Allowed values observed in production data (keyed by export header).
export const ALLOWED_VALUES = {
  'Observation Status': ['Empty', 'Complete', 'Active', 'Reopened', 'Retired hole'],
  'Occupant type': ['Bee', 'Wasp', 'Other', 'Spider', 'Unknown', 'Ant(s)', 'Pill Bug'],
  'Plug confidence': ['Sure', 'Pretty sure', 'Unsure'],
  'Whole or hole': ['Empty', 'Sealed', 'Not Sealed', 'Emergence', 'Parasitism'],
  'Substrate Type': ['Cottonwood', 'Pine'],
  'Coarse Woody Debris Type': ['Log', 'Snag'],
  'Sun Exposure': ['full sun', 'partial sun'],
  'Tunnel Diameter (inches)': ['0.125', '0.25', '0.375'],
  Direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'NW'],
}

// Numeric columns checked for INVALID_NUMBER.
export const NUMERIC_HEADERS = [
  'Installation Year',
  'Tunnel Diameter (inches)',
  'Emergence Year',
  'Plug Depth',
  'Elevation (meters)',
]

export const LATITUDE_RANGE = { min: -90, max: 90 }
export const LONGITUDE_RANGE = { min: -180, max: 180 }
