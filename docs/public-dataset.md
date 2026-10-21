# US-24 public dataset generation

`generatePublicDataset(parsedResult)` in `src/pipeline/generatePublicDataset.js`
consumes normalized US-08 data, without parsing CSV, accessing the network, writing
files, or changing its input. It returns exactly `{ sites, observations, status }`.

## Input and internal status

Pass the existing `ImportValidationResult`: `sites`, `tunnels`, `surveys`, `errors`
arrays and nonnegative integer `totalRows` and `invalidRows`, alongside its existing
batch/count/warning fields. Missing or malformed structure throws a generic error.

Row-level problems elsewhere in the batch (a malformed coordinate, a duplicate
survey, one bad site) do not refuse the whole publish - US-08 has already excluded
those rows from `sites`/`tunnels`/`surveys`, so their presence in `errors`/
`invalidRows` is informational, surfaced via `dataset-status.json`'s
`excludedRowCount` (below), not grounds to withhold everything else. Resolved this
way for #45, after running the real Circle Ecology sheet through this pipeline and
finding it has ~17% malformed-coordinate rows (one site's corrupted `Coordinates`
column) as a routine, ongoing feature of field data entry - requiring perfectly
clean data forever was never realistic. An empty import (`totalRows === 0`) simply
projects to empty output rather than throwing; the scheduler handoff (below) still
declines to act on an empty parse, to avoid an anomalous fetch wiping a live
dataset. This is a normalized-input precondition, not full CSV validation. US-07
validation is still not connected to the scheduled US-08 parser.

Issue #32 specifies `status: ImportValidationResult`, while also requiring a
different five-field metadata file. To preserve both explicit contracts, returned
`status` references the original **internal** import result. It is not a public
payload and must never be serialized. The writer constructs metadata separately.
The team should confirm this interpretation before production integration.

## Authorization, relationships and public shapes

For surveys, filtering is ordered: exact `recordStatus === 'approved'`, resolve
`survey.tunnelId → tunnel.siteId → site.siteId`, require `site.isPublic === true`,
then project public fields. Unresolved parents are excluded. No identifier parsing
or implicit approval occurs. Missing, null, differently cased and unknown statuses
are excluded; truthy visibility values such as `'true'` do not authorize a site.

Sites are those explicitly authorized with `isPublic === true`, including sites
without approved surveys. This is a documented implementation choice, not a
confirmed stakeholder decision. Site/tunnel arrays must have unique identifiers
as guaranteed by normalization: duplicate identities are refused rather than
selecting a potentially conflicting authorization. Identical approved surveys
collapse by `(tunnelId, surveyDate)`; conflicting public values throw. Upstream
reported conflicts cause refusal before projection. Distinct survey dates remain.

Public objects follow the existing [data contract](data-contract.md):

- `sites.json`: an array with exactly `siteId`, `propertyName`, `city`, `state`,
  `latitude`, `longitude`, `elevationMeters`.
