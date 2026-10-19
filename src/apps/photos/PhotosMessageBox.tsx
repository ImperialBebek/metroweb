import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePopupLayer } from '../../components/popupLayer'
import { prefersReducedMotion, swivel } from '../../motion'
import { useNavigation } from '../../navigation'
import './photos.css'

// Shell MessageBox: a chrome-coloured panel at the top of the screen with the
// rest dimmed. Back acts as cancel.
export function PhotosMessageBox({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const panel = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const callbacks = useRef({ onConfirm, onClose })
  useLayoutEffect(() => {
    callbacks.current = { onConfirm, onClose }
  })

  const finish = useCallback((confirmed: boolean) => {
    if (closing.current) return
    closing.current = true
    const done = () => (confirmed ? callbacks.current.onConfirm() : callbacks.current.onClose())
    if (!panel.current || prefersReducedMotion()) return done()
    swivel(panel.current, 'out').finished.then(done, done)
  }, [])

  useLayoutEffect(() => {
    if (!panel.current || prefersReducedMotion()) return
    const anim = swivel(panel.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [])

  useEffect(
    () =>
      registerBackHandler(() => {
        finish(false)
        return true
      }),
    [registerBackHandler, finish],
  )

  if (!layer) return null
  return createPortal(
    <div className="photos-msg-scrim">
      <div className="photos-msg" ref={panel} role="alertdialog" aria-label={title}>
        <div className="photos-msg-title">{title}</div>
        <div className="photos-msg-text">{message}</div>
        <div className="photos-msg-buttons">
          <button type="button" className="photos-msg-button" onClick={() => finish(true)}>
            {confirmLabel}
          </button>
          <button type="button" className="photos-msg-button" onClick={() => finish(false)}>
            cancel
          </button>
        </div>
      </div>
    </div>,
    layer,
  )
}
