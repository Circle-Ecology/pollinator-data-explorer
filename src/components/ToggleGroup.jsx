// A row of pressed/unpressed buttons for picking one option.
function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="toggle-group">
      <span className="toggle-group-label" aria-hidden="true">
        {label}
      </span>

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="toggle-group-button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default ToggleGroup
