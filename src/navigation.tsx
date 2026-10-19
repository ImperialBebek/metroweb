import {
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { prefersReducedMotion, turnstile, type TurnstileMode } from './motion'
import { featherPage, type FeatherOptions } from './pageMotion'

export type BackHandler = () => boolean

interface Navigation {
  navigate: (route: string) => void
  back: () => void
  // Lets an open popup (like a full-mode picker) consume the hardware back button.
  registerBackHandler: (handler: BackHandler) => () => void
}

// What the shell needs from a running app: the hardware Back button, and
// leaving the app when Start is pressed.
export interface StackHandle {
  back: () => void
  exit: () => void
}

const NavigationContext = createContext<Navigation | null>(null)

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext)
  if (!nav) throw new Error('useNavigation must be used inside PageStack')
  return nav
}

interface Entry {
  id: number
  route: string
  // The continuum label on the page below that this page was opened from.
  from?: HTMLElement | null
}

const PRESS_MEMORY_MS = 1000

interface Press {
  target: EventTarget | null
  time: number
}

const pageIn = (stack: HTMLElement | null, id: number) =>
  stack?.querySelector<HTMLElement>(`:scope > [data-page-id="${id}"]`) ?? null

// The [data-feather] element the user just tapped (or focused and pressed
// Enter on) in `page`, which leaves last.
function tappedIn(page: HTMLElement | null, press: Press | null) {
  const recent = press && performance.now() - press.time < PRESS_MEMORY_MS ? press.target : document.activeElement
  const source = recent instanceof Element ? recent.closest<HTMLElement>('[data-feather]') : null
  return source && page?.contains(source) ? source : null
}

interface PageStackProps {
  initialRoute: string
  render: (route: string) => ReactNode
  // Turnstile the first page in when the stack mounts (an app launching).
  enter?: boolean
  // Called after the last page has animated out, from Back on the first page or from exit().
  onExit?: () => void
  handle?: Ref<StackHandle>
  // 'turnstile' turns each page as a whole, like Silverlight apps. 'feather'
  // uses the native apps' feathered turnstile and continuum (see pageMotion.ts).
  transition?: 'turnstile' | 'feather'
}

// Every page in the stack stays mounted (hidden) so going back restores its
// scroll position and pivot item, as on the phone.
export function PageStack({
  initialRoute,
  render,
  enter = false,
  onExit,
  handle,
  transition = 'feather',
}: PageStackProps) {
  const [stack, setStack] = useState<Entry[]>([{ id: 0, route: initialRoute }])
  const nextId = useRef(1)
  const busy = useRef(enter)
  const container = useRef<HTMLDivElement>(null)
  const pendingIn = useRef<{ id: number; mode: 'forwardIn' | 'backwardIn'; options?: FeatherOptions } | null>(
    enter ? { id: 0, mode: 'forwardIn' } : null,
  )
  const pressed = useRef<Press | null>(null)
  const backHandlers = useRef<BackHandler[]>([])
  const stackRef = useRef(stack)
  const onExitRef = useRef(onExit)
  useLayoutEffect(() => {
    stackRef.current = stack
    onExitRef.current = onExit
  })

  const animate = useCallback(
    (id: number, mode: TurnstileMode, options?: FeatherOptions) => {
      const el = pageIn(container.current, id)
      if (!el || !container.current || prefersReducedMotion()) return Promise.resolve()
      let animations: Animation[]
      if (transition === 'feather') {
        animations = featherPage(el, container.current, mode, options)
      } else {
        el.getAnimations().forEach((a) => a.cancel())
        animations = [turnstile(el, mode)]
      }
      // Outgoing animations keep their final (invisible) frame until the page is
      // hidden or unmounted; cancelling them right away would flash the page.
      return Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
        if (mode.endsWith('In')) animations.forEach((a) => a.cancel())
      })
    },
    [transition],
  )

  useLayoutEffect(() => {
    const pending = pendingIn.current
    if (!pending) return
    pendingIn.current = null
    animate(pending.id, pending.mode, pending.options).then(() => {
      busy.current = false
    })
  }, [stack, animate])

  const navigate = useCallback(
    (route: string) => {
      if (busy.current) return
      busy.current = true
      const top = stackRef.current[stackRef.current.length - 1]
      const source = transition === 'feather' ? tappedIn(pageIn(container.current, top.id), pressed.current) : null
      const label = source?.querySelector<HTMLElement>('[data-continuum]') ?? null
      animate(top.id, 'forwardOut', { source, label }).then(() => {
        const entry = { id: nextId.current++, route, from: label }
        pendingIn.current = { id: entry.id, mode: 'forwardIn', options: { continuumTarget: Boolean(label) } }
        setStack((s) => [...s, entry])
      })
    },
    [animate, transition],
  )

  const leave = useCallback(
    (mode: 'forwardOut' | 'backwardOut') => {
      const current = stackRef.current
      busy.current = true
      animate(current[current.length - 1].id, mode).then(() => onExitRef.current?.())
    },
    [animate],
  )

  const back = useCallback(() => {
    for (let i = backHandlers.current.length - 1; i >= 0; i--) {
      if (backHandlers.current[i]()) return
    }
    if (busy.current) return
    const current = stackRef.current
    if (current.length < 2) {
      if (onExitRef.current) leave('backwardOut')
      return
    }
    busy.current = true
    const top = current[current.length - 1]
    const below = current[current.length - 2]
    animate(top.id, 'backwardOut', { continuumTarget: Boolean(top.from) }).then(() => {
      pendingIn.current = { id: below.id, mode: 'backwardIn', options: { label: top.from } }
      setStack((s) => s.slice(0, -1))
    })
  }, [animate, leave])

  const exit = useCallback(() => {
    if (!busy.current) leave('forwardOut')
  }, [leave])

  useImperativeHandle(handle, () => ({ back, exit }), [back, exit])

  const registerBackHandler = useCallback((handler: BackHandler) => {
    backHandlers.current.push(handler)
    return () => {
      backHandlers.current = backHandlers.current.filter((h) => h !== handler)
    }
  }, [])

  const nav = useMemo<Navigation>(() => ({ navigate, back, registerBackHandler }), [navigate, back, registerBackHandler])

  return (
    <NavigationContext.Provider value={nav}>
      <div
        className="page-stack"
        ref={container}
        onPointerDownCapture={(e) => {
          pressed.current = { target: e.target, time: e.timeStamp }
        }}
        onKeyDownCapture={(e) => {
          pressed.current = { target: e.target, time: e.timeStamp }
        }}
        onClickCapture={(e) => {
          if (!pressed.current || e.timeStamp - pressed.current.time > 600) {
            pressed.current = { target: e.target, time: e.timeStamp }
          }
        }}
      >
        {stack.map((entry, index) => {
          const isTop = index === stack.length - 1
          return (
            <div
              key={entry.id}
              className="page-host"
              data-page-id={entry.id}
              data-active={isTop}
              inert={!isTop}
              aria-hidden={!isTop}
            >
              {render(entry.route)}
            </div>
          )
        })}
      </div>
    </NavigationContext.Provider>
  )
}
