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

The metric rules (occupied, excluded, occupant run, nest, sealed nest) each live in one helper in
that module. Year-level occupancy is confirmed against Circle Ecology's deck. A sealed nest is a
nest (see the nest rule below) with at least one `Sealed` record, counted per occupant type; the rate
is sealed nests over the distinct cavities observed that year after the retired-hole exclusion, with
plain rounding to the nearest whole percent (.5 rounds up). Circle Ecology confirmed this is how the
deck calculates it. With the nest rule below, the 2025 sealed rates and installation-year chart match
the deck on every cell we compared, and 2026 matches except NE Snag Bee (9 vs the deck's 8).

An occupant is one run in a cavity: it ends at any non-occupied observation, and a new run starts
on Reopened -> Active/Complete or when a recorded Plug Composition changes. Its type is the first
one recorded, and runs with no recorded type are not counted. Occupant rows are
`{ siteId, propertyName, Bee, Wasp, Unknown, Other, total }`, where Other is everything that is not
Bee, Wasp or Unknown, and `other-by-site-type` splits it into `Spider`, `Ant(s)`, `Pill Bug`, `Other`
(its `total` counts only those). All type keys are always present, so a zero can mean "none" or
"not tracked that year" (Unknown only exists from 2026); a chart should omit a type whose total is
zero for the year.

**2025 Other occupants come from the tally tracker, not the sheet.** The deck took them from a
separate "2025 Other tally tracker" (spiders, ants, pill bugs and fungus), which is kept in
`src/pipeline/data/otherTally2025.js` (generated by `scripts/build-other-tally.js` from the tracker's
CSV export; counts only). The tracker is a running count of how many cavities held an Other occupant
at each visit, so the same occupant is counted at every visit while it is still there. Like the deck
(report_v04), we sum each Other type's own highest count at a site over the season (most spiders at any
one visit + most ants at any one visit + most Other at any one visit): 11, 43, 14, 26, 32 and 27 for
sites 1, 3, 4, 5, 6 and 7, 153 in all (report_v03 took the highest single-visit total, 127). For a
tracked year these figures replace the Other occupants recorded in the sheet. They feed the
occupant charts, the Other-by-site-type chart (the split of each type's peak), the genus chart's "Other"
row, the Other-by-period charts (per site and period, the highest count among that period's visits,
summed over sites) and the scorecards. Occupancy (occupied vs empty cavities) is still from the sheet.
The tracker has gaps (e.g. no visit between 26 Jun and 23 Jul at some sites), which show as zero periods.

In 2023 spiders were recorded as occupant type Other with General ID "Spider", so the Other-by-type
chart splits them out by General ID (58 in 2023, as in the deck). Other occupants whose General ID is
"Unknown" count in the occupant charts but are left out of the Other-by-type breakdowns, as in the deck.
Against the deck's occupants by site and type, 2025 Other now matches exactly and 2023 Other is lower at
two sites (Rogers Grove, St. Vrain); Circle Ecology confirmed our 2023 figures are right (the deck started a
second occupant when a plug composition was first recorded on a later visit; the deck is being re-run).

Genus charts use the deck's General ID labels. An occupant's label is its run's first recorded
General ID, except that Spider, Ant(s), Pill Bug and Other occupants are all "Other", a Bee or Wasp
whose General ID is "Other" is "Other (Bee)" or "Other (Wasp)", and runs with no General ID are not
counted. `occupants-by-genus` rows are `{ generalId, Bee, Wasp, Unknown, Other, total }`, biggest
first. `occupants-by-type-genus` rows are `{ occupantType, generalId, occupants, typeTotal }`, so a
percentage within a type is `occupants / typeTotal`. `multi-genus-cavities-by-site` rows are
`{ siteId, propertyName, multiGenus, occupied }`: cavities with two or more distinct General IDs recorded
on any of their observations in the year, out of the cavities occupied that year. Species-level figures are not possible: the sheet has no
species column, only General ID, family and common name.

`genus-profile` is keyed by General ID rather than by year (all years combined) and has one entry
per bee or wasp General ID (not Other or Unknown), 18 in the current data. Each entry has `nests`
(see the nest rule below; the occupant charts keep their own, broader occupant rule),
`years`, `sites`, `sealedNests`, `parasitized` (parasitism % is
`parasitized / sealedNests`), `competition` (`cavities` that held the genus, how many `shared` a
cavity-year with another distinct General ID on any observation, and `sharedWith` counts) and `panels`. Panels `direction`, `age`,
`cwd`, `substrate` and `diameter` have `{ nests, availableTotal, rows: [{ level, nests, available }] }`,
where `available / availableTotal` is the availability tick; levels with cavities but no nests are
kept. Age is seasons since installation (the installation year is the 1st season). `plugDepth` has
`{ nests, rows: [{ level, nests }] }`, leaves out 2023, has no availability, and uses the last plug
depth recorded in each nest's run. Checked against the deck's Hylaeus page: every count and every availability tick matches.

**Nest rule** (`NEST_RULES`, from Circle Ecology): a new nest starts when an Active or Complete
observation with Whole or hole = Sealed comes right after an Empty or Reopened one, or when the plug
changes to a different nesting material (`occupant present` and `empty` are not materials). A plug first
recorded after observations without one is not a change. The occupant rule (`OCCUPANT_RULES`) is broader:
any Active or Complete after Reopened, and any plug composition change, starts a new occupant. Nests drive
the genus pages, the nest-status chart and the sealed nest rates; occupants drive the occupant charts and
scorecards. The deck's genus pages are being re-run with these rules, so small differences from the old deck
remain (we get Megachile (Eutricharaea) 916 vs 917, Isodontia 305 vs 300, Anthidium 21 vs 22, Osmia (mud) 5 vs 4).

Plug Depth is kept as the export's text (`1.1 inches`, `1 inch`, `1/2 inch`, `1/16 inch`, `flush`,
`protruding`); it was previously parsed as a number, which dropped every value. The 11 garbled values in
2026 were confirmed to be `1/2 inch` and are fixed in `combined_data_clean_v04.csv`.

