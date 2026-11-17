
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'

const TYPE_COLORS = {
  Bee: brandColors.bee,
  Wasp: brandColors.wasp,
  Other: brandColors.other,
  Unknown: brandColors.unknown,
}

const TYPE_ORDER = {
  Bee: 0,
  Wasp: 1,
  Other: 2,
  Unknown: 3,
}

function TypeGenusBarChart({ chart, rows, measure }) {
  const isPercent = measure === 'percent'

  // Group by occupant type and sort by count.
  const data = rows
    .map((row) => ({
      occupantType: row.occupantType,
      category: row.category,
      label: `${row.occupantType} - ${row.category}`,
      total: row.total,
      value: isPercent ? row.percent : row.total,
    }))
    .sort((a, b) => {
      const typeDifference =
        (TYPE_ORDER[a.occupantType] ?? 4) -
        (TYPE_ORDER[b.occupantType] ?? 4)

      return (
        typeDifference ||
        b.total - a.total ||
        a.category.localeCompare(b.category)
      )
    })

  // Allow more space for longer labels.
  const longestLabel = Math.max(
    0,
    ...data.map((row) => row.label.length),
  )

  const labelWidth = Math.max(220, longestLabel * 9 + 20)

  // Format values for Count and Percentage modes.
  const formatValue = (value) =>
    isPercent ? `${value}%` : Number(value).toLocaleString()

  const axisTick = {
    fill: brandColors.black,
    fontFamily: brandFonts.body,
    fontSize: 12,
  }

  const tooltipStyle = {
    backgroundColor: brandColors.white,
    border: `1px solid ${brandColors.lightGray}`,
    color: brandColors.black,
    fontFamily: brandFonts.body,
    fontSize: 12,
  }

  return (
    <div
      className="type-genus-bar-chart"
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
            dataKey="label"
            width={labelWidth}
            interval={0}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={formatValue}
            contentStyle={tooltipStyle}
            cursor={{ fill: brandColors.lightGray, fillOpacity: 0.3 }}
          />

          <Bar
            dataKey="value"
            name="Occupants"
            isAnimationActive={false}
            stroke={brandColors.darkGray}
            strokeWidth={1}
          >
            {data.map((row, index) => (
              <Cell
                key={`${row.label}-${index}`}
                fill={
                  TYPE_COLORS[row.occupantType] ??
                  brandColors.unknown
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TypeGenusBarChart
