import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../components/modal'
import { usePopupLayer } from '../../components/popupLayer'
import { useTilt } from '../../components/useTilt'
import { prefersReducedMotion, swivel } from '../../motion'
import { useNavigation } from '../../navigation'

function MessageBoxButton({ label, onTap }: { label: string; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="onenote-msgbox-button"
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      {label}
    </button>
  )
}

// System MessageBox: a chrome-coloured panel across the top of the screen
// over a dimmed page. `onClose` gets the tapped button's label, or null for Back.
export function MessageBox({
  title,
  message,
  buttons,
  onClose,
}: {
  title: string
  message: string
  buttons: string[]
  onClose: (result: string | null) => void
}) {
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  const close = useCallback((result: string | null) => {
    if (closing.current) return
    closing.current = true
    const done = () => onCloseRef.current(result)
    if (!panel.current || !root.current || prefersReducedMotion()) {
      done()
      return
    }
    root.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
    swivel(panel.current, 'out').finished.then(done, done)
  }, [])

  useLayoutEffect(() => {
    if (!panel.current || !root.current || prefersReducedMotion()) return
    root.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
    const anim = swivel(panel.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [])

  useModal(root)

  // Once closing, Back passes through so the owner can navigate in the same tick.
  useEffect(
    () =>
      registerBackHandler(() => {
        if (closing.current) return false
        close(null)
        return true
      }),
    [registerBackHandler, close],
  )

  const box = (
    <div className="onenote-msgbox" ref={root} role="alertdialog" aria-modal aria-labelledby="onenote-msgbox-title">
      <div className="onenote-msgbox-panel" ref={panel}>
        <div className="onenote-msgbox-title" id="onenote-msgbox-title">
          {title}
        </div>
        <div className="onenote-msgbox-text">{message}</div>
        <div className="onenote-msgbox-buttons">
          {buttons.map((label) => (
            <MessageBoxButton key={label} label={label} onTap={() => close(label)} />
          ))}
        </div>
      </div>
    </div>
  )
  return layer ? createPortal(box, layer) : box
}
