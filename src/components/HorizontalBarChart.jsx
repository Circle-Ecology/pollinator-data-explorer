
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'

function HorizontalBarChart({ chart, rows, measure }) {
  const isPercent = measure === 'percent'

  // Sort genera from highest to lowest count.
  const data = rows
    .map((row) => ({
      category: row.category,
      value: isPercent ? row.percent : row.total,
      total: row.total,
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.category.localeCompare(b.category),
    )

  // Adjust label width for longer genus names.
  const longestLabel = Math.max(
    0,
    ...data.map((row) => String(row.category).length),
  )

  const labelWidth = Math.max(190, longestLabel * 9 + 20)

  // Format count or percentage values.
  const formatValue = (value) =>
    isPercent ? `${value}%` : Number(value).toLocaleString()

  // Match the dashboard's existing font and axis styling.
  const axisTick = {
    fill: brandColors.black,
    fontFamily: brandFonts.body,
    fontSize: 12,
  }

  // Match the dashboard's tooltip styling.
  const tooltipStyle = {
    backgroundColor: brandColors.white,
    border: `1px solid ${brandColors.lightGray}`,
    color: brandColors.black,
    fontFamily: brandFonts.body,
    fontSize: 12,
  }

  return (
    <div
      className="horizontal-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <ResponsiveContainer
        width="100%"
        height={Math.max(320, data.length * 38)}
      >
        <BarChart
          data={data}
          layout="vertical"
          accessibilityLayer={false}
          margin={{
            top: 10,
            right: 30,
            bottom: 10,
            left: 20,
          }}
        >
          <XAxis
            type="number"
            domain={isPercent ? [0, 100] : [0, 'auto']}
            tickFormatter={formatValue}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="category"
            width={labelWidth}
            interval={0}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={formatValue}
            contentStyle={tooltipStyle}
            cursor={{
              fill: brandColors.lightGray,
              fillOpacity: 0.3,
            }}
          />

          <Bar
            dataKey="value"
            name="Occupants"
            fill={brandColors.occupied}
            stroke={brandColors.darkGray}
            strokeWidth={1}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HorizontalBarChart
