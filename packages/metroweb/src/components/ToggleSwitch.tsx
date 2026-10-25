import { useId, useRef, useState, type PointerEvent } from 'react'
import { EXPO_OUT_15, prefersReducedMotion } from '../motion.ts'

interface ToggleSwitchProps {
  header?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  onLabel?: string
  offLabel?: string
}

const TRACK_WIDTH = 88
const THUMB_WIDTH = 20
const TRAVEL = TRACK_WIDTH - THUMB_WIDTH
// 2px border plus the 4px gap between the border and the accent fill.
const FILL_INSET = 6
const TAP_SLOP = 6

export function ToggleSwitch({
  header,
  checked,
  onChange,
  disabled = false,
  onLabel = 'On',
  offLabel = 'Off',
}: ToggleSwitchProps) {
  const id = useId()
  const [dragX, setDragX] = useState<number | null>(null)
  const drag = useRef<{ pointerId: number; startX: number; origin: number; scale: number; moved: boolean } | null>(null)

  const position = dragX ?? (checked ? TRAVEL : 0)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return
    const el = e.currentTarget
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      origin: checked ? TRAVEL : 0,
      scale: el.getBoundingClientRect().width / el.offsetWidth || 1,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const delta = (e.clientX - d.startX) / d.scale
    if (!d.moved && Math.abs(delta) < TAP_SLOP) return
    d.moved = true
    setDragX(Math.max(0, Math.min(TRAVEL, d.origin + delta)))
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (!d.moved) {
      onChange(!checked)
    } else if (dragX !== null) {
      const next = dragX > TRAVEL / 2
      if (next !== checked) onChange(next)
    }
    setDragX(null)
  }

  const transition =
    dragX === null && !prefersReducedMotion() ? `transform 500ms ${EXPO_OUT_15}, width 500ms ${EXPO_OUT_15}` : 'none'

  return (
    <div className="toggle" data-disabled={disabled} data-feather>
      {header && (
        <div className="toggle-header" id={`${id}-label`}>
          {header}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={header ? `${id}-label` : undefined}
        disabled={disabled}
        className="toggle-row"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null
          setDragX(null)
        }}
        onClick={(e) => {
          // Keyboard activation only; pointer taps are handled on pointerup.
          if (e.detail === 0) onChange(!checked)
        }}
      >
        <span className="toggle-state">{checked ? onLabel : offLabel}</span>
        <span className="toggle-track" aria-hidden>
          <span className="toggle-fill" style={{ width: Math.max(0, position - FILL_INSET), transition }} />
          <span className="toggle-thumb" style={{ transform: `translateX(${position}px)`, transition }} />
        </span>
      </button>
    </div>
  )
}
