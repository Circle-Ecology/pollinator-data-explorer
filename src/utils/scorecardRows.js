// US-35: columns and cells for the Site Scorecard tables. The pipeline does
// all the scoring (scoreSite in generateDashboardDataset); dashboard.json has
// one entry per site and year with its present genera, condition rates and
// states ('bonus', 'flag' or 'none'), score, category and flags.

// Column heading for a site: its number, then the property name without the
// "(Site N)" the pipeline adds to tell apart two sites on one property.
export function siteHeading({ siteId, siteNumber }) {
  const name = String(siteId).replace(/\s*\(Site \d+\)$/, '')
  if (siteNumber == null) return { title: name, subtitle: '' }

  const title = `Site ${siteNumber}`
  const subtitle = name.startsWith(title) ? name.slice(title.length).trim() : name
  return { title, subtitle }
}

const bySiteNumber = (a, b) => Number(a.siteNumber) - Number(b.siteNumber)

// All Sites view: one column per site in `year`, in site number order.
export function buildAllSitesColumns(chart, data, year) {
  const entries = data.charts[chart.id]?.[String(year)] ?? []

  return [...entries].sort(bySiteNumber).map((entry) => ({
    key: entry.siteId,
    ...siteHeading(entry),
    year,
    entry,
  }))
}

// One Site Across Years view: every site with its columns, one per year.
export function buildSiteOverYearsSites(chart, data) {
  const bySite = data.charts[chart.id] ?? {}

  return Object.entries(bySite)
    .map(([siteId, byYear]) => {
      const columns = data.years
        .filter((year) => byYear[String(year)])
        .map((year) => ({ key: String(year), title: String(year), subtitle: '', year, entry: byYear[String(year)] }))
      const { siteNumber } = columns.at(-1)?.entry ?? {}
      return { siteId, siteNumber, ...siteHeading({ siteId, siteNumber }), columns }
    })
    .filter((site) => site.columns.length > 0)
    .sort(bySiteNumber)
}

// Genus rows grouped Bee, Wasp, Unknown. `chart.genusOrder` lists genera in
// the deck's order; any genus not listed follows its group, in data order.
export function buildGenusGroups(chart, data) {
  const genera = data.charts[chart.generaChartId]?.all ?? []
  const order = chart.genusOrder ?? []
  const rank = (genus) => {
    const index = order.indexOf(genus)
    return index === -1 ? order.length : index
  }

  const groups = []
  for (const { genus, group } of genera) {
    let entry = groups.find((item) => item.group === group)
    if (!entry) {
      entry = { group, genera: [] }
      groups.push(entry)
    }
    entry.genera.push(genus)
  }

  for (const entry of groups) {
    entry.genera = entry.genera
      .map((genus, index) => ({ genus, index }))
      .sort((a, b) => rank(a.genus) - rank(b.genus) || a.index - b.index)
      .map(({ genus }) => genus)
  }
  return groups
}

export function genusState(entry, genus) {
  if (!entry.presentGenera?.includes(genus)) return 'absent'
  return entry.uniqueGenera?.includes(genus) ? 'unique' : 'present'
}

// One condition cell: its state and the text shown in it. Emergence is a
// bonus when recorded; before `chart.emergenceRateFrom` its rate was
// estimated, so the cell says "Recorded" instead of a percentage.
export function conditionCell(chart, column, conditionKey) {
  const condition = column.entry.conditions?.[conditionKey]
  if (!condition) return { state: 'none', text: '—' }

  if (conditionKey === 'emergence') {
    const state = condition.recorded ? 'bonus' : 'none'
    if (column.year < chart.emergenceRateFrom) {
      return { state, text: condition.recorded ? 'Recorded' : '—' }
    }
    return { state, text: condition.rate == null ? '—' : `${condition.rate}%` }
  }

  return {
    state: condition.state ?? 'none',
    text: condition.rate == null ? '—' : `${condition.rate}%`,
  }
}
