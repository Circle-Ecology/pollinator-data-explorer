import { strings } from '../content/strings'
import ToggleGroup from './ToggleGroup'

// Offers only the years that have data for the chart (never a gap year
// such as 2024).
function YearToggle({ years, value, onChange }) {
  return (
    <ToggleGroup
      label={strings.dashboardYearLabel}
      options={years.map((year) => ({ value: year, label: String(year) }))}
      value={value}
      onChange={onChange}
    />
  )
}

export default YearToggle
