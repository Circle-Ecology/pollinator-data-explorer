# Data Contract

This document defines the shared data types, field names, data types, public visibility, and data rules used by the Pollinator Data Explorer project.

## Site

The `Site` type stores information about each site.

| Field Name | Type | Public | Description |
| --- | --- | --- | --- |
| `siteId` | string | Yes | Unique ID for the site |
| `propertyName` | string | Yes | Name of the property |
| `city` | string | Yes | City where the site is located |
| `state` | string | Yes | State where the site is located |
| `latitude` | number | Yes | Latitude of the site |
| `longitude` | number | Yes | Longitude of the site |
| `elevationMeters` | number | Yes | Elevation of the site in meters |
| `isPublic` | boolean | Yes | Indicates whether the site can be shown publicly |

## Tunnel

The `Tunnel` type stores information about each nesting tunnel.

| Field Name | Type | Public | Description |
| --- | --- | --- | --- |
| `tunnelId` | string | Yes | Unique ID for the tunnel |
| `siteId` | string | Yes | ID of the site the tunnel belongs to |
| `blockNumber` | string | Yes | Block number |
| `direction` | string | Yes | Direction of the tunnel |
| `installationYear` | number | Yes | Year the tunnel was installed |
| `tunnelDiameterInches` | number | Yes | Diameter of the tunnel in inches |
| `coarseWoodyDebrisType` | string | Yes | Type of coarse woody debris |
| `substrateType` | string | Yes | Type of substrate |
| `sunExposure` | string | Yes | Amount of sun exposure |
| `gridRow` | string | Yes | Grid row |
| `gridColumn` | string | Yes | Grid column |

## TunnelSurvey

The `TunnelSurvey` type stores information collected during a tunnel survey.

| Field Name | Type | Public | Description |
| --- | --- | --- | --- |
| `tunnelId` | string | Yes | ID of the tunnel being surveyed |
| `surveyDate` | date | Yes | Date the survey was completed |
| `observationStatus` | string | Yes | Status of the observation |
| `occupantType` | string | Yes | Type of occupant found |
| `nesterFamily` | string | Yes | Family of the nesting species |
| `generalId` | string | Yes | General identification |
| `commonName` | string | Yes | Common name of the species |
| `plugDepth` | number | Yes | Depth of the tunnel plug |
| `plugComposition` | string | Yes | Material or composition of the plug |
| `plugColor` | string | Yes | Color of the plug |
| `plugConfidence` | string | Yes | Confidence in the plug identification |
| `wholeOrHole` | string | Yes | Indicates whole or hole condition |
| `emergenceYear` | number | Yes | Year of emergence |
| `manufacturedEmpty` | boolean | Yes | Indicates whether a manufactured tunnel is empty |
| `notes` | string | No | Survey notes; staff-only |
| `importBatchId` | string | No | ID of the import batch |
| `recordStatus` | string | Yes | Status of the record |

## Data Rules

### Export Grain

Each row represents one tunnel for one survey date.

A row does **not** represent a single observation.

## Natural Key

The natural key is:

`tunnelId + surveyDate`

`tunnelId` by itself is **not unique** because the same tunnel can be surveyed on different dates.

## Record Status

The allowed values for `recordStatus` are:

- `pending`
- `approved`
- `rejected`

## Staff-Only Fields

The following fields contain staff information and must **never be publicly exposed**:

- `observerId`
- `observerEmail`
- `observerFirstName`
- `observerLastName`
- `notes`

## PublicSiteSummary

The `PublicSiteSummary` type represents site information that is safe to display publicly.

It must not contain staff-only information.

| Field Name | Type | Public | Description |
| --- | --- | --- | --- |
| `siteId` | string | Yes | Unique ID for the site |
| `propertyName` | string | Yes | Name of the property |
| `city` | string | Yes | City where the site is located |
| `state` | string | Yes | State where the site is located |
| `latitude` | number | Yes | Latitude of the site |
| `longitude` | number | Yes | Longitude of the site |
| `elevationMeters` | number | Yes | Elevation of the site in meters |

The following staff-only fields must never appear in `PublicSiteSummary`:

- `observerId`
- `observerEmail`
- `observerFirstName`
- `observerLastName`
- `notes`

## ImportBatch

The `ImportBatch` type represents one batch of imported data.

The exact fields for this type must match the agreed import process and repository documentation.

## ImportValidationResult

The `ImportValidationResult` type represents the result of validating imported data.

It indicates whether the imported data passed validation and identifies any validation errors that were found.

## ValidationError

The `ValidationError` type represents a problem found while validating imported data.

A validation error should provide enough information to identify what data is invalid and why it failed validation.
