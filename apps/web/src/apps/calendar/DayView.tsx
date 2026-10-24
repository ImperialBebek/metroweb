import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { EXPO_IN_6, EXPO_OUT_6, prefersReducedMotion, useTilt } from 'metroweb'
import { addDays, eventsOnDay, eventsStore, type CalendarEvent } from '../../data/calendar'
import { at, useStore } from '../../data/persist'
import { startOfDay } from './dates'

const HOUR = 64
const MIN_BLOCK = 30
// Shorter blocks have room for one line only.
const TWO_LINE_HEIGHT = 50
const LOCK_DISTANCE = 14
const COMMIT_DISTANCE = 110
const FLICK_VELOCITY = 0.45 // px per ms

interface Placed {
  event: CalendarEvent
  top: number
  height: number
  col: number
  cols: number
}

// Side-by-side columns for overlapping appointments, like the phone's day view.
function layout(events: CalendarEvent[], dayMs: number): Placed[] {
  const next = addDays(dayMs, 1)
  const items = events
    .map((event) => {
      const start = Math.max(event.start, dayMs)
      const end = Math.min(Math.max(event.end, event.start + 15 * 60_000), next)
      const top = ((start - dayMs) / 3_600_000) * HOUR
      return { event, top, height: Math.max(MIN_BLOCK, ((end - start) / 3_600_000) * HOUR), col: 0, cols: 1 }
    })
    .sort((a, b) => a.top - b.top || b.height - a.height)
  let cluster: Placed[] = []
  let clusterBottom = -1
  const flush = () => {
    const cols = Math.max(...cluster.map((c) => c.col)) + 1
    for (const c of cluster) c.cols = cols
    cluster = []
  }
  for (const item of items) {
    if (cluster.length && item.top >= clusterBottom) flush()
    const used = cluster.filter((c) => c.top + c.height > item.top).map((c) => c.col)
    let col = 0
    while (used.includes(col)) col++
    item.col = col
    cluster.push(item)
    clusterBottom = Math.max(clusterBottom, item.top + item.height)
  }
  if (cluster.length) flush()
  return items
}

const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`

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

export function DayView({
  day,
  onDayChange,
  onNew,
  onOpen,
}: {
  day: number
  onDayChange: (day: number) => void
  onNew: (start: number) => void
  onOpen: (id: string) => void
}) {
  const events = useStore(eventsStore)
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const swiped = useRef(false)
  const [dx, setDx] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // Open each day at the start of the working day, or just before now on today.
  useLayoutEffect(() => {
    const scroller = root.current?.closest('.pivot-item')
    if (!scroller) return
    const current = new Date()
    const hour = day === startOfDay(current.getTime()) ? Math.max(0, current.getHours() - 1) : 7
    scroller.scrollTop = hour * HOUR
  }, [day])

  const dayEvents = eventsOnDay(events, day)
  const allDay = dayEvents.filter((e) => e.allDay)
  const timed = layout(
    dayEvents.filter((e) => !e.allDay),
    day,
  )
  const isToday = startOfDay(now) === day
  const nowTop = ((now - day) / 3_600_000) * HOUR

  const slide = (direction: 1 | -1, from: number) => {
    const el = root.current
    const width = el?.offsetWidth ?? 456
    if (!el || prefersReducedMotion()) {
      setDx(0)
      onDayChange(addDays(day, direction))
      return
    }
    const out = el.animate(
      [
        { transform: `translateX(${from}px)`, opacity: 1 },
        { transform: `translateX(${-direction * width}px)`, opacity: 0 },
      ],
      { duration: 160, easing: EXPO_IN_6, fill: 'forwards' },
    )
    out.finished
      .then(() => {
        flushSync(() => {
          setDx(0)
          onDayChange(addDays(day, direction))
        })
        out.cancel()
        el.animate(
          [
            { transform: `translateX(${direction * 140}px)`, opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 350, easing: EXPO_OUT_6 },
        )
      })
      .catch(() => {})
  }

  // Horizontal swipes change the day here instead of reaching the pivot.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.button !== 0) return
    const el = e.currentTarget
    swiped.current = false
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scale: el.getBoundingClientRect().width / el.offsetWidth || 1,
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
    setDx(mx)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (d.axis !== 'x') return
    swiped.current = true
    if (dx < -COMMIT_DISTANCE || d.velocity < -FLICK_VELOCITY) slide(1, dx)
    else if (dx > COMMIT_DISTANCE || d.velocity > FLICK_VELOCITY) slide(-1, dx)
    else {
      if (!prefersReducedMotion()) {
        root.current?.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], {
          duration: 250,
          easing: EXPO_OUT_6,
        })
      }
      setDx(0)
    }
  }

  const tap = (action: () => void) => () => {
    if (!swiped.current) action()
  }

  return (
    <div
      className="calendar-dayview"
      ref={root}
      style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {allDay.length > 0 && (
        <div className="calendar-allday">
          {allDay.map((event) => (
            <EventBlock key={event.id} event={event} onOpen={tap(() => onOpen(event.id))} />
          ))}
        </div>
      )}
      <div className="calendar-grid" style={{ height: 24 * HOUR }}>
        {Array.from({ length: 24 }, (_, h) => (
          <button
            key={h}
            type="button"
            className="calendar-hour"
            style={{ top: h * HOUR, height: HOUR }}
            aria-label={`New appointment at ${hourLabel(h)}`}
            onClick={tap(() => onNew(at(new Date(day), h)))}
          >
            <span className="calendar-hour-label">{hourLabel(h)}</span>
          </button>
        ))}
        <div className="calendar-blocks">
          {timed.map(({ event, top, height, col, cols }) => (
            <EventBlock
              key={event.id}
              event={event}
              compact={height < TWO_LINE_HEIGHT}
              style={{
                top,
                height: height - 2,
                left: `${(col / cols) * 100}%`,
                width: `calc(${100 / cols}% - 3px)`,
              }}
              onOpen={tap(() => onOpen(event.id))}
            />
          ))}
        </div>
        {isToday && <div className="calendar-now" style={{ top: nowTop }} aria-hidden />}
      </div>
    </div>
  )
}

function EventBlock({
  event,
  style,
  compact = false,
  onOpen,
}: {
  event: CalendarEvent
  style?: CSSProperties
  compact?: boolean
  onOpen: () => void
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="calendar-block"
      data-allday={event.allDay || undefined}
      data-compact={compact || undefined}
      style={style}
      onClick={(e) => {
        if (e.detail === 0) onOpen()
      }}
    >
      <span className="calendar-block-title">{event.title}</span>
      {event.location && <span className="calendar-block-location">{event.location}</span>}
    </button>
  )
}
