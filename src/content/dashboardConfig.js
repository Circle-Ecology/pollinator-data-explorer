// US-29: single source of truth for the dashboard's tabs and charts.
// Circle Ecology staff can reorder tabs, reword titles, snippets and caveats,
// or recolor series here without touching any component.
//
// Each tab: { id, label, note?, charts }. `note` is one optional sentence
// shown above the tab's charts.
//
// Each chart:
//   id            - must match a chart id in /data/dashboard.json
//   title         - shown above the chart and in the side list
//   snippet       - 1-3 sentences, at most 300 characters, explaining how to
//                   read the chart. No specific figures: the data refreshes.
//   caveat        - optional data note shown below the snippet: plain text
//                   (every year) or { text, years } (only those years)
//   component     - chart type, a key of CHART_TYPES in ChartView:
//                   'stackedBar', 'groupedRate' (side-by-side sealed nest
//                   rates), 'facetedStackedBar' (one panel per facet),
//                   'groupedCount' (side-by-side counts per category),
//                   'siteRate' (one rate per site), 'horizontalBar'
//                   (ranked horizontal bars, stacked by series),
//                   'groupedHorizontalBar' (horizontal bars grouped and
//                   colored by facetSeries), or the Site Scorecard
//                   tables 'scorecardAllSites' and 'scorecardSiteOverYears'
//   supportsYears - true: one year at a time with a year toggle;
//                   false: every year side by side on the x-axis
//   measures      - which of 'count' and 'percent' the measure toggle offers
//                   ('rate' for sealed nest rate charts, which have no toggle)
//   categoryKey   - row field used for the x-axis labels ('year' when
//                   supportsYears is false)
//   categoryFormat - optional: 'periodRange' labels each bar by its start
//                   and end dates ("Jul 1–Jul 14") instead of categoryKey
//   categoryLabel - column heading for the x-axis in the data table
//   categoryOrder - optional list fixing the order of the x-axis labels
//                   (labels not listed follow, in data order)
//   categoryTrackedFrom - optional { label: year }: a label recorded only
//                   from that year on is left out of earlier years
//   rowsField     - optional: dashboard.json nests the year's rows under this
//                   field (e.g. plug depth's { total, rows })
//   percentBase   - optional: 'chart' makes percentages a share of every
//                   bar combined, not of each bar
//   axisLabel     - optional y-axis label ('groupedCount', 'siteRate')
//   seriesKey, categories, summaryRows - 'groupedCount' only: the field that
//                   says which series a dashboard.json row is, the fields
//                   drawn as groups of bars ({ key, label }), and extra table
//                   rows ({ key, label, unit? })
//   rateFields, tableLabels - 'siteRate' only: the row fields behind the
//                   rate ({ numerator, denominator }) and their table
//                   column headings
//   generaChartId, genusOrder, conditions, emergenceRateFrom - scorecard
//                   views only: the dashboard.json chart listing every genus,
//                   the deck's genus order, the condition rows ({ key,
//                   label }) and the first year Emergence shows a rate
//                   (earlier years say "Recorded")
//   facetSeries   - 'groupedHorizontalBar' only: the groups ({ key, label,
//                   color }), in order; each bar takes its group's color
//   facetKey, facetLabel, facetUnit - facetedStackedBar only: the row field
//                   that splits the chart into side-by-side panels, its
//                   data-table heading, and a unit shown after each value
//   series        - stacked series, bottom to top: { key, label, color,
//                   trackedFrom? }. trackedFrom is the first year the
//                   series was recorded; earlier years leave it out of the
//                   chart rather than showing a misleading 0.

import { brandColors } from './brandColors'

export const SNIPPET_MAX_LENGTH = 300

