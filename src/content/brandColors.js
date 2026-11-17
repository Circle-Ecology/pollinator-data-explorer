// Circle Ecology chart palette, shared by the dashboard config and charts.
// Mirrors pollinator_colors in Georgia's theme_pollinator_v01.R (the R
// charts in the stakeholder deck), so the website and the deck use the same
// color for the same meaning. Change a color in both places.
// Keep the brand tokens in sync with DashboardPanel.css and MapView.css.
export const brandColors = {
  // Brand colors
  darkGreen: '#577253',
  lightGreen: '#B7CCB3',
  darkBlue: '#222F47',
  darkGray: '#8B9190',
  lightGray: '#E0E0DC',
  white: '#FFFFFF',
  black: '#222222',

  // Chart colors
  occupied: '#44546A',
  empty: '#E0E0DC',
  bee: '#73966E',
  wasp: '#617EB3',
  other: '#F1DDB5', // "Other" in every chart, pollinators and parasites alike
  unknown: '#7B6E9E',
  ant: '#CC6600',
  spider: '#65441D',
  pillBug: '#B98A2E',
  parasitized: '#B3413C',
  chalkbrood: '#A9788C',

  // Site scorecard colors, chosen to stay distinguishable with color blindness
  scorecardPresent: '#7FBFF5', // a genus is present at the site (+1 point)
  scorecardBonus: '#3D1CA2', // a bonus condition is met (+1 point)
  scorecardFlag: '#F1BF51', // a flag condition is triggered (score = 0)
}

// Fonts from the same theme: Alice for titles, Poppins for everything else.
// Loaded from Google Fonts in index.html.
export const brandFonts = {
  title: "'Alice', Georgia, serif",
  body: "'Poppins', system-ui, sans-serif",
}
