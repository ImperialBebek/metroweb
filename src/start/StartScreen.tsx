import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from 'react'
import { useTilt } from '../components/useTilt'
import { EXPO_OUT_6, prefersReducedMotion, turnstileFeather } from '../motion'
import { APP_BY_ID, APP_LIST, DEFAULT_LAYOUT, type AppDef } from './apps'
import { ph } from '../icons/ph'
import { Icon } from './icons'
import { Tile } from './Tile'

export interface StartHandle {
  // Feathers the visible tiles (or app list items) out, `source` last.
  featherOut: (source?: HTMLElement) => Promise<void>
  featherIn: () => Promise<void>
  // Returns false when there is nothing to go back to.
  back: () => boolean
  home: () => void
  // Jumps to the tiles without animating, while an app is still covering Start.
  showTiles: () => void
}

const SCREEN_WIDTH = 480
const LOCK_DISTANCE = 14
const COMMIT_DISTANCE = 120
const FLICK_VELOCITY = 0.45 // px per ms
// Stagger for TileFeatherDelay_Y / TileFeatherDelay_GridX, measured from WP8.1
// footage (~0.18ms per px up the screen, ~0.25ms per px to the left): Start
// tiles leave and come back bottom-right first, and the tapped tile starts
// leaving well after the last of the others.
const FEATHER_Y_MAX = 145
const FEATHER_X_MAX = 120
const SOURCE_EXTRA_DELAY = 150

interface Target {
  el: HTMLElement
  hinge: number
  outDelay: number
  inDelay: number
}

interface Drag {
  pointerId: number
  startX: number
  startY: number
  scale: number
  axis: 'none' | 'x' | 'y'
  scrollTop: number
  lastX: number
  lastT: number
  velocity: number
}

function AppListItem({ app, onLaunch }: { app: AppDef; onLaunch: (source: HTMLElement) => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onLaunch)
  return (
    <li>
      <button
        type="button"
        ref={ref}
        {...handlers}
        className="applist-item"
        data-feather
        onClick={(e) => {
          if (e.detail === 0 && ref.current) onLaunch(ref.current)
        }}
      >
        <span className="applist-icon">
          <Icon name={app.glyph} size={36} />
        </span>
        <span className="applist-title">{app.title}</span>
      </button>
    </li>
  )
}