- `observations.json`: an array with exactly `siteId`, `tunnelId`, `surveyDate`,
  `observationStatus`, `occupantType`, `nesterFamily`, `generalId`, `commonName`,
  `plugDepth`, `plugComposition`, `plugColor`, `plugConfidence`, `wholeOrHole`,
  `emergenceYear`, `manufacturedEmpty`, `recordStatus`. `siteId` is the resolved
  `tunnelId → tunnel.siteId` join, added so a consumer can relate the two public
  files without a third mapping file (see US-14, #19).
- `dataset-status.json`: `{ generatedAt, sourceRowCount, siteCount, tunnelCount,
  excludedRowCount, status: 'published' }`. `excludedRowCount` (added for #45) is
  `parsedResult.invalidRows` - how many source rows US-08 excluded this run - so a
  row-level problem is visible to whoever is watching, rather than silently
  swallowed now that it no longer blocks the publish.

Only these fields are constructed; no source object spreads are used for public
projection. Observer identity fields, notes, import IDs, errors, warnings and
unexpected metadata never enter files. Optional absent scalars become null.
Eligible fields containing objects, arrays, wrong scalar types or nonfinite
numbers cause a generic error, preventing nested private data leakage. Identifiers
must be nonempty normalized strings; dates must be real `YYYY-MM-DD` calendar
dates. Public sites require a nonblank property name and valid numeric coordinates.
This checks the public boundary; it does not reimplement CSV enum/business rules.

Arrays are sorted by code-unit `siteId`, and by `tunnelId` then `surveyDate`.
The generator has no timestamp, so record projection is deterministic.

## Writer and count semantics

`writePublicDataset(parsedResult, { outputDirectory, now })` projects normalized
input itself, serializes compact JSON, and writes the three filenames above.
`outputDirectory` defaults to the repository's `data` directory; tests can use an
isolated directory. `now` defaults to `() => new Date()` and may be injected for
tests. It must return a valid Date. The writer returns only public metadata.

- `generatedAt`: UTC ISO 8601 timestamp from the writer's clock.
- `sourceRowCount`: original `parsedResult.totalRows`, not approved survey count.
- `siteCount`: number of public site records written.
- `tunnelCount`: distinct tunnel IDs represented in written observations; excludes
  unsurveyed tunnels and tunnels without approved public surveys.
- `excludedRowCount`: `parsedResult.invalidRows` - source rows US-08 flagged and
  excluded this run, regardless of why. A large or rising count is a signal
  something in the source sheet needs attention, even though it no longer blocks
  the rest of the data from publishing.

The last two choices are explicit local interpretations pending team agreement.
An empty authorized result is valid and writes empty arrays/zero public counts.
Generated `/data/*.json` files are ignored by Git; only synthetic source fixtures
should be committed.

The writer writes candidate files directly, with metadata last. **It is not safe
for replacement of a live dataset.** A filesystem failure may leave partial
candidate output. US-25 owns atomic replacement, rollback and last-good handling;
US-26 owns serving/build/deployment. `status: 'published'` is the required candidate
metadata label, not evidence that Netlify or a browser has received these files.

## Optional scheduler handoff

`startSheetScheduler({ onParsedResult })` optionally awaits an asynchronous
consumer after a successful changed fetch and parse. Known errors, nonzero/missing
`invalidRows`, and missing error diagnostics prevent handoff. A rejected consumer
is logged as failed; the previous CSV cache is updated only after completion.
Unchanged fetches skip the consumer. Existing default fetch-only behavior remains.

For isolated synthetic integration, an injected consumer can call:

```js
onParsedResult: parsed => writePublicDataset(parsed, { outputDirectory: staging })
```

The production launcher does not enable this callback. Before doing so, the team
must connect authoritative approval/visibility enrichment, full US-07 validation,
and US-25 publication safety. If authorization resides outside the CSV, its version
must participate in regeneration decisions; unchanged CSV alone is insufficient.

## Tests and synthetic demonstration (PowerShell)

From the repository root:

```powershell
npm test -- tests/unit/generate-dataset.test.js tests/unit/write-public-dataset.test.js tests/integration/public-dataset-handoff.test.js tests/regression/generate-dataset.test.js tests/perf/generate-dataset.test.js
```

Generate the three small, wholly synthetic example files without starting a
scheduler or fetching any stakeholder data:

```powershell
@'
import { makePublicDataset } from './tests/fixtures/publicDataset.js'
import { writePublicDataset } from './src/pipeline/writePublicDataset.js'
console.log(await writePublicDataset(makePublicDataset()))
'@ | node --input-type=module
```

`makeRepresentativeDataset()` in the same fixture module creates 42,420 unique
surveys, 2,973 tunnels, six explicitly public sites and 53 distinct survey dates.
All surveys are explicitly approved synthetic records. The performance test times
only transformation with `performance.now()` and checks under 10 seconds; JSON
byte sizes are measured separately. The ticket's approximate 2 MB motivation is
not a hard acceptance threshold; full public survey fields can exceed that size.

If the Windows sandbox causes Vitest temporary-file ENOENT errors, set TEMP/TMP
only for the current shell process before running tests:

```powershell
$auditTemp = Join-Path (Get-Location) 'node_modules/.cache/us24-audit-temp'
New-Item -ItemType Directory -Force -Path $auditTemp | Out-Null
$env:TEMP = $auditTemp
$env:TMP = $auditTemp
```

## Production decisions still required

- US-08 deliberately produces pending surveys; existing CSV fixtures have no
  explicit public-site authorization. Neither default has been changed. An
  approval/visibility column is a proposal, not an implemented workflow.
- `PublicTunnelSurvey` is not separately defined. ~~This implementation uses only
  the existing public TunnelSurvey fields; it adds no `siteId` or tunnel file.
  A consumer cannot join the two public files without an agreed relationship
  extension or another approved interface.~~ Resolved for US-14 (#19): each
  `observations.json` record now also carries `siteId` (the resolved
  `tunnelId → tunnel.siteId` join), so a consumer can relate a survey to its
  site without a separate mapping file.
- Map/details stories need aggregates absent from PublicSiteSummary. Their
  ownership and the public relationship extension require team agreement.
- Production regression fixtures are unavailable. The six-site/performance
  demonstration is synthetic, not evidence of current production authorization.
- No US-25 preservation, US-26 deployment, US-27 retries, or frontend changes are
  included. Existing lint/CI and Node deployment-version concerns remain separate.
