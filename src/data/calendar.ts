import { at, dayStart, persistentStore } from './persist'

export interface CalendarEvent {
  id: string
  title: string
  location?: string
  // Epoch milliseconds. All-day events run from midnight to midnight.
  start: number
  end: number
  allDay?: boolean
  notes?: string
  // Minutes before start; undefined means no reminder.
  reminder?: number
}

export const eventsStore = persistentStore<CalendarEvent[]>('calendar', () => {
  const today = dayStart()
  const day = (n: number) => dayStart(n, today)
  return [
    { id: 'e1', title: 'Lunch with Anna', location: 'Café Vida', start: at(today, 12, 30), end: at(today, 13, 30), reminder: 15 },
    { id: 'e2', title: 'Team sync', location: 'Conference room 4', start: at(today, 15), end: at(today, 15, 30), reminder: 15 },
    { id: 'e3', title: 'Pick up dry cleaning', start: at(today, 17, 30), end: at(today, 18) },
    { id: 'e4', title: 'Dentist', location: 'Smile Dental', start: at(day(1), 9), end: at(day(1), 10), reminder: 60 },
    { id: 'e5', title: 'Movie night', location: "Ben's place", start: at(day(2), 19), end: at(day(2), 22) },
    { id: 'e6', title: "Grace's birthday", start: day(4).getTime(), end: day(5).getTime(), allDay: true },
    { id: 'e7', title: 'Quarterly review', location: 'Main office', start: at(day(7), 10), end: at(day(7), 11, 30) },
  ]
})

export function upcomingEvents(events: CalendarEvent[], now = Date.now()): CalendarEvent[] {
  return events.filter((e) => e.end > now).sort((a, b) => a.start - b.start)
}

export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const DAY_MS = 86_400_000

// Events that overlap the day starting at `dayStartMs`, all-day ones first.
export function eventsOnDay(events: CalendarEvent[], dayStartMs: number): CalendarEvent[] {
  const next = addDays(dayStartMs, 1)
  return events
    .filter((e) => e.start < next && (e.end > dayStartMs || (e.end === e.start && e.start >= dayStartMs)))
    .sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || a.start - b.start)
}

// Calendar-day arithmetic that survives daylight-saving changes.
export function addDays(ms: number, days: number): number {
  const d = new Date(ms)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export type TodoPriority = 'high' | 'normal' | 'low'

export interface Todo {
  id: string
  title: string
  done: boolean
  // Midnight of the due day, epoch milliseconds.
  due?: number
  priority?: TodoPriority
  notes?: string
}

export const todosStore = persistentStore<Todo[]>('calendar-todos', () => [
  { id: 't1', title: 'Renew passport', done: false, due: dayStart(3).getTime(), priority: 'high' },
  { id: 't2', title: 'Buy a present for Grace', done: false, due: dayStart(2).getTime() },
  { id: 't3', title: 'Call the landlord', done: true },
])
