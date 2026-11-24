import { useId, useState } from 'react'
import { strings } from '../content/strings'
import {
  buildGenusGroups,
  conditionCell,
  genusState,
} from '../utils/scorecardRows'

// US-35: the deck's Site Scorecard grid as a real table: genus rows grouped
// Bee / Wasp / Unknown, then condition rows, then Final Score and Category,
// with one column per site (All Sites) or per year (One Site Across Years).
// Every cell state is in text or an icon as well as its color, and the row
// labels stay fixed while the columns scroll on narrow screens.

const GENUS_CELLS = {
  present: { icon: '✓', label: strings.scorecardPresent },
  unique: { icon: '★', label: strings.scorecardUnique },
  absent: { icon: '', label: strings.scorecardAbsent },
}

const CONDITION_LABELS = {
  bonus: strings.scorecardBonus,
  flag: strings.scorecardFlag,
}

function VisuallyHidden({ children }) {
  return <span className="scorecard-sr-only">{children}</span>
}

function GenusCell({ state }) {
  const { icon, label } = GENUS_CELLS[state]
  return (
    <td className={`scorecard-cell scorecard-${state}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <VisuallyHidden>{label}</VisuallyHidden>
    </td>
  )
}

// A flag shows ⚑ before the rate, a bonus +1 after it.
function ConditionCell({ state, text }) {
  const label = CONDITION_LABELS[state]
  return (
    <td className={`scorecard-cell scorecard-${label ? state : 'absent'}`}>
      {state === 'flag' && <span aria-hidden="true">⚑ </span>}
      {text}
      {state === 'bonus' && <span aria-hidden="true" className="scorecard-marker"> +1</span>}
      {label && <VisuallyHidden>, {label}</VisuallyHidden>}
    </td>
  )
}

function ScorecardLegend() {
  return (
    <ul className="scorecard-legend" aria-label={strings.scorecardLegendLabel}>
      {strings.scorecardLegend.map(({ state, icon, text }) => (
        <li key={state}>
          <span className={`scorecard-swatch scorecard-${state}`} aria-hidden="true">
            {icon}
          </span>
          {text}
        </li>
      ))}
    </ul>
  )
}

export function ScorecardGrid({ chart, data, columns, caption }) {
  const groups = buildGenusGroups(chart, data)

  return (
    <>
      <div
        className="scorecard-scroll"
        role="region"
        aria-label={`${caption}, ${strings.scorecardScrollHint}`}
        tabIndex={0}
      >
        <table className="scorecard-table">
          <caption className="scorecard-caption">{caption}</caption>
          <thead>
            <tr>
              <td className="scorecard-label" />
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.title}
                  {column.subtitle && <span className="scorecard-subtitle">{column.subtitle}</span>}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map(({ group, genera }) => (
            <tbody key={group} className="scorecard-group">
              <tr>
                <th scope="rowgroup" colSpan={columns.length + 1} className="scorecard-group-heading">
                  <span className="scorecard-label">{group}</span>
                </th>
              </tr>
              {genera.map((genus) => (
                <tr key={genus}>
                  <th scope="row" className="scorecard-label">{genus}</th>
                  {columns.map((column) => (
                    <GenusCell key={column.key} state={genusState(column.entry, genus)} />
                  ))}
                </tr>
              ))}
            </tbody>
          ))}

          <tbody className="scorecard-group">
            <tr>
              <th scope="rowgroup" colSpan={columns.length + 1} className="scorecard-group-heading">
                <span className="scorecard-label">{strings.scorecardConditionsGroup}</span>
              </th>
            </tr>
            {chart.conditions.map((condition) => (
              <tr key={condition.key}>
                <th scope="row" className="scorecard-label">{condition.label}</th>
                {columns.map((column) => (
                  <ConditionCell key={column.key} {...conditionCell(chart, column, condition.key)} />
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="scorecard-label">{strings.scorecardFinalScore}</th>
              {columns.map(({ key, entry }) => (
                <td key={key} className="scorecard-total">{`${entry.score} / ${entry.max}`}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="scorecard-label">{strings.scorecardCategory}</th>
              {columns.map(({ key, entry }) => (
                <td key={key} className="scorecard-total">
                  {entry.category}
                  {entry.flagged && <span className="scorecard-subtitle">{` ${strings.scorecardFlagged}`}</span>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <ScorecardLegend />
    </>
  )
}

// All Sites: `rows` are the site columns for the selected year.
function SiteScorecardTable({ chart, data, rows, year }) {
  return (
    <ScorecardGrid
      chart={chart}
      data={data}
      columns={rows}
      caption={`${chart.title} (${year})`}
    />
  )
}

// One Site Across Years: `rows` are the sites, each with its year columns;
// a select picks which site to show.
export function SiteScorecardOverYears({ chart, data, rows }) {
  const selectId = useId()
  const [siteId, setSiteId] = useState(rows[0].siteId)
  const site = rows.find((item) => item.siteId === siteId) ?? rows[0]
  const name = site.subtitle ? `${site.title}, ${site.subtitle}` : site.title

  return (
    <>
      <div className="scorecard-site-select">
        <label htmlFor={selectId}>{strings.scorecardSiteLabel}</label>
        <select id={selectId} value={site.siteId} onChange={(event) => setSiteId(event.target.value)}>
          {rows.map((item) => (
            <option key={item.siteId} value={item.siteId}>
              {item.subtitle ? `${item.title}: ${item.subtitle}` : item.title}
            </option>
          ))}
        </select>
      </div>
      <ScorecardGrid
        chart={chart}
        data={data}
        columns={site.columns}
        caption={`Site Scorecard: ${name} Across Years`}
      />
    </>
  )
}

export default SiteScorecardTable
