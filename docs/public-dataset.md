# US-24 public dataset generation

`generatePublicDataset(parsedResult)` in `src/pipeline/generatePublicDataset.js`
consumes normalized US-08 data, without parsing CSV, accessing the network, writing
files, or changing its input. It returns exactly `{ sites, observations, status }`.

## Input and internal status

Pass the existing `ImportValidationResult`: `sites`, `tunnels`, `surveys`, `errors`
arrays and nonnegative integer `totalRows` and `invalidRows`, alongside its existing
batch/count/warning fields. Missing or malformed structure throws a generic error.

Row-level problems elsewhere in the batch do not refuse the whole publish, but how
they are handled depends on what US-08 did with the affected row:

- A row that failed per-row validation (a malformed coordinate, a missing
  required field, an unparseable date) is already dropped entirely - it never
  reaches `sites`/`tunnels`/`surveys`, and only shows up via `invalidRows`.
- A row that **conflicts** with an already-seen row for the same entity is *not*
  dropped by US-08 - `parseExportRows` keeps the first-seen record and only
  reports the conflict. Publishing that arbitrarily-chosen value would be
  unreliable (for example, which row's `Is Public` flag "wins"), so
  `generatePublicDataset` itself excludes any site, tunnel or survey named in one
  of these conflict errors, rather than guess which row was right. Which codes
  count as a conflict, which entity type each belongs to, and which error field
  carries its id is `CONFLICT_CODES`, exported from `src/us08/parseExportRows.js`
  as the single source of truth - a new conflict code is classified there in the
  same change that adds it, not duplicated into a second list here.

Either way the affected entity is informational via `errors`/`invalidRows`
(surfaced through `dataset-status.json`'s `excludedRowCount`, below), not grounds
to withhold everything else. Resolved this way for #45, after running the real
Circle Ecology sheet through this pipeline and finding it has ~17% malformed-
coordinate rows (one site's corrupted `Coordinates` column) as well as a handful
of real attribute/coordinate/duplicate-survey conflicts, as a routine, ongoing
feature of field data entry - requiring perfectly clean data forever was never
realistic. An empty import (`totalRows === 0`) simply projects to empty output
rather than throwing; the scheduler handoff (below) still declines to act on a
parse that's empty or mostly unusable, to avoid an anomalous fetch wiping a live
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
  `parsedResult.invalidRows` plus the count of sites, tunnels and surveys
  `generatePublicDataset` excluded for a conflict (via its exported
  `countConflictedEntities`) - so either kind of problem is visible to whoever is
  watching, rather than silently swallowed now that neither blocks the publish.

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
- `excludedRowCount`: `parsedResult.invalidRows` plus conflict-excluded entities
  (see above). A large or rising count is a signal something in the source sheet
  needs attention, even though it no longer blocks the rest of the data from
  publishing.

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

`startSheetScheduler({ onParsedResult, maxInvalidRatio = 0.9 })` optionally awaits
an asynchronous consumer after a successful changed fetch and parse. A
shape-invalid parse, one with zero valid rows, or one whose `invalidRows /
totalRows` exceeds `maxInvalidRatio` all prevent handoff (#45 review) - the last
one catches an all-invalid-but-nonzero fetch too, e.g. a renamed header or a
corrupted column failing nearly every row, which would otherwise publish empty
`sites.json`/`observations.json` over a live dataset. Row-level errors on an
otherwise-good batch do not prevent handoff. Below the refusal threshold but
above 20% invalid, a notice is logged (not thrown) so a rising problem is still
visible. A rejected consumer is logged as failed; the previous CSV cache is
updated only after completion. Unchanged fetches skip the consumer. Existing
default fetch-only behavior remains.

For isolated synthetic integration, an injected consumer can call:

```js
onParsedResult: parsed => writePublicDataset(parsed, { outputDirectory: staging })
```

The production launcher (`scripts/fetch-sheet.js`, `npm run pipeline:fetch`) does
not enable this callback. Before doing so, the team must connect authoritative
approval/visibility enrichment, full US-07 validation, and US-25 publication
safety. If authorization resides outside the CSV, its version must participate in
regeneration decisions; unchanged CSV alone is insufficient.

`scripts/publish-sheet.js` (`npm run pipeline:publish`) is the manual/staging
alternative (#47): a single fetch -> parse -> write run against the real sheet
that exits rather than scheduling further fetches, for verifying real-data
behavior and producing staging output to inspect. It calls `fetchSheetExport`,
`parseExportCsv` and `writePublicDataset` directly rather than through
`startSheetScheduler`'s `onParsedResult`, since a one-shot run has no need for
the scheduler's interval/stop lifecycle.

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

- Resolved: the whole dataset is meant to be public, with no manual review
  step in place, so both defaults now favor publishing rather than withholding.
  `Is Public` defaults to `true` when the column is blank or missing a row,
  rather than defaulting to hidden; an explicit `FALSE`/`NO` still hides a
  site. `recordStatus` defaults to `approved` rather than `pending`; `pending`
  and `rejected` remain valid values for a future approval workflow, should
  one be built later.
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

## US-28 dashboard figures

`writePublicDataset` also writes `dashboard.json`, built by `generateDashboardDataset`
(`src/pipeline/generateDashboardDataset.js`) from the same public projection plus each
tunnel's `coarseWoodyDebrisType` (the cavity level). It has the same `generatedAt` as
`dataset-status.json` and contains only aggregates, never observer names, emails or notes.

Shape: `{ generatedAt, years, charts: { [chartId]: { [year]: rows } } }`. Every row carries
its counts and denominator (`available`) so percentages can be recomputed. Chart ids are
exported as `CHART_IDS`: `occupancy-by-year`, `occupancy-by-site`, the four occupant charts
`occupants-by-year-type`, `occupants-by-site`, `occupants-by-site-type` and `other-by-site-type`, the three genus charts
`occupants-by-genus`, `occupants-by-type-genus` and `multi-genus-cavities-by-site`, `genus-profile`,
`richness-by-diameter-site`, the two period charts `occupants-by-period-type` and
`other-by-period-type`, the scorecard charts `scorecard-genera`, `scorecard-all-sites` and
`scorecard-site-over-years`, and the five sealed nest rate charts `sealed-rate-by-cwd`,
`-by-substrate`, `-by-direction`, `-by-install-year` and `-by-diameter`. Direction and installation
year are grouped with Log/Snag like the deck ("N Log", "2025 Snag"). Sealed rows look like
`{ group, available, Bee: { sealed, rate }, Wasp: { sealed, rate } }`.

The metric rules (occupied, excluded, occupant run, sealed nest) each live in one helper in
that module. Year-level occupancy is confirmed against Circle Ecology's deck. A sealed nest is an
occupant run (defined below) with at least one `Sealed` record, counted per occupant type; the rate
counts nests, not cavities, over the non-excluded cavities observed that year. Against the deck's
2026 sealed nest rates by every structural factor this matches 32 of 34 cells exactly: all 17 Wasp
rates, and every Bee rate except two that are one point off (S Log 28 vs 27, NE Snag 9 vs 8). The
deck's 2025 installation-year chart is within one point on Bee (20/39/34/15 vs 19/38/33/15); the
cause is unexplained and may be the deck using an older export.

An occupant is one run in a cavity: it ends at any non-occupied observation, and a new run starts
on Reopened -> Active/Complete or when a recorded Plug Composition changes. Its type is the first
one recorded, and runs with no recorded type are not counted. Occupant rows are
`{ siteId, propertyName, Bee, Wasp, Unknown, Other, total }`, where Other is everything that is not
Bee, Wasp or Unknown, and `other-by-site-type` splits it into `Spider`, `Ant(s)`, `Pill Bug`, `Other`
(its `total` counts only those). All type keys are always present, so a zero can mean "none" or
"not tracked that year" (Unknown only exists from 2026); a chart should omit a type whose total is
zero for the year. Against the deck's occupants by site and type this matches 65 of 76
site/year/type cells exactly. Known differences: 2025 Other (the deck took it from a separate
tally tracker that is not in the sheet export), 2023 Other at two sites (-7 and -2), and a few
off-by-one cells, partly from the two duplicate surveys the pipeline drops.

Genus charts use the deck's General ID labels. An occupant's label is its run's first recorded
General ID, except that Spider, Ant(s), Pill Bug and Other occupants are all "Other", a Bee or Wasp
whose General ID is "Other" is "Other (Bee)" or "Other (Wasp)", and runs with no General ID are not
counted. `occupants-by-genus` rows are `{ generalId, Bee, Wasp, Unknown, Other, total }`, biggest
first. `occupants-by-type-genus` rows are `{ occupantType, generalId, occupants, typeTotal }`, so a
percentage within a type is `occupants / typeTotal`. `multi-genus-cavities-by-site` rows are
`{ siteId, propertyName, multiGenus, occupied }`: cavities with more than one General ID in the year,
out of the cavities occupied that year. Against the deck's table, 2026 matches on every row; 2025
matches on all but Other (the missing tracker), one Isodontia (a dropped duplicate survey) and
Osmia (mud); 2023 matches on 8 of 11 rows. Species-level figures are not possible: the sheet has no
species column, only General ID, family and common name.

`genus-profile` is keyed by General ID rather than by year (all years combined) and has one entry
per bee or wasp General ID (not Other or Unknown), 18 in the current data. Each entry has `nests`
(occupant runs, but a cavity that is Reopened and comes back Active stays the same nest; only coming
back Complete starts a new one, `NEST_RESEAL_STATUSES`; the occupant charts keep splitting on both),
`years`, `sites`, `sealedNests`, `parasitized` (parasitism % is
`parasitized / sealedNests`), `competition` (`cavities` that held the genus, how many `shared` a
cavity-year with another General ID, and `sharedWith` counts) and `panels`. Panels `direction`, `age`,
`cwd`, `substrate` and `diameter` have `{ nests, availableTotal, rows: [{ level, nests, available }] }`,
where `available / availableTotal` is the availability tick; levels with cavities but no nests are
kept. Age is seasons since installation (the installation year is the 1st season). `plugDepth` has
`{ nests, rows: [{ level, nests }] }`, leaves out 2023, has no availability, and uses the last plug
depth recorded in each nest's run. Checked against the deck's Hylaeus page: every count and every
availability tick matches. With the profile nest rule above, 14 of the deck's 18 per-genus nest
counts match exactly (12 with the occupant-run rule); still off are Megachile (Eutricharaea) 919 vs
917, Isodontia 304 vs 300, Anthidium 24 vs 22 and Osmia (mud) 5 vs 4.

Plug Depth is kept as the export's text (`1.1 inches`, `1 inch`, `1/2 inch`, `1/16 inch`, `flush`,
`protruding`); it was previously parsed as a number, which dropped every value.

`richness-by-diameter-site` rows are `{ diameter, siteId, propertyName, Bee, Wasp }`: the number of
distinct General IDs among that type's nests in cavities of that diameter at that site, one row for
every diameter and site that had cavities that year. It matches the deck's 2026 richness chart on
all 36 cells.

`nest-status-by-type` is the deck's "Number of Nests by Observation Status": per year, one row each for
Bee and Wasp with `Active`, `Complete`, `Emerged`, `Parasitized`, `Chalkbrood`, `sealed` and
`parasitizedRate` (parasitized / sealed, a percentage to one decimal). Nests use the genus-profile rule,
and a nest counts under every condition it has a record for, so the bars overlap (2025 Bee bars add up
to far more than its nests). Active is an Active observation that has a Plug Depth. Against the deck,
Complete, Emerged, Parasitized and Chalkbrood match exactly in 2023 and 2026, and Parasitized and
Chalkbrood in 2025; Active matches 2023 and 2025 (Wasp 87 vs 88) but is 8 (Bee) and 10 (Wasp) high in
2026; Complete in 2025 is 1 to 2 off; 2026 Bee `parasitizedRate` is 6.4 vs 6.5.

`plug-depth-by-year` is the deck's "Number of Nests by Plug Depth": per year, one row `{ total, unrecognized,
rows: [{ level, nests }] }`. The unit is the cavity: each cavity with a Bee, Wasp or Unknown occupant counts
once, at the last Plug Depth on one of those occupied observations. 2023 matches the deck exactly, 2025 is
within one cavity per level, and 2026 matches except 1/2 inch (7 short). Those 7 are the cavities whose
depth is garbled in the export (`unrecognized`), probably "1/2 inch", so 2026 totals 687 vs the deck's 694.

`occupants-by-period-type` and `other-by-period-type` follow the deck's fixed two-week calendar:
period 0 starts on 11 March and every period is 14 days, in every year. Each year lists periods
from period 0 through one period past the last survey, and empty periods are kept (with zero
counts) so the season's shape is honest. Rows are `{ period, start, end, Bee, Wasp, Unknown, Other,
total }` (`start` and `end` are ISO dates; the website formats them as "Jul 1-Jul 14"), and for
`other-by-period-type` `{ period, start, end, Spider, 'Ant(s)', 'Pill Bug', Other, total }`. A cavity
counts once per occupant type in every period in which it has an occupied observation with a
recorded type, so a cavity occupied across several periods counts in each. This matches the deck's
percentage charts to within one point on every cell (2023: 65 of 68 cells exact; 2026: 59 of 64;
2025's Bee:Wasp split within one point in all 14 periods). 2025's Other share is much lower than
the deck's because of the missing tally tracker. The Other-occupants version uses the same rule but
has not been compared to the deck.

Site scorecards (`scorecard-*`) are scored by `scoreSite` in the same module with the ticket's rules:
+1 per genus present; +1 for each of Parasitism, Competition and Other Occupants that is above 0% and
at most 30%; +1 if Emergence is recorded; +1 (once) if any genus was found only at that site that
year; and any of Parasitism, Chalkbrood, Competition, Other Occupants, Megachile (Eutricharaea) or
Osmia (mud) above 30% flags the site (score 0, "Flagged for Evaluation"); exactly 30% is not flagged.
`SCORE_MAX` is 24 (19 genera + 4 bonuses + the one only-at-this-site bonus). `scorecard-genera`
lists the genus rows with their Bee, Wasp or Unknown group; `scorecard-all-sites` is keyed by year
with one entry per site (`siteId`, `siteNumber`, `presentGenera`, `uniqueGenera`, `conditions`,
`score`, `max`, `category`, `flagged`, `flags`); `scorecard-site-over-years` is keyed by site then
year, and only has sites with more than one year (not Site 2, which is 2023 only). Each condition has
`numerator`, `denominator`, `rate` and `state` (`bonus`, `flag` or `none`); Emergence has `recorded`
instead of a state (recorded means a Bee or Wasp nest with an Emergence record).
Definitions: Parasitism = nests with a Parasitism record / sealed nests; Chalkbrood = nests with a
Chalkbrood record / nests; Competition = cavities with more than one General ID / occupied cavities;
Other = Other-occupant nests / nests; Megachile (Eutricharaea) and Osmia (mud) = their nests / nests;
Emergence = nests with an Emergence record / sealed nests.

Checked against the deck's scorecards: the genus cells match 133 of 133 (2023), 114 of 114 (2026) and
113 of 114 (2025); every 2023 score matches and 5 of 6 in 2026. Not matched: Site 7 in 2026 (our
Megachile (Eutricharaea) share is 32%, the deck's 26%, so we flag a site the deck scores 17/24 "Very
High"; no simple definition of that share fits the deck), the 2025 sites that depend on the missing
Other tracker, and Competition at four sites in 2023 (e.g. Site 5: 5% vs 21%). The category cut-offs
(Low below 8, High 8-15, Very High 16+) are inferred from the few scores the deck shows, and whether
the only-at-this-site bonus is a single point is unconfirmed.
