import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AppBar } from '../../components/AppBar'
import { Pivot } from '../../components/Pivot'
import { useTilt } from '../../components/useTilt'
import { addDays, eventsStore, formatTime, todosStore, type CalendarEvent, type Todo } from '../../data/calendar'
import { at, useStore } from '../../data/persist'
import { PhIcon } from '../../icons/PhIcon'
import { PageStack, useNavigation } from '../../navigation'
import type { AppProps } from '../types'
import { longDate, relativeDay, startOfDay, timeRange, todayStart } from './dates'
import { DayView } from './DayView'
import { EventDetails, EventEditor, TodoEditor } from './EventPages'
import { MonthPage } from './MonthPage'
import { CheckBox } from './widgets'
import './calendar.css'

const AGENDA_DAYS = 60
const REMINDER_POLL = 5000

type Navigate = (route: string) => void

export function CalendarApp({ onExit, handle }: AppProps) {
  const [day, setDay] = useState(todayStart)
  const [pivot, setPivot] = useState(0)
  const [reminder, setReminder] = useState<{ event: CalendarEvent; key: number } | null>(null)
  // The main page is always at the bottom of the stack, so its navigate stays valid.
  const navigateRef = useRef<Navigate | null>(null)

  useEffect(() => {
    let last = Date.now()
    let key = 0
    const timer = window.setInterval(() => {
      const now = Date.now()
      const due = eventsStore
        .get()
        .filter((e) => e.reminder !== undefined && e.start - e.reminder * 60_000 > last && e.start - e.reminder * 60_000 <= now)
      if (due.length) setReminder({ event: due[due.length - 1], key: ++key })
      last = now
    }, REMINDER_POLL)
    return () => window.clearInterval(timer)
  }, [])

  const render = (route: string) => {
    const colon = route.indexOf(':')
    const kind = colon < 0 ? route : route.slice(0, colon)
    const arg = colon < 0 ? '' : route.slice(colon + 1)
    switch (kind) {
      case 'month':
        return (
          <MonthPage
            day={day}
            onPick={(d) => {
              setDay(d)
              setPivot(0)
            }}
          />
        )
      case 'event':
        return <EventDetails id={arg} />
      case 'edit':
        return <EventEditor id={arg} />
      case 'new':
        return <EventEditor start={Number(arg)} onSaved={(event) => setDay(startOfDay(event.start))} />
      case 'todo':
        return <TodoEditor id={arg === 'new' ? undefined : arg} />
      default:
        return (
          <MainPage
            day={day}
            onDayChange={setDay}
            pivot={pivot}
            onPivotChange={setPivot}
            navigateRef={navigateRef}
          />
        )
    }
  }

  return (
    <>
      <PageStack enter initialRoute="main:" render={render} onExit={onExit} handle={handle} />
      {reminder && (
        <ReminderToast
          key={reminder.key}
          event={reminder.event}
          onOpen={() => {
            setReminder(null)
            navigateRef.current?.(`event:${reminder.event.id}`)
          }}
          onDone={() => setReminder(null)}
        />
      )}
    </>
  )
}

function MainPage({
  day,
  onDayChange,
  pivot,
  onPivotChange,
  navigateRef,
}: {
  day: number
  onDayChange: (day: number) => void
  pivot: number
  onPivotChange: (index: number) => void
  navigateRef: RefObject<Navigate | null>
}) {
  const { navigate } = useNavigation()
  useLayoutEffect(() => {
    navigateRef.current = navigate
  }, [navigate, navigateRef])

  // New appointments start on the next hour today, or at 9 AM on another day.
  const newStart = () => {
    const now = new Date()
    if (day !== startOfDay(now.getTime())) return at(new Date(day), 9)
    return at(now, now.getHours() + 1)
  }
  const openEvent = (id: string) => navigate(`event:${id}`)

  return (
    <div className="app-page">
      <Pivot
        title={longDate(day)}
        selected={pivot}
        onSelectedChange={onPivotChange}
        items={[
          {
            key: 'day',
            header: 'day',
            content: (
              <DayView
                day={day}
                onDayChange={onDayChange}
                onNew={(start) => navigate(`new:${start}`)}
                onOpen={openEvent}
              />
            ),
          },
          { key: 'agenda', header: 'agenda', content: <AgendaView onOpen={openEvent} /> },
          { key: 'todo', header: 'to-do', content: <TodoView onOpen={(id) => navigate(`todo:${id}`)} /> },
        ]}
      />
      {pivot === 2 ? (
        <AppBar
          buttons={[{ icon: 'add', label: 'new', onTap: () => navigate('todo:new') }]}
          menu={[
            {
              label: 'delete completed',
              onTap: () => todosStore.set((list) => list.filter((t) => !t.done)),
            },
          ]}
        />
      ) : (
        <AppBar
          buttons={[
            { icon: 'today', label: 'today', onTap: () => onDayChange(todayStart()) },
            { icon: 'add', label: 'new', onTap: () => navigate(`new:${newStart()}`) },
            { icon: 'month', label: 'month', onTap: () => navigate('month:') },
          ]}
        />
      )}
    </div>
  )
}