// US-35: shared by both Site Scorecard views.
const SCORECARD_FIELDS = {
  measures: ['count'],
  series: [],
  generaChartId: 'scorecard-genera',
  // The deck's order: bees by family, then wasps, then Unknown.
  genusOrder: [
    'Hylaeus', 'Anthidium', 'Dianthidium', 'Ashmeadiella', 'Heriades', 'Hoplitis',
    'Megachile (Chelostomoides)', 'Megachile (Eutricharaea)', 'Megachile (multiple)',
    'Megachile (Sayapis)', 'Osmia (mud)', 'Osmia (vegetation)',
    'Eumeninae', 'Isodontia', 'Passaloecus or Psenulus', 'Solierella', 'Spilomena', 'Trypoxylon',
    'Unknown',
  ],
  // ">30%" marks the conditions that can only flag a site, never earn a bonus.
  conditions: [
    { key: 'parasitism', label: 'Parasitism' },
    { key: 'chalkbrood', label: 'Chalkbrood Characteristics >30%' },
    { key: 'multiGenus', label: 'Multi-genus Cavity Use' },
    { key: 'other', label: 'Other Occupants' },
    { key: 'megachile', label: 'Megachile (Eutricharaea) >30%' },
    { key: 'osmiaMud', label: 'Osmia (mud) >30%' },
    { key: 'emergence', label: 'Emergence' },
  ],
  emergenceRateFrom: 2026,
  caveat:
    'The category cutoffs (Low up to 5, Medium 6 to 10, High 11 to 15, ' +
    'Very High 16 and up) are provisional until Circle Ecology confirms them. ' +
    'Emergence was estimated before 2026, so earlier years show "Recorded" ' +
    'instead of a rate.',
}

// Chart colors from theme_pollinator_v01.R, as in Circle Ecology's deck.
const OCCUPANCY_SERIES = [
  { key: 'occupied', label: 'Occupied', color: brandColors.occupied },
  { key: 'empty', label: 'Empty', color: brandColors.empty },
]

const OCCUPANCY_2025_CAVEAT =
  'In 2025, nesting holes whose only occupant was an "Other" creature (such ' +
  'as a spider or ant) were tracked on a separate sheet and are not counted ' +
  'here, so 2025 totals run slightly low.'

// One color per occupant type. Unknown became an Occupant Type option in 2026.
const OCCUPANT_TYPE_SERIES = [
  { key: 'Bee', label: 'Bee', color: brandColors.bee },
  { key: 'Wasp', label: 'Wasp', color: brandColors.wasp },
  {
    key: 'Unknown',
    label: 'Unknown',
    color: brandColors.unknown,
    trackedFrom: 2026,
  },
  { key: 'Other', label: 'Other', color: brandColors.other },
]

// Non-bee, non-wasp occupants, split by what they were. Tracking grew more
// specific over time: ants were recorded separately from 2025, pill bugs
// from 2026 (as in Circle Ecology's deck).
const OTHER_TYPE_SERIES = [
  { key: 'Spider', label: 'Spider', color: brandColors.spider },
  { key: 'Ant(s)', label: 'Ant(s)', color: brandColors.ant, trackedFrom: 2025 },
  {
    key: 'Pill Bug',
    label: 'Pill Bug',
    color: brandColors.pillBug,
    trackedFrom: 2026,
  },
  { key: 'Other', label: 'Other', color: brandColors.other },
]

// Single-color totals use the theme's slate, as in the deck.
const OCCUPANT_TOTAL_SERIES = [
  { key: 'total', label: 'Occupants', color: brandColors.occupied },
]

// The pipeline takes 2025 Other occupants from Circle Ecology's separate
// tally tracker (see docs/public-dataset.md).
const OCCUPANTS_2025_CAVEAT =
  'In 2025, "Other" occupants (such as spiders and ants) were tallied on a ' +
  'separate sheet that recorded the most seen at any one visit, a different ' +
  'counting method from other years, so treat 2025 Other numbers as a ' +
  'rough guide.'