export function StartScreen({
  active,
  covered = false,
  onLaunch,
  onPaneChange,
  handle,
}: {
  active: boolean
  // A popup (the alarm ringer) is over the screen.
  covered?: boolean
  onLaunch: (app: string, source: HTMLElement) => void
  onPaneChange?: (pane: 0 | 1) => void
  handle?: Ref<StartHandle>
}) {
  const root = useRef<HTMLDivElement>(null)
  const tilesPane = useRef<HTMLDivElement>(null)
  const listPane = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState<0 | 1>(0)
  const paneElement = () => (pane === 0 ? tilesPane.current : listPane.current)
  const [dragX, setDragX] = useState<number | null>(null)
  const [instant, setInstant] = useState(false)
  const drag = useRef<Drag | null>(null)
  useEffect(() => {
    onPaneChange?.(pane)
  }, [pane, onPaneChange])
  const feathered = useRef<{ pane: 0 | 1; targets: Target[]; animations: Animation[] } | null>(null)

  const targets = (source?: HTMLElement): Target[] => {
    const screen = root.current?.getBoundingClientRect()
    const container = paneElement()
    if (!screen || !container) return []
    const scale = screen.width / SCREEN_WIDTH
    const height = screen.height / scale
    const found: Target[] = []
    container.querySelectorAll<HTMLElement>('[data-feather]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const x = (r.left - screen.left) / scale
      const y = (r.top - screen.top) / scale
      const w = r.width / scale
      const h = r.height / scale
      if (y + h <= 0 || y >= height) return
      const yNorm = Math.min(Math.max(y, 0) / height, 1)
      const xNorm = Math.min(Math.max(x, 0) / SCREEN_WIDTH, 1)
      // The app list keeps its top-to-bottom order.
      const delay =
        pane === 0
          ? (1 - yNorm) * FEATHER_Y_MAX + (1 - xNorm) * FEATHER_X_MAX
          : yNorm * FEATHER_Y_MAX + xNorm * FEATHER_X_MAX
      found.push({ el, hinge: x + w / 2, outDelay: delay, inDelay: delay })
    })
    if (source) {
      const last = Math.max(0, ...found.filter((t) => t.el !== source).map((t) => t.outDelay)) + SOURCE_EXTRA_DELAY
      for (const t of found) if (t.el === source) t.outDelay = last
    }
    return found
  }

  useImperativeHandle(handle, () => ({
    featherOut: async (source) => {
      feathered.current?.animations.forEach((a) => a.cancel())
      feathered.current = null
      if (prefersReducedMotion()) return
      const list = targets(source)
      const animations = list.map((t) => turnstileFeather(t.el, 'forwardOut', t.hinge, t.outDelay))
      feathered.current = { pane, targets: list, animations }
      await Promise.all(animations.map((a) => a.finished.catch(() => {})))
    },
    featherIn: async () => {
      const previous = feathered.current
      feathered.current = null
      if (!previous) return
      // After showTiles() the elements that left are no longer on screen.
      const list = previous.pane === pane ? previous.targets : targets()
      const animations = list.map((t) => turnstileFeather(t.el, 'backwardIn', t.hinge, t.inDelay))
      previous.animations.forEach((a) => a.cancel())
      await Promise.all(animations.map((a) => a.finished.catch(() => {})))
      animations.forEach((a) => a.cancel())
      setInstant(false)
    },
    showTiles: () => {
      if (pane === 0) return
      setInstant(true)
      setPane(0)
    },
    back: () => {
      if (pane === 0) return false
      setPane(0)
      return true
    },
    home: () => {
      if (pane === 1) setPane(0)
      else tilesPane.current?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
  }))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = root.current?.getBoundingClientRect()
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scale: rect ? rect.width / SCREEN_WIDTH : 1,
      axis: 'none',
      scrollTop: paneElement()?.scrollTop ?? 0,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = (e.clientX - d.startX) / d.scale
    const dy = (e.clientY - d.startY) / d.scale
    if (d.axis === 'none') {
      if (Math.abs(dx) > LOCK_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
      } else if (Math.abs(dy) > LOCK_DISTANCE) {
        d.axis = 'y'
        // Touch scrolls natively; a mouse drag scrolls the pane by hand.
        if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId)
      }
    }
    if (d.axis === 'y' && e.pointerType === 'mouse') {
      paneElement()?.scrollTo({ top: d.scrollTop - dy })
    }
    if (d.axis === 'x') {
      const dt = e.timeStamp - d.lastT
      if (dt > 0) d.velocity = (e.clientX - d.lastX) / d.scale / dt
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      const base = -pane * SCREEN_WIDTH
      let x = base + dx
      // Rubber-band past either end.
      if (x > 0) x /= 3
      if (x < -SCREEN_WIDTH) x = -SCREEN_WIDTH + (x + SCREEN_WIDTH) / 3
      setDragX(x)
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (d.axis !== 'x') return
    const dx = (e.clientX - d.startX) / d.scale
    if (pane === 0 && (dx < -COMMIT_DISTANCE || d.velocity < -FLICK_VELOCITY)) setPane(1)
    if (pane === 1 && (dx > COMMIT_DISTANCE || d.velocity > FLICK_VELOCITY)) setPane(0)
    setDragX(null)
  }

  const x = dragX ?? -pane * SCREEN_WIDTH
  const launch = (app: string) => (source: HTMLElement) => onLaunch(app, source)

  return (
    <div className="start" ref={root} data-hidden={!active || undefined} inert={!active || covered}>
      <div
        className="start-panorama"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragX === null && !instant && !prefersReducedMotion() ? `transform 350ms ${EXPO_OUT_6}` : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="start-pane" ref={tilesPane} inert={pane !== 0} aria-label="Start">
          <div className="tile-grid">
            {DEFAULT_LAYOUT.map(({ app, size }) => {
              const def = APP_BY_ID.get(app)
              return def ? (
                <Tile key={app} app={def} size={size} active={active && pane === 0} onLaunch={launch(app)} />
              ) : null
            })}
          </div>
          <button type="button" className="start-arrow" data-feather aria-label="All apps" onClick={() => setPane(1)}>
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
              <circle className="appbar-ring" cx="22" cy="22" r="19.5" />
              {ph('arrow-right', 22, 22, 22)}
            </svg>
          </button>
        </div>
        <div className="start-pane applist" ref={listPane} inert={pane !== 1} aria-label="All apps">
          <button type="button" className="applist-search" data-feather aria-label="Search apps" aria-disabled>
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
              <circle className="appbar-ring" cx="22" cy="22" r="19.5" />
              {ph('magnifying-glass', 22, 22, 22)}
            </svg>
          </button>
          <ul className="applist-items">
            {APP_LIST.map((app) => (
              <AppListItem key={app.id} app={app} onLaunch={launch(app.id)} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
