import { useEffect, useRef, useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { TimePicker } from '../../components/DateTimePicker'
import { ListPicker } from '../../components/ListPicker'
import { FullScreenPopup } from '../../components/popup'
import { usePopupClose } from '../../components/popupLayer'
import { useTilt } from '../../components/useTilt'
import { ALARM_SOUNDS, alarmsStore, durationText, nextRing, repeatSummary, type Alarm } from '../../data/alarms'
import { newId, useStore } from '../../data/persist'
import { motionMs } from '../../motionSpeed'
import { PhIcon } from '../../icons/PhIcon'
import { PageStack, useNavigation } from '../../navigation'
import type { AppProps } from '../types'
import { playSound } from './sounds'
import './alarms.css'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Toast {
  key: number
  text: string
}

export function AlarmsApp({ onExit, handle }: AppProps) {
  const [toast, setToast] = useState<Toast | null>(null)
  const toastKey = useRef(0)

  // The phone confirms every alarm that is switched on with how far away it is.
  const announce = (alarm: Alarm) => {
    const ring = nextRing(alarm)
    if (!ring) return
    setToast({ key: ++toastKey.current, text: `set for ${durationText(ring.getTime() - Date.now())} from now` })
  }

  const render = (route: string) => {
    if (route.startsWith('alarm:')) return <AlarmEditor id={route.slice(6)} onSaved={announce} />
    return <AlarmList onEnabled={announce} />
  }

  return (
    <>
      <PageStack enter initialRoute="list" render={render} onExit={onExit} handle={handle} />
      {toast && <AlarmToast key={toast.key} text={toast.text} onDone={() => setToast(null)} />}
    </>
  )
}

function AlarmToast({ text, onDone }: { text: string; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })
  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), 4000)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="alarms-toast" role="status" onClick={() => onDoneRef.current()}>
      <span className="alarms-toast-title">Alarm</span> {text}
    </div>
  )
}

function splitTime(hour: number, minute: number) {
  return { clock: `${hour % 12 || 12}:${String(minute).padStart(2, '0')}`, ampm: hour < 12 ? 'AM' : 'PM' }
}

function AlarmList({ onEnabled }: { onEnabled: (alarm: Alarm) => void }) {
  const alarms = useStore(alarmsStore)
  const { navigate } = useNavigation()
  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))

  const setEnabled = (alarm: Alarm, enabled: boolean) => {
    const next = { ...alarm, enabled, snoozeUntil: undefined }
    alarmsStore.set((list) => list.map((a) => (a.id === alarm.id ? next : a)))
    if (enabled) onEnabled(next)
  }

  return (
    <div className="app-page">
      <div className="alarms-title">alarms</div>
      <div className="alarms-scroll">
        {sorted.length === 0 && <p className="alarms-empty">Tap new to add an alarm.</p>}
        {sorted.map((alarm) => (
          <AlarmRow
            key={alarm.id}
            alarm={alarm}
            onOpen={() => navigate(`alarm:${alarm.id}`)}
            onToggle={(on) => setEnabled(alarm, on)}
          />
        ))}
      </div>
      <AppBar buttons={[{ icon: 'add', label: 'new', onTap: () => navigate('alarm:new') }]} />
    </div>
  )
}

function AlarmRow({ alarm, onOpen, onToggle }: { alarm: Alarm; onOpen: () => void; onToggle: (on: boolean) => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  const { clock, ampm } = splitTime(alarm.hour, alarm.minute)
  const snoozed = alarm.snoozeUntil !== undefined
  return (
    <div className="alarms-row" data-off={!alarm.enabled && !snoozed}>
      <button
        type="button"
        ref={ref}
        {...handlers}
        className="alarms-row-main"
        onClick={(e) => {
          if (e.detail === 0) onOpen()
        }}
      >
        <span className="alarms-row-time">
          {clock}
          <span className="alarms-row-ampm">{ampm}</span>
        </span>
        <span className="alarms-row-name">{alarm.name || 'Alarm'}</span>
        <span className="alarms-row-repeat">
          {snoozed ? `snoozed until ${formatClock(alarm.snoozeUntil!)}` : repeatSummary(alarm.days)}
        </span>
      </button>
      <AlarmSwitch checked={alarm.enabled || snoozed} label={`${clock} ${ampm} alarm`} onChange={onToggle} />
    </div>
  )
}

const formatClock = (ms: number) => {
  const d = new Date(ms)
  const { clock, ampm } = splitTime(d.getHours(), d.getMinutes())
  return `${clock} ${ampm}`
}

// The toggle switch without its header and on/off text, sized for a list row.
function AlarmSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="alarms-switch"
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="alarms-switch-track" aria-hidden>
        <span className="alarms-switch-fill" />
        <span className="alarms-switch-thumb" />
      </span>
    </button>
  )
}

