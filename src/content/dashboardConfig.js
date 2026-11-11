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

// Brand colors on the panel's white background, like Circle Ecology's
// chart deck: a strong color for occupied, light gray for empty.
const OCCUPANCY_SERIES = [
  { key: 'occupied', label: 'Occupied', color: brandColors.darkGreen },
  { key: 'empty', label: 'Empty', color: brandColors.lightGray },
]

const OCCUPANCY_2025_CAVEAT =
  'In 2025, nesting holes whose only occupant was an "Other" creature (such ' +
  'as a spider or ant) were tracked on a separate sheet and are not counted ' +
  'here, so 2025 totals run slightly low.'

export const dashboardConfig = [
  {
    id: 'occupancy',
    label: 'Occupancy',
    charts: [
      {
        id: 'occupancy-by-year',
        title: 'Occupied vs. Empty Nesting Holes by Year',
        snippet:
          'Each bar is one monitoring year. The green part shows nesting ' +
          'holes that held an occupant at some point that season; the gray ' +
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
          'much of each bar is green to see where nesting holes were used ' +
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
]
