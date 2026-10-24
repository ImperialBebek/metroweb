import { useRef, useState, type PointerEvent } from 'react'
import { AppBar, EXPO_OUT_6, prefersReducedMotion, useNavigation, useTilt } from 'metroweb'
import { addDays, eventsOnDay, eventsStore, type CalendarEvent } from '../../data/calendar'
import { useStore } from '../../data/persist'
import { MONTHS, todayStart } from './dates'

const WEEKDAY_LETTERS = ['s', 'm', 't', 'w', 't', 'f', 's']
const SWIPE_DISTANCE = 60

const G = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinejoin: 'round' } as const
const UP = <path {...G} d="M16 27.5l8-8 8 8" />
const DOWN = <path {...G} d="M16 20.5l8 8 8-8" />

const monthStart = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

export function MonthPage({
  day,
  onPick,
}: {
  day: number
  onPick: (day: number) => void
}) {
  const events = useStore(eventsStore)
  const { back } = useNavigation()
  const [month, setMonth] = useState(() => monthStart(day))
  const grid = useRef<HTMLDivElement>(null)
  const swipe = useRef<{ pointerId: number; y: number; scale: number } | null>(null)
  const swiped = useRef(false)

  const shown = new Date(month)
  const firstCell = addDays(month, -shown.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => addDays(firstCell, i))
  const today = todayStart()

  const go = (target: number, direction: number) => {
    if (target === month) return
    setMonth(target)
    if (grid.current && !prefersReducedMotion()) {
      grid.current.animate(
        [
          { transform: `translateY(${direction * 80}px)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 350, easing: EXPO_OUT_6 },
      )
    }
  }
  const shift = (months: number) => {
    const d = new Date(month)
    d.setMonth(d.getMonth() + months)
    go(d.getTime(), months)
  }

  // Months scroll vertically on the phone, so a vertical swipe changes the month.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    swiped.current = false
    swipe.current = { pointerId: e.pointerId, y: e.clientY, scale: el.getBoundingClientRect().height / el.offsetHeight || 1 }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    if (!s || s.pointerId !== e.pointerId) return
    swipe.current = null
    const dy = (e.clientY - s.y) / s.scale
    if (Math.abs(dy) < SWIPE_DISTANCE) return
    swiped.current = true
    shift(dy < 0 ? 1 : -1)
  }

  return (
    <div className="app-page">
      <div className="calendar-page-title">{shown.getFullYear()}</div>
      <h1 className="calendar-month-header">{MONTHS[shown.getMonth()]}</h1>
      <div className="calendar-weekdays" aria-hidden>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>
      <div
        className="calendar-month"
        ref={grid}
        role="grid"
        aria-label={`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null
        }}
      >
        {cells.map((cell) => (
          <MonthCell
            key={cell}
            day={cell}
            events={eventsOnDay(events, cell)}
            outside={new Date(cell).getMonth() !== shown.getMonth()}
            today={cell === today}
            selected={cell === day}
            onPick={() => {
              if (swiped.current) return
              onPick(cell)
              back()
            }}
          />
        ))}
      </div>
      <AppBar
        buttons={[
          { icon: UP, label: 'previous', onTap: () => shift(-1) },
          { icon: 'today', label: 'today', onTap: () => go(monthStart(today), today < month ? -1 : 1) },
          { icon: DOWN, label: 'next', onTap: () => shift(1) },
        ]}
      />
    </div>
  )
}

function MonthCell({
  day,
  events,
  outside,
  today,
  selected,
  onPick,
}: {
  day: number
  events: CalendarEvent[]
  outside: boolean
  today: boolean
  selected: boolean
  onPick: () => void
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onPick)
  const date = new Date(day)
  return (
    <button
      type="button"
      role="gridcell"
      ref={ref}
      {...handlers}
      className="calendar-cell"
      data-outside={outside || undefined}
      data-today={today || undefined}
      data-selected={selected || undefined}
      aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${
        events.length ? `, ${events.length} appointment${events.length === 1 ? '' : 's'}` : ''
      }`}
      onClick={(e) => {
        if (e.detail === 0) onPick()
      }}
    >
      <span className="calendar-cell-day">{date.getDate()}</span>
      {events.slice(0, 2).map((event) => (
        <span key={event.id} className="calendar-cell-event">
          {event.title}
        </span>
      ))}
    </button>
  )
}