`richness-by-diameter-site` rows are `{ diameter, siteId, propertyName, Bee, Wasp }`: the number of
distinct General IDs recorded on any Bee or Wasp observation (not only nests) in cavities of that diameter
at that site, counted separately for Bee and Wasp; `Unknown` and `Other` each count as one value. One row
for every diameter and site that had cavities that year. Matches the deck's 2026 richness chart on all 36 cells.

`nest-status-by-type` is the deck's "Number of Nests by Observation Status": per year, one row each for
Bee and Wasp with `Active`, `Complete`, `Emerged`, `Parasitized`, `Chalkbrood`, `sealed` and
`parasitizedRate` (parasitized / sealed, a percentage to one decimal). Nests use the nest rule above,
and a nest counts under every condition it has a record for, so the bars overlap (2025 Bee bars add up
to far more than its nests). Active is an Active observation that has a Plug Depth. Against the deck,
with the nest rule: Complete, Emerged, Parasitized and Chalkbrood match in 2023 and 2026 and 2025 Bee
Complete (585) and 2026 Bee parasitized rate (6.5) now match; 2026 Active is 187 Bee and 106 Wasp vs the
deck's 183 and 94, and 2025 Wasp Complete is 243 vs 244.

`plug-depth-by-year` is the deck's "Number of Nests by Plug Depth": per year, one row `{ total, unrecognized,
rows: [{ level, nests }] }`. The unit is the cavity: each cavity with a Bee, Wasp or Unknown occupant counts
once, at the last Plug Depth on one of those occupied observations. 2023 matches the deck exactly, 2025 is
within one cavity per level, and 2026 matches the deck at every depth now that the garbled depths are
fixed in the data (96 at 1/2 inch, 694 total). `unrecognized` counts any depth outside the six levels.

`occupants-by-period-type` and `other-by-period-type` follow the deck's fixed two-week calendar:
period 0 starts on 11 March and every period is 14 days, in every year. Each year lists periods
from period 0 through one period past the last survey, and empty periods are kept (with zero
counts) so the season's shape is honest. Rows are `{ period, start, end, Bee, Wasp, Unknown, Other,
total }` (`start` and `end` are ISO dates; the website formats them as "Jul 1-Jul 14"), and for
`other-by-period-type` `{ period, start, end, Spider, 'Ant(s)', 'Pill Bug', Other, total }`. A cavity
counts once per occupant type in every period in which it has an occupied observation with a
recorded type, so a cavity occupied across several periods counts in each. This matches the deck's
percentage charts to within one point on every cell (2023: 65 of 68 cells exact; 2026: 59 of 64;
2025's Bee:Wasp split within one point in all 14 periods). In 2025 the Other occupants come from the
tally tracker (see above). The Other-occupants version uses the same rule; it has only been compared to
the deck for 2026.

Site scorecards (`scorecard-*`) are scored by `scoreSite` in the same module:
+1 per genus present; +1 for each of Parasitism, Multi-genus cavity use and Other Occupants that is above 0%
and at most 30%; +1 if Emergence is recorded; and +1 (once) if any genus was found only at that site that
year. Any of Parasitism, Chalkbrood, Multi-genus cavity use, Other Occupants, Megachile (Eutricharaea) or
Osmia (mud) above 30% **flags** the site (exactly 30% is not flagged). Per Circle Ecology (Nov 2026) a flag
no longer zeroes the score: the flagged condition just earns no point, `flagged` and `flags` are set and
`conditions[id].state` is `flag` so the page can colour that variable ("may need further evaluation", not
"bad"). `category` comes from the score. "Competition" is now called "Multi-genus cavity use"
(`SCORECARD_CONDITION_LABELS`; the condition id is `multiGenus`; genus pages keep `competition`).
`SCORE_MAX` is 24 (19 genera + 4 bonuses + the one only-at-this-site bonus). `scorecard-genera`
lists the genus rows with their Bee, Wasp or Unknown group; `scorecard-all-sites` is keyed by year
with one entry per site (`siteId`, `siteNumber`, `presentGenera`, `uniqueGenera`, `conditions`,
`score`, `max`, `category`, `flagged`, `flags`); `scorecard-site-over-years` is keyed by site then
year, and only has sites with more than one year (not Site 2, which is 2023 only). Each condition has
`numerator`, `denominator`, `rate` and `state` (`bonus`, `flag` or `none`); Emergence has `recorded`
instead of a state (recorded means a Bee or Wasp occupant with an Emergence record).

Definitions (confirmed by Circle Ecology):
- Parasitism = occupants with a Parasitism record / sealed occupants. Emergence = occupants with an Emergence
  record / sealed occupants.
- Multi-genus cavity use = cavities with two or more distinct General IDs (any observation that year) / the
  site's cavities that have at least one General ID (a cavity with no General ID cannot show multi-genus
  use). The genus pages use the same definition per genus, pooled over years.
- Other = Other occupants / all occupants; in 2025 the Other count is the tally tracker's.
- Chalkbrood and Osmia (mud) = their occupants / all occupants.
- Megachile (Eutricharaea) = its occupants minus any ever recorded as Parasitism or Chalkbrood
  Characteristics, over all occupants (those still included).

Checked against the deck's scorecards: 2026 Megachile (Eutricharaea) shares now match at every site
(26%, 40%, 48%, 26%, 13%, 8%), so Site 7 in 2026 is no longer flagged and scores 17 ("Very High"), and the
2023 multi-genus shares match (5%, 4%, 21%, 8%). 2025 Site 3 is flagged (Other is 38% of its occupants) and
Site 4 scores 11, as in the deck. The category cut-offs (Low below 8, High 8-15, Very High 16+) are still
inferred from the few scores the deck shows, and whether the only-at-this-site bonus is a single point is
unconfirmed (open question to Circle Ecology).
