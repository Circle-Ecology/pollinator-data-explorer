
/**
 * US-32: Occupants by Genus (General ID) Charts
 *
 * Configuration for the three charts in the Genus tab.
 * Kept separate from the existing dashboard configuration
 * to preserve teammates' Occupancy chart definitions.
 */

export const genusChartConfig = {
  id: 'genus',
  label: 'Genus',
  charts: [
    {
      id: 'occupants-by-type-genus',
      title: 'Occupants by Occupant Type and General ID',
      snippet:
        'Shows which genera were recorded for each occupant type. ' +
        'Percentages are calculated within each occupant type.',
      component: 'typeGenusBar',
      supportsYears: true,
      measures: ['count', 'percent'],
      categoryKey: 'generalId',
      categoryLabel: 'General ID',
      series: [],
    },
    {
      id: 'occupants-by-genus',
      title: 'Occupants by General ID',
      snippet:
        'Shows how often each genus was recorded during the selected ' +
        'year, ranked from highest to lowest.',
      component: 'horizontalBar',
      supportsYears: true,
      measures: ['count', 'percent'],
      categoryKey: 'generalId',
      categoryLabel: 'General ID',
      series: [],
    },
    {
      id: 'multi-genus-cavities-by-site',
      title: 'Cavities Occupied by More Than One Genus, by Site',
      snippet:
        'Shows how many cavities contained more than one distinct ' +
        'genus at each monitoring site during the selected year.',
      component: 'multiGenusBar',
      supportsYears: true,
      measures: ['count'],
      categoryKey: 'propertyName',
      categoryLabel: 'Site',
      series: [],
    },
  ],
}
