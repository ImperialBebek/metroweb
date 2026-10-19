import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { EXPO_OUT_6, prefersReducedMotion } from '../motion'
import { motionMs } from '../motionSpeed'

export interface PivotItem {
  key: string
  header: string
  content: ReactNode
}

interface PivotProps {
  title: string
  items: PivotItem[]
  selected?: number
  onSelectedChange?: (index: number) => void
}

const LOCK_DISTANCE = 14
const COMMIT_FRACTION = 0.25
const FLICK_VELOCITY = 0.45 // px per ms
const SNAP_DURATION = 300
const CASCADE_STEP_PX = 32

interface Drag {
  pointerId: number
  startX: number
  startY: number
  scale: number
  axis: 'none' | 'x' | 'y'
  lastX: number
  lastT: number
  velocity: number
}

const mod = (n: number, m: number) => ((n % m) + m) % m

export function Pivot({ title, items, selected: controlled, onSelectedChange }: PivotProps) {
  const [uncontrolled, setUncontrolled] = useState(0)
  const selected = controlled ?? uncontrolled
  const count = items.length
  // The selected header's position along an endless strip. Header buttons are
  // keyed by strip position, so after a swipe each one keeps its label and
  // opacity instead of a button swapping labels mid-fade.
  const [lap, setLap] = useState(0)
  const anchor = mod(lap, count) === selected ? lap : selected
  const canSwipe = count > 1

  const [dx, setDx] = useState(0)
  const [snap, setSnap] = useState<{ direction: -1 | 0 | 1 } | null>(null)
  const drag = useRef<Drag | null>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const headerStrip = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(480)
  const [headerWidths, setHeaderWidths] = useState<number[]>([])
  const id = useId()
  const tabId = (index: number) => `${id}-tab-${index}`
  const panelId = (index: number) => `${id}-panel-${index}`

  const prev = mod(selected - 1, count)
  const next = mod(selected + 1, count)

  // Header widths depend only on their text; callers pass a fresh items array each render.
  const headerKey = items.map((item) => item.header).join('\u0000')
  useLayoutEffect(() => {
    const measure = () => {
      if (viewport.current) setWidth(viewport.current.offsetWidth)
      const widths: number[] = []
      headerStrip.current?.querySelectorAll<HTMLElement>('[data-index]').forEach((el) => {
        widths[Number(el.dataset.index)] = el.offsetWidth
      })
      setHeaderWidths((old) => (old.length === widths.length && old.every((w, i) => w === widths[i]) ? old : widths))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (viewport.current) observer.observe(viewport.current)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [headerKey])

  const headerWidth = (index: number) => headerWidths[index] ?? 0

  const select = (index: number, step: number) => {
    setLap(anchor + step)
    setUncontrolled(index)
    onSelectedChange?.(index)
  }

  const finishSnap = (direction: -1 | 0 | 1) => {
    if (direction === 1) select(next, 1)
    if (direction === -1) select(prev, -1)
    setDx(0)
    setSnap(null)
  }

  const cascadeIncoming = (direction: -1 | 1) => {
    const target = direction === 1 ? next : prev
    const pane = viewport.current?.querySelector<HTMLElement>(`[data-pivot-index="${target}"]`)
    if (!pane) return
    const rows: HTMLElement[] = []
    pane.querySelectorAll<HTMLElement>('[data-feather]').forEach((el) => {
      if (!el.parentElement?.closest('[data-feather]')) rows.push(el)
    })
    rows.forEach((el, i) => {
      if (i === 0) return
      const shift = direction * i * CASCADE_STEP_PX
      el.animate([{ translate: `${shift}px 0px` }, { translate: '0px 0px' }], {
        duration: SNAP_DURATION,
        easing: EXPO_OUT_6,
      })
    })
  }

  const startSnap = (direction: -1 | 0 | 1) => {
    if (prefersReducedMotion()) {
      finishSnap(direction)
      return
    }
    if (direction !== 0) cascadeIncoming(direction)
    setSnap({ direction })
    setDx(-direction * width)
  }

  // Safety net for when the snap transition doesn't fire transitionend
  // (for example, a zero-distance snap).
  useLayoutEffect(() => {
    if (!snap) return
    const timer = window.setTimeout(() => finishSnap(snap.direction), motionMs(SNAP_DURATION) + 80)
    return () => window.clearTimeout(timer)
  })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || snap || e.button !== 0) return
    const el = e.currentTarget
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scale,
      axis: 'none',
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const mx = (e.clientX - d.startX) / d.scale
    const my = (e.clientY - d.startY) / d.scale
    if (d.axis === 'none') {
      if (Math.abs(mx) > LOCK_DISTANCE && Math.abs(mx) > Math.abs(my)) {
        d.axis = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
      } else if (Math.abs(my) > LOCK_DISTANCE) {
        d.axis = 'y'
      }
    }
    if (d.axis !== 'x') return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / d.scale / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    setDx(Math.max(-width, Math.min(width, mx)))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (d.axis !== 'x') return
    let direction: -1 | 0 | 1 = 0
    if (dx < -width * COMMIT_FRACTION || d.velocity < -FLICK_VELOCITY) direction = 1
    else if (dx > width * COMMIT_FRACTION || d.velocity > FLICK_VELOCITY) direction = -1
    startSnap(direction)
  }

  // Headers are keyed by strip position, so the selected one is a new element
  // after every change; keep keyboard focus on it.
  useLayoutEffect(() => {
    if (headerStrip.current?.contains(document.activeElement)) {
      document.getElementById(tabId(selected))?.focus({ preventScroll: true })
    }
  })

  const onHeaderTap = (index: number) => {
    if (snap || drag.current?.axis === 'x' || index === selected) return
    // The phone always animates forward to a tapped header.
    if (index === next) {
      setDx(-1)
      requestAnimationFrame(() => startSnap(1))
    } else {
      select(index, mod(index - selected, count))
    }
  }

  // Arrow keys move one item, animating as a swipe would.
  const onHeaderKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!direction || !canSwipe) return
    e.preventDefault()
    if (snap || drag.current) return
    setDx(-direction)
    requestAnimationFrame(() => startSnap(direction))
  }

  // The header strip starts with the previous header hidden off the left edge,
  // so dragging right can reveal it.
  const strip: { slot: string; index: number; at: number }[] = [{ slot: 'prev', index: prev, at: anchor - 1 }]
  for (let i = 0; i < Math.max(count, 2) + 1; i++) {
    strip.push({ slot: `s${i}`, index: mod(selected + i, count), at: anchor + i })
  }

  const progress = width ? dx / width : 0
  const headerShift = progress < 0 ? progress * headerWidth(selected) : progress * headerWidth(prev)
  const switching = snap !== null && snap.direction !== 0
  const transition = snap ? `transform ${SNAP_DURATION}ms ${EXPO_OUT_6}` : 'none'

  // The pane being revealed sits on the side the content is moving away from.
  const neighbour = dx < 0 ? next : dx > 0 ? prev : -1

  return (
    <div
      className="pivot"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pivot-title" data-feather data-continuum-target>
        {title}
      </div>
      <div className="pivot-headers" data-feather>
        <div
          className="pivot-header-strip"
          ref={headerStrip}
          role="tablist"
          aria-label={title}
          onKeyDown={onHeaderKey}
          style={{
            transform: `translateX(${headerShift - headerWidth(prev)}px)`,
            transition,
          }}
        >
          {strip.map(({ slot, index, at }) => {
            const isCurrent = slot === 's0'
            const isTarget = (dx < 0 && slot === 's1') || (dx > 0 && slot === 'prev')
            // One header per item is the tab; the copies either side of the strip are decoration.
            const isTab = slot !== 'prev' && Number(slot.slice(1)) < count
            return (
              <button
                key={at}
                type="button"
                className="pivot-header"
                data-index={slot === 'prev' || isTab ? index : undefined}
                data-selected={switching ? isTarget : isCurrent}
                role={isTab ? 'tab' : undefined}
                id={isTab ? tabId(index) : undefined}
                aria-selected={isTab ? index === selected : undefined}
                aria-controls={isTab ? panelId(index) : undefined}
                aria-hidden={isTab ? undefined : true}
                tabIndex={canSwipe && isTab && index === selected ? 0 : -1}
                onClick={() => onHeaderTap(index)}
              >
                {items[index].header}
              </button>
            )
          })}
        </div>
      </div>
      <div className="pivot-viewport" ref={viewport}>
        {items.map((item, index) => {
          const offset =
            index === selected ? 0 : index === neighbour ? (dx < 0 ? width : -width) : null
          return (
            <div
              key={item.key}
              className="pivot-item"
              role="tabpanel"
              id={panelId(index)}
              aria-labelledby={tabId(index)}
              data-pivot-index={index}
              data-visible={offset !== null}
              aria-hidden={index !== selected}
              inert={index !== selected}
              style={{
                transform: offset === null ? undefined : `translateX(${offset + dx}px)`,
                transition,
              }}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && snap && index === selected) finishSnap(snap.direction)
              }}
            >
              {item.content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
