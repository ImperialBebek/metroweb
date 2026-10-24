import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion, swivel } from '../motion.ts'
import { useNavigation } from '../navigation.tsx'
import { ACCENTS } from '../theme.ts'
import { useModal } from './modal.ts'
import { useTilt } from './useTilt.ts'

interface AccentPickerProps {
  value: number
  onPick: (index: number) => void
  onClose: () => void
  container: HTMLElement | null
}

// Full-mode list picker: the swatch grid swivels in over the page.
export function AccentPicker({ value, onPick, onClose, container }: AccentPickerProps) {
  const { registerBackHandler } = useNavigation()
  const root = useRef<HTMLDivElement>(null)
  const closing = useRef(false)

  const close = (index?: number) => {
    if (closing.current) return
    closing.current = true
    const el = root.current
    const done = () => {
      if (index !== undefined) onPick(index)
      onClose()
    }
    if (!el || prefersReducedMotion()) return done()
    swivel(el, 'out').finished.then(done)
  }

  useModal(root, '[aria-checked="true"]')
  useLayoutEffect(() => {
    if (root.current && !prefersReducedMotion()) swivel(root.current, 'in')
  }, [])

  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  })
  useEffect(
    () =>
      registerBackHandler(() => {
        closeRef.current()
        return true
      }),
    [registerBackHandler],
  )

  if (!container) return null
  return createPortal(
    <div className="full-picker" ref={root} role="dialog" aria-modal aria-label="Accents">
      <div className="full-picker-header">accents</div>
      <div className="accent-grid" role="radiogroup" aria-label="Accent color">
        {ACCENTS.map((accent, index) => (
          <AccentSwatch
            key={accent.name}
            name={accent.name}
            color={accent.color}
            selected={index === value}
            onTap={() => close(index)}
          />
        ))}
      </div>
    </div>,
    container,
  )
}

function AccentSwatch({
  name,
  color,
  selected,
  onTap,
}: {
  name: string
  color: string
  selected: boolean
  onTap: () => void
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      ref={ref}
      {...handlers}
      className="accent-swatch"
      style={{ background: color }}
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    />
  )
}
