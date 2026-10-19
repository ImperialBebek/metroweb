import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { EXPO_OUT_6 } from '../motion'
import { useNavigation } from '../navigation'
import { useTilt } from './useTilt'

export interface PickerOption<T extends string | number> {
  value: T
  label: string
  swatch?: string
}

interface ListPickerProps<T extends string | number> {
  header: string
  options: PickerOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  // Full mode replaces inline expansion, like the accent picker on the phone.
  onOpenFullMode?: () => void
}

const ITEM_HEIGHT = 44
const EXPAND_DURATION = 250

function Swatch({ color }: { color: string }) {
  return <span className="picker-swatch" style={{ background: color }} />
}

export function ListPicker<T extends string | number>({
  header,
  options,
  value,
  onChange,
  disabled = false,
  onOpenFullMode,
}: ListPickerProps<T>) {
  const id = useId()
  const { registerBackHandler } = useNavigation()
  const [expanded, setExpanded] = useState(false)
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  useEffect(() => {
    if (!expanded) return
    return registerBackHandler(() => {
      setExpanded(false)
      return true
    })
  }, [expanded, registerBackHandler])

  const open = () => {
    if (disabled) return
    if (onOpenFullMode) onOpenFullMode()
    else setExpanded(true)
  }
  const { ref, handlers } = useTilt<HTMLButtonElement>(open, !disabled && !expanded)

  const optionCount = options.length
  const expandRef = useCallback(
    (el: HTMLDivElement | null) => {
      el?.animate([{ height: `${ITEM_HEIGHT}px` }, { height: `${optionCount * ITEM_HEIGHT}px` }], {
        duration: EXPAND_DURATION,
        easing: EXPO_OUT_6,
      })
    },
    [optionCount],
  )

  const label = (o: PickerOption<T>): ReactNode => (
    <>
      {o.swatch && <Swatch color={o.swatch} />}
      {o.label}
    </>
  )

  return (
    <div className="picker" data-disabled={disabled}>
      <div className="picker-header" id={`${id}-label`}>
        {header}
      </div>
      {expanded ? (
        <div
          className="picker-box"
          data-expanded
          role="listbox"
          aria-labelledby={`${id}-label`}
          style={{ height: options.length * ITEM_HEIGHT }}
          ref={expandRef}
        >
          {options.map((o) => (
            <PickerRow
              key={String(o.value)}
              selected={o.value === value}
              onPick={() => {
                onChange(o.value)
                setExpanded(false)
              }}
            >
              {label(o)}
            </PickerRow>
          ))}
        </div>
      ) : (
        <button
          type="button"
          ref={ref}
          {...handlers}
          className="picker-box"
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          style={{ height: ITEM_HEIGHT }}
          onClick={(e) => {
            if (e.detail === 0) open()
          }}
        >
          <span className="picker-row">{label(options[selectedIndex])}</span>
        </button>
      )}
    </div>
  )
}

function PickerRow({ selected, onPick, children }: { selected: boolean; onPick: () => void; children: ReactNode }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onPick)
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      ref={ref}
      {...handlers}
      className="picker-row"
      data-selected={selected}
      style={{ height: ITEM_HEIGHT }}
      onClick={(e) => {
        if (e.detail === 0) onPick()
      }}
    >
      {children}
    </button>
  )
}
