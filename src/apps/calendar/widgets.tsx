import { useTilt } from '../../components/useTilt'
import { PhIcon } from '../../icons/PhIcon'

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
