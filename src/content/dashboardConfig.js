// US-29: single source of truth for the dashboard's tabs and charts.
// Circle Ecology staff can reorder tabs, reword titles, snippets and caveats,
// or recolor series here without touching any component.
//
// Each chart:
//   id            - must match a chart id in /data/dashboard.json
//   title         - shown above the chart and in the side list
//   snippet       - 1-3 sentences, at most 300 characters, explaining how to
//                   read the chart. No specific figures: the data refreshes.
//   caveat        - optional data note shown below the snippet
//   component     - chart type, a key of CHART_COMPONENTS in ChartView
//   supportsYears - true: one year at a time with a year toggle;
//                   false: every year side by side on the x-axis
//   measures      - which of 'count' and 'percent' the measure toggle offers
//   categoryKey   - row field used for the x-axis labels ('year' when
//                   supportsYears is false)
//   categoryLabel - column heading for the x-axis in the data table
//   series        - stacked series, bottom to top: { key, label, color }

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

// One color per occupant type. A type with no occupants in the chart's
// current view (e.g. Unknown before 2026) is left out of the legend.
const OCCUPANT_TYPE_SERIES = [
  { key: 'Bee', label: 'Bee', color: brandColors.bee },
  { key: 'Wasp', label: 'Wasp', color: brandColors.wasp },
  { key: 'Unknown', label: 'Unknown', color: brandColors.unknown },
  { key: 'Other', label: 'Other', color: brandColors.other },
]

// Non-bee, non-wasp occupants, split by what they were.
const OTHER_TYPE_SERIES = [
  { key: 'Spider', label: 'Spider', color: brandColors.spider },
  { key: 'Ant(s)', label: 'Ant(s)', color: brandColors.ant },
  { key: 'Pill Bug', label: 'Pill Bug', color: brandColors.pillBug },
  { key: 'Other', label: 'Other', color: brandColors.other },
]

const OCCUPANT_TOTAL_SERIES = [
  { key: 'total', label: 'Occupants', color: brandColors.darkGreen },
]

// The pipeline takes 2025 Other occupants from Circle Ecology's separate
// tally tracker (see docs/public-dataset.md).
const OCCUPANTS_2025_CAVEAT =
  'In 2025, "Other" occupants (such as spiders and ants) were tallied on a ' +
  'separate sheet that recorded the most seen at any one visit, a different ' +
  'counting method from other years, so treat 2025 Other numbers as a ' +
  'rough guide.'

export const dashboardConfig = [
  {
    id: 'occupancy',
    label: 'Occupancy',
    charts: [
      {
        id: 'occupancy-by-year',
        title: 'Occupied vs. Empty Nesting Holes by Year',
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
        title: 'Occupied vs. Empty Nesting Holes by Site',
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
    label: 'Occupants',
    charts: [
      {
        id: 'occupants-by-year-type',
        title: 'Occupants by Year and Type',
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
        title: 'Occupants by Site and Type',
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
        title: 'Other Occupants by Site and Type',
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
]
