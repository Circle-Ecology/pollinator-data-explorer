import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'
import { getFacets, getSharedAxis } from '../utils/facetedChartRows'
import { tooltipOrderTopFirst } from '../utils/stackedBarOptions'

// US-33: one small stacked bar chart per facet (e.g. per cavity diameter),
// side by side with a single shared y-axis so heights compare across panels.
const AXIS_TICK = {
  fill: brandColors.black,
  fontSize: 12,
  fontFamily: brandFonts.body,
}

const PANEL_HEIGHT = 300
const Y_AXIS_WIDTH = 40

function FacetedStackedBarChart({ chart, rows }) {
  const facets = getFacets(rows)
  const { domain, ticks } = getSharedAxis(rows)

  return (
    <div
      className="faceted-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <div className="faceted-chart-panels">
        {facets.map((facet, index) => {
          const data = rows
            .filter((row) => row.facet === facet)
            .map((row) => ({ label: row.label, name: row.category, ...row.counts }))
          const showAxis = index === 0

          return (
            <div className="faceted-chart-panel" key={facet}>
              <p className="faceted-chart-heading">
                {facet}
                {chart.facetUnit ?? ''}
              </p>
              <ResponsiveContainer width="100%" height={PANEL_HEIGHT}>
                <BarChart data={data} accessibilityLayer={false} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  {/* Every panel uses the same domain; only the first shows it. */}
                  <YAxis
                    domain={domain}
                    ticks={ticks}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    hide={!showAxis}
                    width={Y_AXIS_WIDTH}
                  />
                  <Tooltip
                    itemSorter={tooltipOrderTopFirst(chart.series)}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                    cursor={{ fill: 'rgba(34, 47, 71, 0.06)' }}
                    contentStyle={{
                      background: brandColors.white,
                      border: `1px solid ${brandColors.lightGray}`,
                      color: brandColors.black,
                      fontFamily: brandFonts.body,
                    }}
                    labelStyle={{ color: brandColors.black, fontWeight: 600 }}
                  />
                  {chart.series.map((series) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.label}
                      stackId="stack"
                      fill={series.color}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>

      {/* One legend for all panels, in stack order. */}
      <ul className="faceted-chart-legend">
        {chart.series.map((series) => (
          <li key={series.key}>
            <span
              className="faceted-chart-swatch"
              style={{ background: series.color }}
              aria-hidden="true"
            />
            {series.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default FacetedStackedBarChart
