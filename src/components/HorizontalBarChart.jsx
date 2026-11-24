import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brandColors, brandFonts } from '../content/brandColors'
import { strings } from '../content/strings'

// US-32: horizontal bars for long labels such as genus names, one bar per
// row, biggest first (rows arrive in display order). Two forms, set by the
// config:
// - chart.facetSeries: rows are grouped by `row.facet` (e.g. occupant type)
//   with a gap between groups, and each bar takes its group's color
//   (Occupants by Occupant Type and General ID).
// - otherwise each bar is stacked from chart.series (e.g. the occupant types
//   behind one genus, Occupants by General ID).
// The total is printed at the end of each bar, as in the deck.

// Matches theme_pollinator_v01.R: Poppins in near-black, no gridlines or
// axis lines.
const AXIS_TICK = {
  fill: brandColors.black,
  fontSize: 12,
  fontFamily: brandFonts.body,
}

const BAR_SLOT_PX = 26
const AXIS_AND_MARGIN_PX = 48
const LABEL_PX_PER_CHAR = 6.5
const MAX_LABEL_PX = 200

const round1 = (value) => Math.round(value * 10) / 10
// Data field holding the bar total, on the series whose segment ends the bar.
const TOTAL_SUFFIX = 'Total'

function HorizontalBarChart({ chart, rows, measure }) {
  const isPercent = measure === 'percent'
  const facetColors = Object.fromEntries(
    (chart.facetSeries ?? []).map((series) => [series.key, series.color])
  )
  const legendItems = chart.facetSeries ?? chart.series

  const formatValue = (value) =>
    value === null || value === undefined
      ? strings.dashboardNotRecorded
      : isPercent
        ? `${value}%`
        : value.toLocaleString()

  // One data point per bar; an empty spacer row between facet groups.
  const data = []
  rows.forEach((row, index) => {
    if (chart.facetSeries && index > 0 && rows[index - 1].facet !== row.facet) {
      data.push({ key: `gap-${index}`, label: '' })
    }
    const values = isPercent ? row.percents : row.counts
    const total = isPercent
      ? round1(Object.values(values).reduce((sum, value) => sum + (value ?? 0), 0))
      : row.total
    // The total is printed after the bar's last non-empty segment: Recharts
    // draws no label on a zero-width segment.
    const endSeries = chart.series.findLast((series) => values[series.key] > 0)?.key
    data.push({
      key: `${row.facet ?? ''}|${row.category}`,
      label: row.category,
      facet: row.facet,
      ...values,
      ...(endSeries && { [`${endSeries}${TOTAL_SUFFIX}`]: total }),
    })
  })

  const longestLabel = Math.max(0, ...rows.map((row) => row.category.length))
  const labelWidth = Math.min(MAX_LABEL_PX, Math.round(longestLabel * LABEL_PX_PER_CHAR) + 12)

  return (
    <div
      className="horizontal-bar-chart"
      role="img"
      aria-label={`${chart.title}. The data table below lists every value.`}
    >
      <ResponsiveContainer width="100%" height={data.length * BAR_SLOT_PX + AXIS_AND_MARGIN_PX}>
        <BarChart
          data={data}
          layout="vertical"
          accessibilityLayer={false}
          barCategoryGap={4}
          margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="key"
            tickFormatter={(key) => data.find((point) => point.key === key)?.label ?? ''}
            width={labelWidth}
            interval={0}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(key) => data.find((point) => point.key === key)?.label ?? ''}
            formatter={formatValue}
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
              // A thin outline keeps light segments visible on white.
              stroke={brandColors.darkGray}
              strokeWidth={1}
              isAnimationActive={false}
            >
              {chart.facetSeries &&
                data.map((point) => (
                  <Cell key={point.key} fill={facetColors[point.facet] ?? series.color} />
                ))}
              <LabelList
                dataKey={`${series.key}${TOTAL_SUFFIX}`}
                content={({ x, y, width, height, value }) =>
                  value !== undefined && value !== null && (
                    <text
                      x={x + width + 6}
                      y={y + height / 2}
                      dominantBaseline="central"
                      className="horizontal-bar-total"
                      {...AXIS_TICK}
                    >
                      {formatValue(value)}
                    </text>
                  )
                }
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Visual key only: the data table below names each bar's type. */}
      <ul className="faceted-chart-legend">
        {legendItems.map((item) => (
          <li key={item.key}>
            <span className="faceted-chart-swatch" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default HorizontalBarChart
