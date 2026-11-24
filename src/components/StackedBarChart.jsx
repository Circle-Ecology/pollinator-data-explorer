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
import {
  getChartMinWidth,
  getValueAxisProps,
  legendOrderBySeries,
  tooltipOrderTopFirst,
} from '../utils/stackedBarOptions'

// Matches theme_pollinator_v01.R: Poppins in near-black, no gridlines or
// axis lines.
const AXIS_TICK = {
  fill: brandColors.black,
  fontSize: 12,
  fontFamily: brandFonts.body,
}

// Long site names are angled once there are more bars than fit side by side.
// Angled labels get room by their length, so a long one such as "Sandstone
// Ranch Nature Area (Site 4)" does not run into the legend (US-39).
const ANGLE_LABELS_ABOVE = 4
const ANGLED_LABEL_MIN_PX = 150
const ANGLED_LABEL_PX_PER_CHAR = 5

function StackedBarChart({ chart, rows, measure }) {
  const isPercent = measure === 'percent'
  const angled = rows.length > ANGLE_LABELS_ABOVE
  const minWidth = getChartMinWidth(rows.length)
  const longestLabel = Math.max(0, ...rows.map((row) => String(row.category).length))
  const labelHeight = angled
    ? Math.max(ANGLED_LABEL_MIN_PX, longestLabel * ANGLED_LABEL_PX_PER_CHAR)
    : 30

  const data = rows.map((row) => ({
    category: row.category,
    ...(isPercent ? row.percents : row.counts),
  }))

  const formatValue = (value) =>
    isPercent ? `${value}%` : value.toLocaleString()

  // The chart is a picture for sighted visitors; the data table below
  // carries the same numbers for screen readers. A wide chart scrolls inside
  // this box, which is then focusable so keyboard users can scroll it too.
  return (
    <div
      className="stacked-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
      tabIndex={minWidth ? 0 : undefined}
    >
      <div className="stacked-bar-chart-inner" style={{ minWidth }}>
        <ResponsiveContainer width="100%" height={angled ? 270 + labelHeight : 320}>
          <BarChart
            data={data}
            accessibilityLayer={false}
            // Angled labels hang left of their bar, so leave room for the first.
            margin={{ top: 8, right: 8, bottom: angled ? 24 : 0, left: angled ? 72 : 0 }}
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
              // Shares of the whole chart (percentBase: 'chart') are small, so
              // their axis fits the data instead of running to 100%.
              {...getValueAxisProps(isPercent && chart.percentBase !== 'chart')}
              tickFormatter={formatValue}
              width={56}
            />
            <Tooltip
              itemSorter={tooltipOrderTopFirst(chart.series)}
              // null = series not recorded in that bar's year (see buildChartRows).
              formatter={(value) =>
                value === null || value === undefined
                  ? strings.dashboardNotRecorded
                  : formatValue(value)
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
                stackId="stack"
                fill={series.color}
                // A thin outline keeps light segments visible on white.
                stroke={brandColors.darkGray}
                strokeWidth={1}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default StackedBarChart
