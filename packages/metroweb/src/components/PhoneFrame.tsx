import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { PageStack, type StackHandle } from '../navigation.tsx'
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND, themeVariables, type Background } from '../theme.ts'
import { useModalOpen } from './modal.ts'
import { NavigationBar } from './NavigationBar.tsx'
import { PopupLayerContext } from './popupLayer.ts'

const SCREEN_WIDTH = 480
const NAV_HEIGHT = 64

export interface PhoneFrameProps {
  // The first page's route, and what each route shows (see PageStack).
  initialRoute: string
  render: (route: string) => ReactNode
  background?: Background
  // An index into ACCENTS.
  accent?: number
  // The software navigation bar. Without it, Escape and Backspace still go back.
  navigationBar?: boolean
  onStart?: () => void
  onSearch?: () => void
  // Back on the first page leaves the app. Without onExit, Back there does nothing.
  onExit?: () => void
  handle?: Ref<StackHandle>
  transition?: 'turnstile' | 'feather'
}

// The root of a Metro app, as PhoneApplicationFrame is on the phone: the
// 480px logical screen, scaled down to fit a narrower container, holding the
// app's page stack, the popup layer that pickers and message boxes open in,
// and the navigation bar. It fills its container, so give that a height.
export function PhoneFrame({
  initialRoute,
  render,
  background = DEFAULT_BACKGROUND,
  accent = DEFAULT_ACCENT,
  navigationBar = true,
  onStart,
  onSearch,
  onExit,
  handle,
  transition,
}: PhoneFrameProps) {
  const frame = useRef<HTMLDivElement>(null)
  const stack = useRef<StackHandle>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  const covered = useModalOpen()

  useImperativeHandle(handle, () => ({ back: () => stack.current?.back(), exit: () => stack.current?.exit() }), [])

  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The keyboard stands in for the hardware Back key, as in the phone shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      const typing =
        t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)
      if (e.key === 'Escape' || (e.key === 'Backspace' && !typing)) {
        e.preventDefault()
        stack.current?.back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scale = size ? Math.min(1, size.width / SCREEN_WIDTH) : 1
  const back = () => stack.current?.back()
  return (
    <div className="phone-frame" ref={frame} style={themeVariables(background, accent) as CSSProperties}>
      {size && (
        <div className="phone-frame-column" style={{ width: SCREEN_WIDTH * scale }}>
          <div
            className="screen"
            data-theme={background}
            style={
              {
                width: SCREEN_WIDTH,
                height: size.height / scale,
                transform: `scale(${scale})`,
                '--tray-height': '0px',
                '--nav-height': navigationBar ? `${NAV_HEIGHT}px` : '0px',
              } as CSSProperties
            }
          >
            <PopupLayerContext.Provider value={layer}>
              <div className="app-host" inert={covered}>
                <PageStack initialRoute={initialRoute} render={render} onExit={onExit} handle={stack} transition={transition} />
              </div>
            </PopupLayerContext.Provider>
            <div className="popup-layer" ref={setLayer} />
            {navigationBar && <NavigationBar onBack={back} onStart={onStart} onSearch={onSearch} />}
          </div>
        </div>
      )}
    </div>
  )
}
