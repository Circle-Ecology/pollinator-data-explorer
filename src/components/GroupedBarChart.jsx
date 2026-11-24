import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'
import { strings } from '../content/strings'
import { formatRateTooltip } from '../utils/rateChartRows'
import { legendOrderBySeries } from '../utils/stackedBarOptions'

// US-33: side-by-side bars per level (e.g. Bee and Wasp sealed nest rates
// for Log and Snag), styled like StackedBarChart. US-34: a chart whose
// measures are ['count'] draws counts instead (e.g. nests per status), and a
// row's `label`, when present, is shown under its bars instead of its
// category (e.g. "Site 1" rather than the full site name).
// `chart.axisLabel` overrides the y-axis label.
const AXIS_TICK = {
  fill: brandColors.black,
  fontSize: 12,
  fontFamily: brandFonts.body,
}

// Long labels are angled once there are more groups than fit side by side.
const ANGLE_LABELS_ABOVE = 4
// Room under the bars for angled labels: at least 90px, more for long labels
// (e.g. "Chalkbrood Characteristics") so they don't run into the legend.
const ANGLED_LABEL_MIN_PX = 90
const ANGLED_LABEL_PX_PER_CHAR = 5

function GroupedBarChart({ chart, rows }) {
  const angled = rows.length > ANGLE_LABELS_ABOVE
  const isRate = chart.measures.includes('rate')

  // Rate bars are drawn from the rate; the tooltip also shows sealed / available.
  const data = rows.map((row) => {
    const entry = { category: row.label ?? row.category, available: row.available }
    for (const series of chart.series) {
      const values = row.values[series.key]
      entry[series.key] = isRate ? values.rate : values.count
      if (isRate) entry[`${series.key}Sealed`] = values.sealed
    }
    return entry
  })
  const longestLabel = Math.max(...data.map((entry) => String(entry.category).length))
  const labelHeight = angled
    ? Math.max(ANGLED_LABEL_MIN_PX, longestLabel * ANGLED_LABEL_PX_PER_CHAR)
    : 30

  return (
    <div
      className="stacked-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <ResponsiveContainer width="100%" height={angled ? 310 + labelHeight : 320}>
        <BarChart
          data={data}
          accessibilityLayer={false}
          barGap={4}
          // Angled labels hang left of their bar, so leave room for the first.
          margin={{ top: 8, right: 8, bottom: angled ? 24 : 0, left: angled ? 48 : 8 }}
        >
          <XAxis
            dataKey="category"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={angled ? -45 : 0}
            textAnchor={angled ? 'end' : 'middle'}
            height={labelHeight}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(value) => (isRate ? `${value}%` : value.toLocaleString())}
            width={64}
            allowDecimals={false}
            label={{
              value: chart.axisLabel ?? strings.dashboardRateAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { ...AXIS_TICK, textAnchor: 'middle' },
            }}
          />
          <Tooltip
            formatter={(value, _name, item) =>
              isRate ? formatRateTooltip(value, item) : value.toLocaleString()
            }
            cursor={{ fill: 'rgba(34, 47, 71, 0.06)' }}
            contentStyle={{
              background: brandColors.white,
              border: `1px solid ${brandColors.lightGray}`,
              color: brandColors.black,
              fontFamily: brandFonts.body,
            }}
            labelStyle={{ color: brandColors.black, fontWeight: 600 }}
          />
          {/* Recharts colors legend text like its bar; keep it readable. */}
          <Legend
            formatter={(value) => (
              <span style={{ color: brandColors.black }}>{value}</span>
            )}
            itemSorter={legendOrderBySeries(chart.series)}
            wrapperStyle={{ fontFamily: brandFonts.body, fontSize: 13 }}
          />
          {chart.series.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={series.color}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default GroupedBarChart
