import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../components/modal'
import { usePopupLayer } from '../../components/popupLayer'
import { prefersReducedMotion, swivel } from '../../motion'
import { useNavigation } from '../../navigation'

export interface MessageBoxButton {
  label: string
  onTap?: () => void
}

// The shell MessageBox: a chrome-coloured panel that swivels down from the top
// over a dimmed page. Back dismisses it like the last button would without its action.
export function MessageBox({
  caption,
  message,
  buttons,
  onDismissed,
}: {
  caption: string
  message?: string
  buttons: MessageBoxButton[]
  onDismissed: () => void
}) {
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const box = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const unregisterBack = useRef(() => {})
  const onDismissedRef = useRef(onDismissed)
  useLayoutEffect(() => {
    onDismissedRef.current = onDismissed
  })
  useModal(box)

  const close = useCallback((action?: () => void) => {
    if (closing.current) return
    closing.current = true
    const done = () => {
      // The action may press Back itself (delete, then leave the page), which
      // this box must no longer swallow.
      unregisterBack.current()
      onDismissedRef.current()
      action?.()
    }
    if (!box.current || prefersReducedMotion()) return done()
    scrim.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
    swivel(box.current, 'out').finished.then(done, done)
  }, [])

  useLayoutEffect(() => {
    if (!box.current || prefersReducedMotion()) return
    scrim.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
    const anim = swivel(box.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [])

  useEffect(() => {
    const unregister = registerBackHandler(() => {
      close()
      return true
    })
    unregisterBack.current = unregister
    return unregister
  }, [registerBackHandler, close])

  if (!layer) return null
  return createPortal(
    <div className="messaging-msgbox-scrim" ref={scrim}>
      <div className="messaging-msgbox" ref={box} role="alertdialog" aria-modal aria-label={caption}>
        <div className="messaging-msgbox-caption">{caption}</div>
        {message && <div className="messaging-msgbox-message">{message}</div>}
        <div className="messaging-msgbox-buttons">
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              className="messaging-msgbox-button"
              onClick={() => close(b.onTap)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    layer,
  )
}
