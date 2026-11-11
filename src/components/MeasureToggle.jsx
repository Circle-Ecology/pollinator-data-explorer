import { strings } from '../content/strings'
import ToggleGroup from './ToggleGroup'

const MEASURE_LABELS = {
  count: strings.dashboardMeasureCount,
  percent: strings.dashboardMeasurePercent,
}

function MeasureToggle({ measures, value, onChange }) {
  return (
    <ToggleGroup
      label={strings.dashboardMeasureLabel}
      options={measures.map((measure) => ({
        value: measure,
        label: MEASURE_LABELS[measure],
      }))}
      value={value}
      onChange={onChange}
    />
  )
}

export default MeasureToggle
