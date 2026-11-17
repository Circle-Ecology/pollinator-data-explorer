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
import { legendOrderBySeries } from '../utils/stackedBarOptions'

// US-33: side-by-side bars per level (e.g. Bee and Wasp sealed nest rates
// for Log and Snag), styled like StackedBarChart.
const AXIS_TICK = {
  fill: brandColors.black,
  fontSize: 12,
  fontFamily: brandFonts.body,
}

// Long labels are angled once there are more groups than fit side by side.
const ANGLE_LABELS_ABOVE = 4

function GroupedBarChart({ chart, rows }) {
  const angled = rows.length > ANGLE_LABELS_ABOVE

  // Bars are drawn from the rate; the tooltip also shows sealed / available.
  const data = rows.map((row) => {
    const entry = { category: row.category, available: row.available }
    for (const series of chart.series) {
      entry[series.key] = row.values[series.key].rate
      entry[`${series.key}Sealed`] = row.values[series.key].sealed
    }
    return entry
  })

  return (
    <div
      className="stacked-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <ResponsiveContainer width="100%" height={angled ? 400 : 320}>
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
            height={angled ? 90 : 30}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}%`}
            width={64}
            label={{
              value: strings.dashboardRateAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { ...AXIS_TICK, textAnchor: 'middle' },
            }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              const series = chart.series.find((entry) => entry.label === name)
              const sealed = item.payload[`${series?.key}Sealed`]
              return `${value}% (${sealed} of ${item.payload.available.toLocaleString()})`
            }}
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