// Per-period 2025 Other counts also come from the tally tracker: the most
// seen at a visit in each period, with zero for periods it had no visit.
const SEASON_2025_CAVEAT =
  'In 2025, "Other" occupants (such as spiders and ants) were tallied on a ' +
  'separate sheet, using the most seen at one visit. Periods without a ' +
  'tally visit show as zero, so treat 2025 Other numbers as a rough guide.'

// Bee and Wasp side by side, for sealed nest rates and genus richness.
const NEST_TYPE_SERIES = [
  { key: 'Bee', label: 'Bee', color: brandColors.bee },
  { key: 'Wasp', label: 'Wasp', color: brandColors.wasp },
]

// 2023 recorded only the 1/2 inch and protruding plug depths; the other four
// were added in 2025.
const PLUG_DEPTHS_FROM_2025 = Object.fromEntries(
  ['1.1 inches', '1 inch', '1/16 inch', 'flush'].map((depth) => [depth, 2025])
)

// Notes that explain a missing level only apply to the year it was missing.
const SNAGS_FROM_2025 = 'Snags were first installed in 2025'
const in2023 = (text) => ({ text, years: [2023] })

// Logs before Snags, each in compass order.
const DIRECTION_ORDER = ['Log', 'Snag'].flatMap((type) =>
  ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir) => `${dir} ${type}`)
)

// Shared settings for the five sealed nest rate charts.
const sealedRateChart = (chart) => ({
  component: 'groupedRate',
  supportsYears: true,
  measures: ['rate'],
  series: NEST_TYPE_SERIES,
  ...chart,
})

