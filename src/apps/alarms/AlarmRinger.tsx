import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useModal } from '../../components/modal'
import { useTilt } from '../../components/useTilt'
import { alarmsStore, nextRing, SNOOZE_MINUTES, type Alarm } from '../../data/alarms'
import { PhIcon } from '../../icons/PhIcon'
import { prefersReducedMotion, swivel } from '../../motion'
import { audioContext, playSound } from './sounds'
import './alarms.css'

// Rings that come due while the tab sleeps still sound on wake if they are this
// recent; older ones are dropped rather than ringing hours late.
const LATE_LIMIT = 30 * 60_000
// Left ringing, the phone snoozes the alarm by itself.
const AUTO_SNOOZE = 10 * 60_000

interface Ringing {
  alarm: Alarm
  at: number
}

// Finds alarms (and snoozes) that came due in (last, now], and turns one-off
// alarms off once they have rung.
function collectDue(last: number, now: number): Ringing[] {
  const due: Ringing[] = []
  let changed = false
  const next = alarmsStore.get().map((alarm) => {
    let ringAt: number | null = null
    let updated = alarm
    const scheduled = nextRing(alarm, new Date(last))
    if (scheduled && scheduled.getTime() <= now) {
      ringAt = scheduled.getTime()
      if (alarm.days.length === 0) updated = { ...updated, enabled: false }
    }
    if (alarm.snoozeUntil !== undefined && alarm.snoozeUntil <= now) {
      ringAt = Math.max(ringAt ?? 0, alarm.snoozeUntil)
      updated = { ...updated, snoozeUntil: undefined }
    }
    if (ringAt === null) return alarm
    changed = true
    if (now - ringAt < LATE_LIMIT) due.push({ alarm: updated, at: ringAt })
    return updated
  })
  if (changed) alarmsStore.set(next)
  return due
}

const canVibrate = () =>
  typeof navigator.vibrate === 'function' && (navigator.userActivation?.hasBeenActive ?? true)

// Rings due alarms while the page is open, over whatever app is running.
export function AlarmRinger() {
  const [queue, setQueue] = useState<Ringing[]>([])

  useEffect(() => {
    const unlock = () => {
      audioContext()
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      if (now > last) {
        const due = collectDue(last, now)
        if (due.length) {
          setQueue((q) => [...q, ...due.filter((d) => !q.some((r) => r.alarm.id === d.alarm.id))])
        }
      }
      last = now
    }
    const timer = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [])

  const finish = useCallback((ringing: Ringing, snooze: boolean) => {
    if (snooze) {
      const until = Date.now() + SNOOZE_MINUTES * 60_000
      alarmsStore.set((list) => list.map((a) => (a.id === ringing.alarm.id ? { ...a, snoozeUntil: until } : a)))
    }
    setQueue((q) => q.filter((r) => r !== ringing))
  }, [])

  const current = queue[0]
  if (!current) return null
  return <RingScreen key={`${current.alarm.id}:${current.at}`} ringing={current} onFinish={finish} />
}

function RingScreen({ ringing, onFinish }: { ringing: Ringing; onFinish: (ringing: Ringing, snooze: boolean) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const leaving = useRef(false)
  const { alarm, at } = ringing
  useModal(el, '[data-dismiss]')

  const leave = useCallback(
    (snooze: boolean) => {
      if (leaving.current) return
      leaving.current = true
      const node = el.current
      if (!node || prefersReducedMotion()) {
        onFinish(ringing, snooze)
        return
      }
      swivel(node, 'out').finished.then(
        () => onFinish(ringing, snooze),
        () => onFinish(ringing, snooze),
      )
    },
    [onFinish, ringing],
  )

  useLayoutEffect(() => {
    if (!el.current || prefersReducedMotion()) return
    const anim = swivel(el.current, 'in')
    anim.finished.then(() => anim.cancel()).catch(() => {})
  }, [])

  useEffect(() => {
    const stop = playSound(alarm.sound, true)
    const vibrate = () => {
      if (canVibrate()) navigator.vibrate([700, 500, 700])
    }
    vibrate()
    const buzz = window.setInterval(vibrate, 2600)
    const auto = window.setTimeout(() => leave(true), AUTO_SNOOZE)
    return () => {
      stop()
      window.clearInterval(buzz)
      window.clearTimeout(auto)
      if (canVibrate()) navigator.vibrate(0)
    }
  }, [alarm.sound, leave])

  const d = new Date(at)
  const hour = d.getHours()
  const clock = `${hour % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="alarms-ring" ref={el} role="alertdialog" aria-modal aria-label={`${alarm.name || 'Alarm'}, ${clock}`}>
      <div className="alarms-ring-label">
        <PhIcon name="alarm" size={32} />
        <span>alarm</span>
      </div>
      <div className="alarms-ring-name">{alarm.name || 'Alarm'}</div>
      <div className="alarms-ring-time">
        <span>{clock}</span>
        <span className="alarms-ring-ampm">{hour < 12 ? 'AM' : 'PM'}</span>
      </div>
      <div className="alarms-ring-date">{date}</div>
      <div className="alarms-ring-spacer" />
      <div className="alarms-ring-buttons">
        <RingButton label="snooze" onTap={() => leave(true)} />
        <RingButton label="dismiss" dismiss onTap={() => leave(false)} />
      </div>
      <div className="alarms-ring-hint">snooze for {SNOOZE_MINUTES} minutes</div>
    </div>
  )
}

function RingButton({ label, onTap, dismiss = false }: { label: string; onTap: () => void; dismiss?: boolean }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="alarms-ring-button"
      data-dismiss={dismiss || undefined}
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      {label}
    </button>
  )
}
