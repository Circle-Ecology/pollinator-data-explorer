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
//                   rates) or 'facetedStackedBar' (one panel per facet)
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
//   facetKey, facetLabel, facetUnit - facetedStackedBar only: the row field
//                   that splits the chart into side-by-side panels, its
//                   data-table heading, and a unit shown after each value
//   series        - stacked series, bottom to top: { key, label, color,
//                   trackedFrom? }. trackedFrom is the first year the
//                   series was recorded; earlier years leave it out of the
//                   chart rather than showing a misleading 0.

import { brandColors } from './brandColors'

export const SNIPPET_MAX_LENGTH = 300

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
]