export const dashboardConfig = [
  {
    id: 'occupancy',
    label: 'Occupied Fabricated Cavities',
    charts: [
      {
        id: 'occupancy-by-year',
        title: 'Occupied Fabricated Cavities by Year',
        snippet:
          'Each bar is one monitoring year. The dark part shows nesting ' +
          'holes that held an occupant at some point that season; the light ' +
          'part shows holes that stayed empty. Holes retired before use are ' +
          'left out.',
        caveat: OCCUPANCY_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: false,
        measures: ['count', 'percent'],
        categoryKey: 'year',
        categoryLabel: 'Year',
        series: OCCUPANCY_SERIES,
      },
      {
        id: 'occupancy-by-site',
        title: 'Occupied Fabricated Cavities by Site',
        snippet:
          'Each bar is one monitoring site in the selected year. Compare how ' +
          'much of each bar is dark to see where nesting holes were used ' +
          'most. A site only appears in the years it was monitored.',
        caveat: OCCUPANCY_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'propertyName',
        categoryLabel: 'Site',
        series: OCCUPANCY_SERIES,
      },
    ],
  },
  {
    id: 'occupants',
    label: 'Occupants by Site and Occupant Type',
    charts: [
      {
        id: 'occupants-by-year-type',
        title: 'Occupants by Year and Occupant Type',
        snippet:
          'Each bar is one monitoring year, split by who moved in: bees, ' +
          'wasps, other creatures such as spiders and ants, and occupants ' +
          'that could not be identified. A nesting hole can count more than ' +
          'once if a new occupant moved in later in the season.',
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: false,
        measures: ['count', 'percent'],
        categoryKey: 'year',
        categoryLabel: 'Year',
        series: OCCUPANT_TYPE_SERIES,
      },
      {
        id: 'occupants-by-site',
        title: 'Occupants by Site',
        snippet:
          'Each bar is the total number of occupants recorded at one ' +
          'monitoring site in the selected year. Sites with more nesting ' +
          'holes tend to have more occupants, so see the Occupancy tab to ' +
          'compare how much of each site was used.',
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count'],
        categoryKey: 'propertyName',
        categoryLabel: 'Site',
        series: OCCUPANT_TOTAL_SERIES,
      },
      {
        id: 'occupants-by-site-type',
        title: 'Occupants by Site and Occupant Type',
        snippet:
          'Each bar is one monitoring site in the selected year, split by ' +
          'occupant type. Switch to Percentage to compare the mix of bees, ' +
          'wasps and other occupants between sites of different sizes.',
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'propertyName',
        categoryLabel: 'Site',
        series: OCCUPANT_TYPE_SERIES,
      },
      {
        id: 'other-by-site-type',
        title: 'Other Occupants by Site and Other Type',
        snippet:
          'Each bar is one monitoring site in the selected year, showing ' +
          'only occupants that were not bees or wasps: spiders, ants, pill ' +
          'bugs and others. A type only appears in years it was recorded ' +
          'separately.',
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'propertyName',
        categoryLabel: 'Site',
        series: OTHER_TYPE_SERIES,
      },
    ],
  },
  {
    id: 'season',
    label: 'Occupancy by Observation Period',
    charts: [
      {
        id: 'occupants-by-period-type',
        title: 'Occupants by Observation Period and Occupant Type',
        snippet:
          'Each bar is one two-week observation period in the selected ' +
          'year, split by occupant type. A nesting hole counts in every ' +
          'period it stayed occupied, so the bars show how activity builds ' +
          'and fades over the season.',
        caveat: SEASON_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'period',
        categoryFormat: 'periodRange',
        categoryLabel: 'Period',
        series: OCCUPANT_TYPE_SERIES,
      },
      {
        id: 'other-by-period-type',
        title: 'Other Occupants by Observation Period and Other Type',
        snippet:
          'Each bar is one two-week period in the selected year, showing ' +
          'only occupants that were not bees or wasps. Empty bars are ' +
          'periods with none recorded, kept so the shape of the season ' +
          'stays honest.',
        caveat: SEASON_2025_CAVEAT,
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'period',
        categoryFormat: 'periodRange',
        categoryLabel: 'Period',
        series: OTHER_TYPE_SERIES,
      },
    ],
  },
  {
    id: 'genus',
    label: 'Occupants by Genus (General ID)',
    charts: [
      {
        id: 'occupants-by-type-genus',
        title: 'Occupants by Occupant Type and General ID',
        snippet:
          'Each bar is one genus (General ID), grouped by occupant type and ' +
          'colored to match. In percentage view each bar is its share of ' +
          'that occupant type, so the bars in each group add up to 100%.',
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'groupedHorizontalBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        facetKey: 'occupantType',
        facetLabel: 'Occupant type',
        facetSeries: OCCUPANT_TYPE_SERIES,
        categoryLabel: 'General ID',
        series: [{ key: 'occupants', label: 'Occupants', color: brandColors.occupied }],
      },
      {
        id: 'occupants-by-genus',
        title: 'Occupants by General ID',
        snippet:
          'Each bar is one genus (General ID), ranked from most to fewest ' +
          'occupants, with its color split by occupant type. In percentage ' +
          "view each bar is that genus's share of all occupants that year.",
        caveat: OCCUPANTS_2025_CAVEAT,
        component: 'horizontalBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        categoryKey: 'generalId',
        categoryLabel: 'General ID',
        percentBase: 'chart',
        series: OCCUPANT_TYPE_SERIES,
      },
      {
        id: 'multi-genus-cavities-by-site',
        title: 'Percentage of Occupied Fabricated Cavities with More Than One Genus, by Site',
        snippet:
          "Each bar is the share of a site's occupied nesting holes that " +
          'held more than one genus during the year. A hole counts once, ' +
          'however many genera or nests it held.',
        component: 'siteRate',
        supportsYears: true,
        measures: ['rate'],
        categoryLabel: 'Site',
        axisLabel: '% of occupied cavities',
        rateFields: { numerator: 'multiGenus', denominator: 'occupied' },
        tableLabels: {
          denominator: 'Occupied cavities',
          numerator: 'Cavities with more than one genus',
        },
        series: [{ key: 'multiGenus', label: 'More than one genus', color: brandColors.occupied }],
      },
    ],
  },
  {
    id: 'nest-sites',
    label: 'Nests by Structural Factors',
    note:
      'Sealed nest rate is the share of available nesting holes at each ' +
      'level that held a sealed bee or wasp nest that year, so levels with ' +
      "more holes don't look better just for having more.",
    charts: [
      sealedRateChart({
        id: 'sealed-rate-by-cwd',
        title: 'Sealed Nest Rate by Coarse Woody Debris Type and Occupant Type',
        snippet:
          'Each pair of bars compares how often bees and wasps sealed a ' +
          'nest in logs (lying down) versus snags (standing) in the selected ' +
          'year. A taller bar means that structure was used more for its size.',
        caveat: in2023(`${SNAGS_FROM_2025}, so this year shows logs only.`),
        categoryKey: 'group',
        categoryLabel: 'Structure',
      }),
      sealedRateChart({
        id: 'sealed-rate-by-substrate',
        title: 'Sealed Nest Rate by Substrate Type and Occupant Type',
        snippet:
          'Each pair of bars compares bee and wasp sealed nest rates in ' +
          'cottonwood versus pine in the selected year.',
        caveat: in2023(
          'All nesting holes monitored in 2023 were in pine, so this year ' +
            'shows pine only.'
        ),
        categoryKey: 'group',
        categoryLabel: 'Wood type',
      }),
      sealedRateChart({
        id: 'sealed-rate-by-direction',
        title: 'Sealed Nest Rate by Log/Snag Direction and Occupant Type',
        snippet:
          'Each pair of bars is one direction a log or snag faces, comparing ' +
          'bee and wasp sealed nest rates. Logs are listed first, then snags, ' +
          'each going around the compass from north.',
        caveat: in2023(
          `${SNAGS_FROM_2025}, so this year shows log directions only.`
        ),
        categoryKey: 'group',
        categoryLabel: 'Direction',
        categoryOrder: DIRECTION_ORDER,
      }),
      sealedRateChart({
        id: 'sealed-rate-by-install-year',
        title: 'Sealed Nest Rate by Log/Snag Installation Year and Occupant Type',
        snippet:
          'Each pair of bars is a group of logs or snags installed in the ' +
          'same year, showing whether older or newer structures were used ' +
          'more. The same structures are tracked in 2025 and 2026.',
        caveat: in2023(
          'Only logs installed in 2023 existed this year, so it has one group.'
        ),
        categoryKey: 'group',
        categoryLabel: 'Installed',
      }),
      sealedRateChart({
        id: 'sealed-rate-by-diameter',
        title: 'Sealed Nest Rate by Fabricated Cavity Diameter and Occupant Type',
        snippet:
          'Each pair of bars is one nesting-hole width, in inches. Bees and ' +
          'wasps often prefer different widths, so compare where each one ' +
          'is tallest.',
        categoryKey: 'group',
        categoryLabel: 'Diameter (inches)',
      }),
      {
        id: 'richness-by-diameter-site',
        title: 'Fabricated Cavity Richness by Diameter, Site, and Occupant Type',
        snippet:
          'Each panel is one nesting-hole width; each bar is a site, labelled ' +
          "by Circle Ecology's site number, counting the different bee and " +
          'wasp genera found there. The data table lists full site names.',
        component: 'facetedStackedBar',
        supportsYears: true,
        measures: ['count'],
        categoryKey: 'propertyName',
        categoryLabel: 'Site',
        facetKey: 'diameter',
        facetLabel: 'Diameter',
        facetUnit: ' in',
        series: NEST_TYPE_SERIES,
      },
    ],
  },
  {
    id: 'nest-condition',
    label: 'Nests by Observation Status and Plug Depth',
    charts: [
      {
        id: 'nest-status-by-type',
        title: 'Nests by Observation Status',
        snippet:
          'Each pair of bars counts the bee and wasp nests that reached a ' +
          'status during the selected year. A nest can reach more than one ' +
          '(Active, then Complete, then Emerged), so the bars overlap rather ' +
          'than adding up to the number of nests.',
        caveat:
          'Parasitism % in the data table is parasitized nests as a share ' +
          'of nests that were sealed at any point that year.',
        component: 'groupedCount',
        supportsYears: true,
        measures: ['count'],
        seriesKey: 'occupantType',
        categories: [
          { key: 'Active', label: 'Active' },
          { key: 'Complete', label: 'Complete' },
          { key: 'Emerged', label: 'Emerged' },
          { key: 'Parasitized', label: 'Parasitized' },
          { key: 'Chalkbrood', label: 'Chalkbrood Characteristics' },
        ],
        categoryLabel: 'Nest status',
        axisLabel: 'Nests',
        summaryRows: [
          { key: 'sealed', label: 'Sealed nests' },
          { key: 'parasitizedRate', label: 'Parasitism (% of sealed nests)', unit: '%' },
        ],
        series: NEST_TYPE_SERIES,
      },
      {
        id: 'emergence-rate-by-site',
        title: 'Emergence Rate by Site',
        snippet:
          'Each bar is the share of a site\'s sealed nests (bee, wasp and ' +
          'unknown) that later showed signs of emergence that year. It is ' +
          'the same figure as the Emergence row on the Site Scorecard.',
        caveat:
          'Emergence has been recorded directly in the field since 2026. ' +
          'Earlier years were estimated during data cleanup, so they are ' +
          'not shown.',
        component: 'siteRate',
        supportsYears: true,
        measures: ['rate'],
        categoryLabel: 'Site',
        axisLabel: 'Emergence rate (%)',
        rateFields: { numerator: 'emerged', denominator: 'sealed' },
        tableLabels: { denominator: 'Sealed nests', numerator: 'Emerged nests' },
        series: [{ key: 'emergence', label: 'Emergence', color: brandColors.bee }],
      },
      {
        id: 'plug-depth-by-year',
        title: 'Nested Fabricated Cavities by End-of-Season Plug Depth',
        snippet:
          'Each bar is one plug depth, from deepest to shallowest. Every ' +
          'nesting hole that held a bee, wasp or unknown nest that year ' +
          'counts once, at the last depth recorded while it was occupied.',
        caveat: in2023(
          'Only two depths (1/2 inch and protruding) were recorded in 2023; ' +
            'the other four were added in 2025.'
        ),
        component: 'stackedBar',
        supportsYears: true,
        measures: ['count', 'percent'],
        rowsField: 'rows',
        categoryKey: 'level',
        categoryLabel: 'Plug depth',
        categoryTrackedFrom: PLUG_DEPTHS_FROM_2025,
        percentBase: 'chart',
        series: [{ key: 'nests', label: 'Nested cavities', color: brandColors.occupied }],
      },
    ],
  },
  {
    id: 'site-scorecard',
    label: 'Site Scorecard',
    note:
      'Each site earns a point for every genus found there and for each ' +
      'healthy condition, out of 24; a flag marks a condition to look into ' +
      'and does not lower the score.',
    charts: [
      {
        id: 'scorecard-all-sites',
        title: 'Site Scorecard: All Sites',
        snippet:
          'Each column is one site. A check is a genus found there that year, ' +
          'a star a genus found at no other site. Below are condition rates: ' +
          '+1 marks a bonus point, a flag a rate over 30%. Compare sites ' +
          'within a year, not across years.',
        component: 'scorecardAllSites',
        supportsYears: true,
        ...SCORECARD_FIELDS,
      },
      {
        id: 'scorecard-site-over-years',
        title: 'Site Scorecard: One Site Across Years',
        snippet:
          'Each column is one year for the chosen site, scored on that ' +
          "year's data alone. Use it to see which genera and conditions " +
          'changed at a site over time.',
        component: 'scorecardSiteOverYears',
        supportsYears: false,
        ...SCORECARD_FIELDS,
      },
    ],
  },
]
