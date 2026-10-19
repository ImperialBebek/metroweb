import { useTilt } from '../../components/useTilt'
import { PhIcon } from '../../icons/PhIcon'

// PhoneTextBox: filled while idle, white with an accent border while editing.
export function TextBox({
  header,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  header: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  return (
    <label className="calendar-field">
      <span className="calendar-field-header">{header}</span>
      {multiline ? (
        <textarea
          className="calendar-textbox"
          data-multiline
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="calendar-textbox"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      )}
    </label>
  )
}

export function CheckBox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onToggle)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      ref={ref}
      {...handlers}
      className="calendar-check"
      onClick={(e) => {
        if (e.detail === 0) onToggle()
      }}
    >
      <span className="calendar-check-box" aria-hidden>
        {checked && (
          <PhIcon name="check-bold" size={20} />
        )}
      </span>
    </button>
  )
}
