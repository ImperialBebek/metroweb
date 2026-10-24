import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NavigationBar, PageStack, PopupLayerContext, type StackHandle } from 'metroweb'

const SCREEN_WIDTH = 480
const NAV_HEIGHT = 64

// A phone screen inside a docs page, with its own page stack and popup layer,
// so pickers, the app bar and message boxes behave as they do in an app.
// Narrow pages scale it down, as the phone shell does.
export function DemoFrame({
  height,
  nav = false,
  caption,
  children,
}: {
  height: number
  // The navigation bar, for demos that something closes with Back.
  nav?: boolean
  caption: string
  children: ReactNode
}) {
  const stage = useRef<HTMLDivElement>(null)
  const stack = useRef<StackHandle>(null)
  const [scale, setScale] = useState(1)
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  const [covered, setCovered] = useState(false)

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / SCREEN_WIDTH))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // While a popup is open in this frame, its page is inert, as an app is
  // behind a popup on the phone. The rest of the docs page stays usable.
  useEffect(() => {
    if (!layer) return
    const observer = new MutationObserver(() => setCovered(layer.childElementCount > 0))
    observer.observe(layer, { childList: true })
    return () => observer.disconnect()
  }, [layer])

  const total = height + (nav ? NAV_HEIGHT : 0)
  const back = () => stack.current?.back()
  const screen = {
    width: SCREEN_WIDTH,
    height: total,
    transform: `scale(${scale})`,
    '--tray-height': '0px',
    '--nav-height': nav ? `${NAV_HEIGHT}px` : '0px',
  } as CSSProperties

  return (
    <figure className="demo">
      <div className="demo-stage" ref={stage}>
        <div
          className="demo-column"
          style={{ width: SCREEN_WIDTH * scale, height: total * scale }}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.preventDefault()
            back()
          }}
        >
          <div className="screen" style={screen}>
            <PopupLayerContext.Provider value={layer}>
              <div className="app-host" inert={covered}>
                <PageStack initialRoute="demo" render={() => children} handle={stack} />
              </div>
            </PopupLayerContext.Provider>
            <div className="popup-layer" ref={setLayer} />
            {nav && <NavigationBar onBack={back} />}
          </div>
        </div>
      </div>
      <figcaption className="demo-caption">{caption}</figcaption>
    </figure>
  )
}
