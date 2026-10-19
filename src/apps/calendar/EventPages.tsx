import { useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { DatePicker, TimePicker } from '../../components/DateTimePicker'
import { ListPicker } from '../../components/ListPicker'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import {
  addDays,
  DAY_MS,
  eventsStore,
  todosStore,
  type CalendarEvent,
  type Todo,
  type TodoPriority,
} from '../../data/calendar'
import { at, newId, useStore } from '../../data/persist'
import { motionMs } from '../../motionSpeed'
import { useNavigation } from '../../navigation'
import {
  ALL_DAY,
  DURATIONS,
  NO_REMINDER,
  REMINDERS,
  durationLabel,
  longDate,
  reminderLabel,
  startOfDay,
  timeRange,
  todayStart,
} from './dates'
import { MessageBox } from '../../components/MessageBox'
import { TextBox } from './widgets'

// Deleting only after Back has turned the page away keeps it from going blank mid-transition.
const AFTER_BACK = 300

export function EventDetails({ id }: { id: string }) {
  const events = useStore(eventsStore)
  const { back, navigate } = useNavigation()
  const [confirming, setConfirming] = useState(false)
  const event = events.find((e) => e.id === id)
  if (!event) return <div className="app-page" />

  const lastDay = event.allDay ? addDays(event.end, -1) : startOfDay(event.end - 1)
  const multiDay = lastDay > startOfDay(event.start)

  return (
    <div className="app-page">
      <div className="calendar-page-title">appointment</div>
      <div className="calendar-scroll calendar-details">
        <h1 className="calendar-details-title">{event.title}</h1>
        <div className="calendar-details-when">
          {multiDay ? `${longDate(event.start)} to ${longDate(lastDay)}` : longDate(event.start)}
        </div>
        <div className="calendar-details-when">{timeRange(event)}</div>
        {event.location && <div className="calendar-details-location">{event.location}</div>}
        <div className="calendar-details-label">Reminder</div>
        <div className="calendar-details-value">{reminderLabel(event.reminder)}</div>
        {event.notes && (
          <>
            <div className="calendar-details-label">Notes</div>
            <div className="calendar-details-notes">{event.notes}</div>
          </>
        )}
      </div>
      <AppBar
        buttons={[
          { icon: 'edit', label: 'edit', onTap: () => navigate(`edit:${event.id}`) },
          { icon: 'delete', label: 'delete', onTap: () => setConfirming(true) },
        ]}
      />
      {confirming && (
        <MessageBox
          caption="Delete appointment"
          message="This appointment will be deleted."
          buttons={[
            {
              label: 'delete',
              onTap: () => {
                back()
                window.setTimeout(() => eventsStore.set((list) => list.filter((e) => e.id !== id)), motionMs(AFTER_BACK))
              },
            },
            { label: 'cancel' },
          ]}
          onDismissed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

interface EventDraft {
  title: string
  location: string
  date: number
  hour: number
  minute: number
  duration: number
  // Length of an all-day event in days, kept when editing multi-day events.
  days: number
  reminder: number
  notes: string
}

function draftFrom(event: CalendarEvent | undefined, start: number): EventDraft {
  if (!event) {
    const d = new Date(start)
    return {
      title: '',
      location: '',
      date: startOfDay(start),
      hour: d.getHours(),
      minute: d.getMinutes(),
      duration: 60,
      days: 1,
      reminder: 15,
      notes: '',
    }
  }
  const d = new Date(event.start)
  return {
    title: event.title,
    location: event.location ?? '',
    date: startOfDay(event.start),
    hour: d.getHours(),
    minute: d.getMinutes(),
    duration: event.allDay ? ALL_DAY : Math.round((event.end - event.start) / 60_000),
    days: event.allDay ? Math.max(1, Math.round((event.end - event.start) / DAY_MS)) : 1,
    reminder: event.reminder ?? NO_REMINDER,
    notes: event.notes ?? '',
  }
}

export function EventEditor({
  id,
  start,
  onSaved,
}: {
  id?: string
  start?: number
  onSaved?: (event: CalendarEvent) => void
}) {
  const { back } = useNavigation()
  const [eventId] = useState(() => id ?? newId())
  const [draft, setDraft] = useState(() =>
    draftFrom(id ? eventsStore.get().find((e) => e.id === id) : undefined, start ?? Date.now()),
  )
  const update = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const allDay = draft.duration === ALL_DAY

  const durations = DURATIONS.includes(draft.duration) ? DURATIONS : [...DURATIONS.slice(0, -1), draft.duration, ALL_DAY]
  const reminders = REMINDERS.includes(draft.reminder) ? REMINDERS : [...REMINDERS, draft.reminder]

  const save = () => {
    const begin = allDay ? draft.date : at(new Date(draft.date), draft.hour, draft.minute)
    const end = allDay ? addDays(draft.date, draft.days) : begin + draft.duration * 60_000
    const event: CalendarEvent = {
      id: eventId,
      title: draft.title.trim() || '(No subject)',
      start: begin,
      end,
    }
    if (draft.location.trim()) event.location = draft.location.trim()
    if (allDay) event.allDay = true
    if (draft.notes.trim()) event.notes = draft.notes.trim()
    if (draft.reminder !== NO_REMINDER) event.reminder = draft.reminder
    const isNew = !eventsStore.get().some((e) => e.id === eventId)
    eventsStore.set((list) => (isNew ? [...list, event] : list.map((e) => (e.id === eventId ? event : e))))
    onSaved?.(event)
    back()
  }

  return (
    <div className="app-page">
      <div className="calendar-page-title">{id ? 'edit appointment' : 'new appointment'}</div>
      <div className="calendar-scroll calendar-form">
        <TextBox header="Subject" value={draft.title} onChange={(title) => update({ title })} />
        <TextBox header="Location" value={draft.location} onChange={(location) => update({ location })} />
        <DatePicker header="When" value={new Date(draft.date)} onChange={(d) => update({ date: startOfDay(d.getTime()) })} />
        {!allDay && (
          <TimePicker
            header="Time"
            hour={draft.hour}
            minute={draft.minute}
            onChange={(hour, minute) => update({ hour, minute })}
          />
        )}
        <ListPicker<number>
          header="How long"
          options={durations.map((m) => ({ value: m, label: m === ALL_DAY ? 'all day' : durationLabel(m) }))}
          value={draft.duration}
          onChange={(duration) => update({ duration })}
        />
        <ListPicker<number>
          header="Reminder"
          options={reminders.map((m) => ({ value: m, label: reminderLabel(m) }))}
          value={draft.reminder}
          onChange={(reminder) => update({ reminder })}
        />
        <TextBox header="Notes" multiline value={draft.notes} onChange={(notes) => update({ notes })} />
      </div>
      <AppBar
        buttons={[
          { icon: 'save', label: 'save', onTap: save },
          { icon: 'close', label: 'cancel', onTap: back },
        ]}
      />
    </div>
  )
}

const PRIORITIES: { value: TodoPriority; label: string }[] = [
  { value: 'high', label: 'high' },
  { value: 'normal', label: 'normal' },
  { value: 'low', label: 'low' },
]

export function TodoEditor({ id }: { id?: string }) {
  const { back } = useNavigation()
  const [todoId] = useState(() => id ?? newId())
  const [draft, setDraft] = useState<Todo>(
    () =>
      (id ? todosStore.get().find((t) => t.id === id) : undefined) ?? {
        id: todoId,
        title: '',
        done: false,
        due: addDays(todayStart(), 1),
        priority: 'normal',
      },
  )
  const [confirming, setConfirming] = useState(false)
  const update = (patch: Partial<Todo>) => setDraft((d) => ({ ...d, ...patch }))

  const save = () => {
    const todo: Todo = { ...draft, title: draft.title.trim() || '(No subject)', notes: draft.notes?.trim() || undefined }
    todosStore.set((list) =>
      list.some((t) => t.id === todo.id) ? list.map((t) => (t.id === todo.id ? todo : t)) : [...list, todo],
    )
    back()
  }

  return (
    <div className="app-page">
      <div className="calendar-page-title">{id ? 'edit to-do' : 'new to-do'}</div>
      <div className="calendar-scroll calendar-form">
        <TextBox header="Subject" value={draft.title} onChange={(title) => update({ title })} />
        <ToggleSwitch
          header="Due date"
          checked={draft.due !== undefined}
          onChange={(on) => update({ due: on ? addDays(todayStart(), 1) : undefined })}
        />
        {draft.due !== undefined && (
          <DatePicker value={new Date(draft.due)} onChange={(d) => update({ due: startOfDay(d.getTime()) })} />
        )}
        <ListPicker<TodoPriority>
          header="Priority"
          options={PRIORITIES}
          value={draft.priority ?? 'normal'}
          onChange={(priority) => update({ priority })}
        />
        <TextBox header="Notes" multiline value={draft.notes ?? ''} onChange={(notes) => update({ notes })} />
      </div>
      <AppBar
        buttons={[
          { icon: 'save', label: 'save', onTap: save },
          id
            ? { icon: 'delete', label: 'delete', onTap: () => setConfirming(true) }
            : { icon: 'close', label: 'cancel', onTap: back },
        ]}
      />
      {confirming && (
        <MessageBox
          caption="Delete to-do"
          message="This to-do will be deleted."
          buttons={[
            {
              label: 'delete',
              onTap: () => {
                back()
                window.setTimeout(() => todosStore.set((list) => list.filter((t) => t.id !== todoId)), motionMs(AFTER_BACK))
              },
            },
            { label: 'cancel' },
          ]}
          onDismissed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
