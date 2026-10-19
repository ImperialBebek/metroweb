import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion, swivel } from '../motion'
import { useNavigation } from '../navigation'
import { useModal } from './modal'
import { PopupCloseContext, usePopupLayer } from './popupLayer'

// A full-screen page that swivels in over the current page, like the toolkit's
// full-mode pickers. Back swivels it out and then calls
// `onClosed`, where the owner unmounts it. Content closes it with usePopupClose().
export function FullScreenPopup({
  label,
  onClosed,
  children,
}: {
  label: string
  onClosed: () => void
  children: ReactNode
}) {
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const el = useRef<HTMLDivElement>(null)
  // The popup itself takes focus: a looping selector opens its column on
  // focus, and the phone shows a picker with every column closed.
  useModal(el, '.full-popup')
  const closing = useRef(false)
  const onClosedRef = useRef(onClosed)
  useLayoutEffect(() => {
    onClosedRef.current = onClosed
  })

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const node = el.current
    if (!node || prefersReducedMotion()) {
      onClosedRef.current()
      return
    }
    swivel(node, 'out').finished.then(
      () => onClosedRef.current(),
      () => onClosedRef.current(),
    )
  }, [])

  useLayoutEffect(() => {
    if (!el.current || prefersReducedMotion()) return
    const anim = swivel(el.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [])

  useEffect(
    () =>
      registerBackHandler(() => {
        close()
        return true
      }),
    [registerBackHandler, close],
  )

  if (!layer) return null
  return createPortal(
    <div className="full-popup" ref={el} role="dialog" aria-modal aria-label={label} tabIndex={-1}>
      <PopupCloseContext.Provider value={close}>{children}</PopupCloseContext.Provider>
    </div>,
    layer,
  )
}
