
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'

function MultiGenusBarChart({ chart, rows }) {
  // Use the multi-genus cavity counts from the existing dataset.
  const data = rows.map((row) => ({
    category: row.category,
    value: row.total,
  }))

  // Adjust the label width for longer site names.
  const longestLabel = Math.max(
    0,
    ...data.map((row) => String(row.category).length),
  )

  const labelWidth = Math.max(190, longestLabel * 9 + 20)

  // Match the dashboard's font and axis styling.
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
      className="multi-genus-bar-chart"
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
            allowDecimals={false}
            domain={[0, 'auto']}
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
            formatter={(value) =>
              Number(value).toLocaleString()
            }
            contentStyle={tooltipStyle}
            cursor={{
              fill: brandColors.lightGray,
              fillOpacity: 0.3,
            }}
          />

          <Bar
            dataKey="value"
            name="Multi-genus cavities"
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

export default MultiGenusBarChart
