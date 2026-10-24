import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion, scrimFade, swivel } from '../motion.ts'
import { useNavigation } from '../navigation.tsx'
import { useModal } from './modal.ts'
import { usePopupLayer } from './popupLayer.ts'
import { useTilt } from './useTilt.ts'

export interface MessageBoxButton {
  label: string
  onTap?: () => void
}

function BoxButton({ label, onTap }: { label: string; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="msgbox-button"
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      {label}
    </button>
  )
}

// The shell MessageBox: a chrome-coloured panel that swivels down from the top
// over a dimmed screen. Back dismisses it as the last button would, without
// running that button's action. Once it has closed, `onDismissed` runs, then
// the tapped button's `onTap`.
export function MessageBox({
  caption,
  message,
  buttons,
  onDismissed,
}: {
  caption: string
  message?: ReactNode
  buttons: MessageBoxButton[]
  onDismissed: () => void
}) {
  const id = useId()
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const box = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const onDismissedRef = useRef(onDismissed)
  useLayoutEffect(() => {
    onDismissedRef.current = onDismissed
  })
  useModal(box)

  const close = useCallback((action?: () => void) => {
    if (closing.current) return
    closing.current = true
    const done = () => {
      onDismissedRef.current()
      action?.()
    }
    if (!box.current || prefersReducedMotion()) return done()
    if (scrim.current) scrimFade(scrim.current, 'out')
    swivel(box.current, 'out').finished.then(done, done)
  }, [])

  useLayoutEffect(() => {
    if (!box.current || prefersReducedMotion()) return
    if (scrim.current) scrimFade(scrim.current, 'in')
    const anim = swivel(box.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [layer])

  useEffect(
    () =>
      registerBackHandler(() => {
        // Once closing, Back belongs to the page again, so an action can leave it.
        if (closing.current) return false
        close()
        return true
      }),
    [registerBackHandler, close],
  )

  if (!layer) return null
  return createPortal(
    <div className="msgbox-scrim" ref={scrim}>
      <div
        className="msgbox"
        ref={box}
        role="alertdialog"
        aria-modal
        aria-labelledby={`${id}-caption`}
        aria-describedby={message ? `${id}-message` : undefined}
      >
        <div className="msgbox-caption" id={`${id}-caption`}>
          {caption}
        </div>
        {message && (
          <div className="msgbox-message" id={`${id}-message`}>
            {message}
          </div>
        )}
        <div className="msgbox-buttons">
          {buttons.map((b) => (
            <BoxButton key={b.label} label={b.label} onTap={() => close(b.onTap)} />
          ))}
        </div>
      </div>
    </div>,
    layer,
  )
}