function AgendaView({ onOpen }: { onOpen: (id: string) => void }) {
  const events = useStore(eventsStore)
  const today = todayStart()
  const horizon = addDays(today, AGENDA_DAYS)
  const groups: { day: number; events: CalendarEvent[] }[] = []
  for (const event of [...events].sort((a, b) => a.start - b.start)) {
    if (event.end <= today || event.start >= horizon) continue
    const groupDay = Math.max(startOfDay(event.start), today)
    const group = groups.find((g) => g.day === groupDay)
    if (group) group.events.push(event)
    else groups.push({ day: groupDay, events: [event] })
  }
  groups.sort((a, b) => a.day - b.day)
  if (groups.length === 0) return <p className="calendar-empty">No upcoming appointments.</p>
  return (
    <div className="calendar-agenda">
      {groups.map((group) => (
        <section key={group.day} className="calendar-agenda-group">
          <h2 className="calendar-agenda-day" data-today={group.day === today || undefined}>
            {relativeDay(group.day, today)}
          </h2>
          {group.events.map((event) => (
            <AgendaItem key={event.id} event={event} onOpen={() => onOpen(event.id)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function AgendaItem({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="calendar-agenda-item"
      onClick={(e) => {
        if (e.detail === 0) onOpen()
      }}
    >
      <span className="calendar-agenda-bar" aria-hidden />
      <span className="calendar-agenda-text">
        <span className="calendar-agenda-title">{event.title}</span>
        <span className="calendar-agenda-meta">{timeRange(event)}</span>
        {event.location && <span className="calendar-agenda-meta">{event.location}</span>}
      </span>
    </button>
  )
}

function dueLabel(todo: Todo, today: number): string | null {
  if (todo.due === undefined) return null
  if (!todo.done && todo.due < today) return 'overdue'
  return `due ${relativeDay(todo.due, today)}`
}

function TodoView({ onOpen }: { onOpen: (id: string) => void }) {
  const todos = useStore(todosStore)
  const today = todayStart()
  const sorted = [...todos].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      (a.due ?? Infinity) - (b.due ?? Infinity) ||
      Number(b.priority === 'high') - Number(a.priority === 'high'),
  )
  if (sorted.length === 0) return <p className="calendar-empty">No tasks. Tap new to add one.</p>
  const toggle = (id: string) => todosStore.set((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  return (
    <div className="calendar-todos">
      {sorted.map((todo) => (
        <div key={todo.id} className="calendar-todo" data-done={todo.done || undefined}>
          <CheckBox checked={todo.done} label={`Complete ${todo.title}`} onToggle={() => toggle(todo.id)} />
          <TodoText todo={todo} due={dueLabel(todo, today)} onOpen={() => onOpen(todo.id)} />
        </div>
      ))}
    </div>
  )
}

function TodoText({ todo, due, onOpen }: { todo: Todo; due: string | null; onOpen: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="calendar-todo-text"
      onClick={(e) => {
        if (e.detail === 0) onOpen()
      }}
    >
      <span className="calendar-todo-title">
        {todo.priority === 'high' && !todo.done && <span className="calendar-todo-priority">!</span>}
        {todo.title}
      </span>
      {due && (
        <span className="calendar-todo-due" data-overdue={due === 'overdue' || undefined}>
          {due}
        </span>
      )}
    </button>
  )
}

function ReminderToast({ event, onOpen, onDone }: { event: CalendarEvent; onOpen: () => void; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  })
  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), 8000)
    return () => window.clearTimeout(timer)
  }, [])
  const when = event.allDay ? 'all day' : formatTime(event.start)
  return (
    <button type="button" className="calendar-toast" role="alert" onClick={onOpen}>
      <PhIcon name="bell" size={26} />
      <span className="calendar-toast-title">{event.title}</span>
      <span className="calendar-toast-text">
        {when}
        {event.location ? `, ${event.location}` : ''}
      </span>
    </button>
  )
}
