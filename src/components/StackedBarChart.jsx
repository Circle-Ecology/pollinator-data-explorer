import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors } from '../content/brandColors'

const AXIS_TICK = { fill: brandColors.lightGray, fontSize: 12 }

// Long site names are angled once there are more bars than fit side by side.
const ANGLE_LABELS_ABOVE = 4

function StackedBarChart({ chart, rows, measure }) {
  const isPercent = measure === 'percent'
  const angled = rows.length > ANGLE_LABELS_ABOVE

  const data = rows.map((row) => ({
    category: row.category,
    ...(isPercent ? row.percents : row.counts),
  }))

  const formatValue = (value) =>
    isPercent ? `${value}%` : value.toLocaleString()

  // The chart is a picture for sighted visitors; the data table below
  // carries the same numbers for screen readers.
  return (
    <div
      className="stacked-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <ResponsiveContainer width="100%" height={angled ? 420 : 320}>
        <BarChart
          data={data}
          accessibilityLayer={false}
          // Angled labels hang left of their bar, so leave room for the first.
          margin={{ top: 8, right: 8, bottom: angled ? 24 : 0, left: angled ? 72 : 0 }}
        >
          <CartesianGrid vertical={false} stroke="rgba(224, 224, 220, 0.15)" />
          <XAxis
            dataKey="category"
            tick={AXIS_TICK}
            interval={0}
            angle={angled ? -45 : 0}
            textAnchor={angled ? 'end' : 'middle'}
            height={angled ? 150 : 30}
          />
          <YAxis
            tick={AXIS_TICK}
            domain={isPercent ? [0, 100] : [0, 'auto']}
            tickFormatter={formatValue}
            width={56}
          />
          <Tooltip
            formatter={(value) => formatValue(value)}
            cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
            contentStyle={{
              background: brandColors.darkBlue,
              border: `1px solid ${brandColors.darkGray}`,
              color: brandColors.white,
            }}
            labelStyle={{ color: brandColors.white, fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ color: brandColors.lightGray }} />
          {chart.series.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="stack"
              fill={series.color}
              // A thin background-colored edge keeps stacked segments apart.
              stroke={brandColors.darkBlue}
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StackedBarChart
