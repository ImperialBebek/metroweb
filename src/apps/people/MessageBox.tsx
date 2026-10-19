import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePopupLayer } from '../../components/popupLayer'
import { prefersReducedMotion, swivel } from '../../motion'
import { useNavigation } from '../../navigation'
import { useTap } from './useTap'
import './people.css'

function BoxButton({ children, onTap }: { children: ReactNode; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-msgbox-button" {...tap}>
      {children}
    </button>
  )
}

// The shell message box: it swivels down over a dimmed screen, with two equal
// buttons. Back cancels. `onConfirm` runs after it has closed.
export function MessageBox({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClosed,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClosed: () => void
}) {
  const id = useId()
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const box = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const callbacks = useRef({ onConfirm, onClosed })
  useLayoutEffect(() => {
    callbacks.current = { onConfirm, onClosed }
  })

  const close = useCallback((confirmed: boolean) => {
    if (closing.current) return
    closing.current = true
    const done = () => {
      callbacks.current.onClosed()
      if (confirmed) callbacks.current.onConfirm()
    }
    const el = box.current
    if (!el || prefersReducedMotion()) {
      done()
      return
    }
    swivel(el, 'out').finished.then(done, done)
  }, [])

  useLayoutEffect(() => {
    if (!box.current || prefersReducedMotion()) return
    const anim = swivel(box.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [layer])

  useEffect(
    () =>
      registerBackHandler(() => {
        // While closing (for example when onConfirm navigates back) Back belongs to the page again.
        if (closing.current) return false
        close(false)
        return true
      }),
    [registerBackHandler, close],
  )

  if (!layer) return null
  return createPortal(
    <div className="people-msgbox-scrim">
      <div
        className="people-msgbox"
        ref={box}
        role="alertdialog"
        aria-modal
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
      >
        <div className="people-msgbox-title" id={`${id}-title`}>
          {title}
        </div>
        <div className="people-msgbox-text" id={`${id}-text`}>
          {message}
        </div>
        <div className="people-msgbox-buttons">
          <BoxButton onTap={() => close(true)}>{confirmLabel}</BoxButton>
          <BoxButton onTap={() => close(false)}>cancel</BoxButton>
        </div>
      </div>
    </div>,
    layer,
  )
}