function newAlarm(): Alarm {
  const now = new Date()
  return { id: newId(), hour: now.getHours(), minute: now.getMinutes(), name: 'Alarm', days: [], enabled: true, sound: 'Beep' }
}

function AlarmEditor({ id, onSaved }: { id: string; onSaved: (alarm: Alarm) => void }) {
  const { back } = useNavigation()
  const isNew = id === 'new'
  const [draft, setDraft] = useState<Alarm>(() => (isNew ? undefined : alarmsStore.get().find((a) => a.id === id)) ?? newAlarm())
  const stopPreview = useRef<(() => void) | null>(null)
  const update = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => () => stopPreview.current?.(), [])

  const preview = (sound: string) => {
    stopPreview.current?.()
    const stop = playSound(sound, false)
    stopPreview.current = stop
    window.setTimeout(stop, 3500)
  }

  const save = () => {
    const saved: Alarm = { ...draft, name: draft.name.trim(), enabled: true, snoozeUntil: undefined }
    alarmsStore.set((list) => (list.some((a) => a.id === saved.id) ? list.map((a) => (a.id === saved.id ? saved : a)) : [...list, saved]))
    onSaved(saved)
    back()
  }

  const remove = () => {
    back()
    // Removing after the page has turned away keeps it from going blank mid-transition.
    window.setTimeout(() => alarmsStore.set((list) => list.filter((a) => a.id !== draft.id)), motionMs(300))
  }

  return (
    <div className="app-page">
      <div className="alarms-title">{isNew ? 'new alarm' : 'edit alarm'}</div>
      <div className="alarms-scroll alarms-form">
        <TimePicker header="Time" hour={draft.hour} minute={draft.minute} onChange={(hour, minute) => update({ hour, minute })} />
        <RepeatField days={draft.days} onChange={(days) => update({ days })} />
        <ListPicker
          header="Sound"
          options={ALARM_SOUNDS.map((s) => ({ value: s, label: s }))}
          value={draft.sound}
          onChange={(sound) => {
            update({ sound })
            preview(sound)
          }}
        />
        <label className="alarms-field">
          <span className="alarms-field-header">Name</span>
          <input
            className="alarms-textbox"
            value={draft.name}
            maxLength={40}
            onChange={(e) => update({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
        </label>
      </div>
      <AppBar
        buttons={[
          { icon: 'save', label: 'save', onTap: save },
          ...(isNew ? [] : [{ icon: 'delete' as const, label: 'delete', onTap: remove }]),
        ]}
      />
    </div>
  )
}

function RepeatField({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const show = () => setOpen(true)
  const { ref, handlers } = useTilt<HTMLButtonElement>(show)
  const summary = repeatSummary(days)
  return (
    <div className="dt-field">
      <div className="dt-header">Repeats</div>
      <button
        type="button"
        ref={ref}
        {...handlers}
        className="dt-box alarms-repeat-box"
        aria-label={`Repeats: ${summary}`}
        onClick={(e) => {
          if (e.detail === 0) show()
        }}
      >
        {summary}
      </button>
      {open && (
        <FullScreenPopup label="Repeats on" onClosed={() => setOpen(false)}>
          <RepeatDays initial={days} onDone={onChange} />
        </FullScreenPopup>
      )}
    </div>
  )
}

function RepeatDays({ initial, onDone }: { initial: number[]; onDone: (days: number[]) => void }) {
  const close = usePopupClose()
  const [selected, setSelected] = useState(() => new Set(initial))
  const toggle = (day: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  return (
    <div className="app-page">
      <div className="dt-page-title">repeats on</div>
      <div className="alarms-days">
        {WEEKDAYS.map((name, day) => (
          <DayCheck key={name} label={name} checked={selected.has(day)} onToggle={() => toggle(day)} />
        ))}
      </div>
      <AppBar
        buttons={[
          {
            icon: 'check',
            label: 'done',
            onTap: () => {
              onDone([...selected].sort((a, b) => a - b))
              close()
            },
          },
          { icon: 'close', label: 'cancel', onTap: close },
        ]}
      />
    </div>
  )
}

function DayCheck({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onToggle)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      ref={ref}
      {...handlers}
      className="alarms-check"
      onClick={(e) => {
        if (e.detail === 0) onToggle()
      }}
    >
      <span className="alarms-check-box" aria-hidden>
        {checked && (
          <PhIcon name="check-bold" size={24} />
        )}
      </span>
      <span className="alarms-check-label">{label}</span>
    </button>
  )
}
