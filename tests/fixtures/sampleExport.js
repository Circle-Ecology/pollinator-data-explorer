// Header row and one data row copied from combined_data_clean_v02.csv.
// Staff identity values are replaced with placeholders.
export const EXPORT_HEADERS = [
  'Unique ID', 'Observation Date', 'Observation Status', 'Emergence Year', 'Plug Depth',
  'Plug Composition', 'Plug Color', 'Occupant type', 'Plug confidence', 'Observer',
  'Last Name', 'First Name', 'Observer Email', 'Nester of family', 'General ID',
  'Whole or hole', 'Common Name', 'Notes', 'Manufactured Empty', 'Block # (site)',
  'Direction', 'Installation Year', 'Tunnel Diameter (inches)', 'Coarse Woody Debris Type',
  'Substrate Type', 'Row', 'Column', 'Property Name', 'City', 'State', 'Coordinates',
  'Elevation (meters)', 'Sun Exposure', 'Site',
]

export const SAMPLE_ROW = {
  'Unique ID': 'Longmont-CO-Boulder Creek Estates OS-1-N-2023-0.25-Log-Pine-C-2',
  'Observation Date': '07-24-2025',
  'Observation Status': 'Complete',
  'Emergence Year': 'NA',
  'Plug Depth': '1 inch',
  'Plug Composition': 'whole leaf pieces (overlapping)',
  'Plug Color': 'yellow',
  'Occupant type': 'Bee',
  'Plug confidence': 'Sure',
  Observer: 'observer-id',
  'Last Name': 'Staff',
  'First Name': 'Test',
  'Observer Email': 'staff@example.com',
  'Nester of family': 'Megachilidae',
  'General ID': 'Megachile (Eutricharaea)',
  'Whole or hole': 'Sealed',
  'Common Name': 'Leafcutting bee',
  Notes: 'NA',
  'Manufactured Empty': 'FALSE',
  'Block # (site)': '1',
  Direction: 'N',
  'Installation Year': '2023',
  'Tunnel Diameter (inches)': '0.25',
  'Coarse Woody Debris Type': 'Log',
  'Substrate Type': 'Pine',
  Row: 'C',
  Column: '2',
  'Property Name': 'Boulder Creek Estates OS',
  City: 'Longmont',
  State: 'CO',
  Coordinates: '40.15506, -105.0034',
  'Elevation (meters)': '1482',
  'Sun Exposure': 'partial sun',
  Site: 'NA',
}

export function makeRow(overrides = {}) {
  return { ...SAMPLE_ROW, ...overrides }
}

// Converts a row object into an array ordered by EXPORT_HEADERS (the shape validateExportFile takes).
export function toRowArray(row) {
  return EXPORT_HEADERS.map((header) => row[header])
}
