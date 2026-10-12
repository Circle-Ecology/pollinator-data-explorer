# CSV Export Schema

This document defines the Circle Ecology CSV export that the Pollinator Data Explorer validates (US-07, #12).
It was written against the real export `combined_data_clean_v02.csv` and its re-saved copy `combined_data_clean_v02-2.csv`: 42,420 rows, 34 columns, 2,973 distinct tunnels.

The constants in `src/validation/csvSchema.js` must match this document.

## File rules

| Rule | Value |
| --- | --- |
| Row grain | One tunnel on one survey date (see [Data Contract](data-contract.md#export-grain)) |
| Natural key | `Unique ID` + `Observation Date` |
| Null sentinel | The literal string `NA` is an absent value, not text. Blank cells are also absent. |
| Date format | `MM-DD-YYYY` (`07-24-2025`, v02) or `M/D/YYYY` (`7/24/2025`, v02-2). Any other format is `INVALID_DATE`. |
| Header matching | Case-insensitive, surrounding whitespace ignored |
| Header aliases | `Type` → `Coarse Woody Debris Type` (v01 name), recorded as a `RENAMED_HEADER` warning |
| Unknown headers | Ignored, recorded as an `UNKNOWN_HEADER` warning |
| Unsurveyed rows | `Observation Date` and `Observation Status` both `NA`: `UNSURVEYED_ROW` warning, excluded from survey records, does not fail the import |

## Columns

**Required** headers must be present (else `MISSING_HEADER`) and non-empty on surveyed rows (else `REQUIRED_FIELD_MISSING`).
**Staff-only** columns are ingested but must never be published.

| # | Header | Status | Type | Allowed values | Example | Data Contract field |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `Unique ID` | Required | string | | `Longmont-CO-Boulder Creek Estates OS-1-N-2023-0.25-Log-Pine-C-2` | `tunnelId` |
| 2 | `Observation Date` | Required | date | `MM-DD-YYYY` or `M/D/YYYY`, not in the future | `07-24-2025` | `surveyDate` |
| 3 | `Observation Status` | Required | enum | `Empty`, `Complete`, `Active`, `Reopened`, `Retired hole` | `Complete` | `observationStatus` |
| 4 | `Emergence Year` | Optional | number | | `2025` | `emergenceYear` |
| 5 | `Plug Depth` | Optional | text | Seen: `1 inch`, `1.1 inches`, `1/2 inch`, `1/16 inch`, `flush`, `protruding` | `1 inch` | `plugDepth` |
| 6 | `Plug Composition` | Optional | text | | `whole leaf pieces (overlapping)` | `plugComposition` |
| 7 | `Plug Color` | Optional | text | | `yellow` | `plugColor` |
| 8 | `Occupant type` | Optional | enum | `Bee`, `Wasp`, `Other`, `Spider`, `Unknown`, `Ant(s)`, `Pill Bug` | `Bee` | `occupantType` |
| 9 | `Plug confidence` | Optional | enum | `Sure`, `Pretty sure`, `Unsure` | `Sure` | `plugConfidence` |
| 10 | `Observer` | Staff-only | string (UUID) | | `2bf7e3e6-…` | `observerId` |
| 11 | `Last Name` | Staff-only | string | | *(staff name)* | `observerLastName` |
| 12 | `First Name` | Staff-only | string | | *(staff name)* | `observerFirstName` |
| 13 | `Observer Email` | Staff-only | string | | *(staff email)* | `observerEmail` |
| 14 | `Nester of family` | Optional | text | | `Megachilidae` | `nesterFamily` |
| 15 | `General ID` | Optional | text | | `Megachile (Eutricharaea)` | `generalId` |
| 16 | `Whole or hole` | Optional | enum | `Empty`, `Sealed`, `Not Sealed`, `Emergence`, `Parasitism` | `Sealed` | `wholeOrHole` |
| 17 | `Common Name` | Optional | text | | `Leafcutting bee` | `commonName` |
| 18 | `Notes` | Optional | text | | `NA` | `notes` (staff-only per Data Contract) |
| 19 | `Manufactured Empty` | Optional | boolean | Seen: `TRUE`, `FALSE` (not enforced) | `FALSE` | `manufacturedEmpty` |
| 20 | `Block # (site)` | Required | string | | `1` | `blockNumber` |
| 21 | `Direction` | Required | enum | `N`, `NE`, `E`, `SE`, `S`, `SW`, `NW` | `N` | `direction` |
| 22 | `Installation Year` | Required | number | | `2023` | `installationYear` |
| 23 | `Tunnel Diameter (inches)` | Required | enum (number) | `0.125`, `0.25`, `0.375` | `0.25` | `tunnelDiameterInches` |
| 24 | `Coarse Woody Debris Type` | Required | enum | `Log`, `Snag` | `Log` | `coarseWoodyDebrisType` |
| 25 | `Substrate Type` | Required | enum | `Cottonwood`, `Pine` | `Pine` | `substrateType` |
| 26 | `Row` | Optional | string | | `C` | `gridRow` |
| 27 | `Column` | Optional | string | | `2` | `gridColumn` |
| 28 | `Property Name` | Required | string | | `Boulder Creek Estates OS` | `propertyName` |
| 29 | `City` | Required | string | | `Longmont` | `city` |
| 30 | `State` | Required | string | | `CO` | `state` |
| 31 | `Coordinates` | Required | `"lat, lon"` text | Two comma-separated decimals; latitude `-90..90`, longitude `-180..180` | `40.15506, -105.0034` | split into `latitude` + `longitude` |
| 32 | `Elevation (meters)` | Optional | number | | `1482` | `elevationMeters` |
| 33 | `Sun Exposure` | Required | enum | `full sun`, `partial sun` | `partial sun` | `sunExposure` |
| 34 | `Site` | Optional | string (UUID) | | `NA` | `siteId` (to be confirmed by the team) |

### Notes on individual columns

- **`Plug Depth`** is listed as a number in the Data Contract, but the export stores text with units (`1 inch`, `flush`, `protruding`). It is not checked for `INVALID_NUMBER`. Converting it to a number is out of scope for US-07.
- **`Coordinates`** are per site, not per row: the export has only 7 distinct values. In v02, every `Rogers Grove OS` row carries the corrupted value `40.15140.16231, -105.123483, -105.0403`. That gives `MALFORMED_COORDINATES`, and the site is listed in `sitesFlaggedForReview`. v02-2 has the corrected value `40.16231, -105.1234`.
- **Enum values** are the values observed in production data. An unseen value is reported as `UNEXPECTED_ENUM_VALUE` naming the column and value. The value is kept, not discarded.

## Error codes

Every error and warning has the `ValidationError` shape `{ rowNumber, column, code, message }`. `rowNumber` is 1-based and counts the header row (header = 1, first data row = 2). It is `null` for file-level errors.

| Code | Level | When |
| --- | --- | --- |
| `EMPTY_FILE` | error | The file has no rows |
| `NO_DATA_ROWS` | error | The file has a header row only |
| `MISSING_HEADER` | error | A required header is absent; no rows are processed |
| `RENAMED_HEADER` | warning | A known alias was accepted |
| `UNKNOWN_HEADER` | warning | An unrecognized header was ignored |
| `REQUIRED_FIELD_MISSING` | error | A required field is `NA` or blank on a surveyed row |
| `INVALID_DATE` | error | `Observation Date` is not a real date in an accepted format |
| `FUTURE_DATE` | error | `Observation Date` is after the import date |
| `MALFORMED_COORDINATES` | error | `Coordinates` is not exactly two comma-separated decimals |
| `OUT_OF_RANGE` | error | Latitude or longitude is out of range (`column: "Coordinates"`, message names which) |
| `INVALID_NUMBER` | error | `Installation Year`, `Tunnel Diameter (inches)`, `Emergence Year`, or `Elevation (meters)` is not numeric |
| `UNEXPECTED_ENUM_VALUE` | error | A value is not in the column's allowed list |
| `DUPLICATE_TUNNEL_DATE` | error | A later row repeats an earlier row's `Unique ID` + `Observation Date` (unsurveyed `NA`-date rows included) |
| `UNSURVEYED_ROW` | warning | Both `Observation Date` and `Observation Status` are `NA` |

## Expected results on the production export

| Measure | v02 | v02-2 |
| --- | --- | --- |
| Data rows | 42,420 | 42,420 |
| Distinct tunnels | 2,973 | 2,973 |
| Unsurveyed rows | 1,722 | 1,722 |
| `DUPLICATE_TUNNEL_DATE` | 263 (83 surveyed + 180 unsurveyed) | 263 |
| `MALFORMED_COORDINATES` | 7,013 (Rogers Grove OS; its 451 unsurveyed rows skip row checks) | 0 |
| Any other error | 0 | 0 |

These counts are checked by `tests/regression/production-export.test.js`. To run it, convert the export to JSON first (the output is gitignored because it contains staff data):

```bash
npm run export:json -- path/to/combined_data_clean_v02-2.csv tests/fixtures/production-export.json
```
