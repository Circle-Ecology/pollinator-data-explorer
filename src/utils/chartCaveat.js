// A chart's data note (`caveat` in dashboardConfig) is either plain text,
// shown for every year, or { text, years }, shown only for those years: e.g.
// "this year shows logs only" belongs under 2023, not 2025. Charts that show
// every year side by side (no year selected) always show their note.
export function getCaveatText(caveat, year) {
  if (!caveat) return null
  if (typeof caveat === 'string') return caveat
  if (year === null || year === undefined) return caveat.text
  return caveat.years.includes(Number(year)) ? caveat.text : null
}
