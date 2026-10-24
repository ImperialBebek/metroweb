import { persistentStore } from './persist'

export interface Alarm {
  id: string
  hour: number
  minute: number
  name: string
  // Days of the week it repeats on (0 = Sunday); empty means it rings once.
  days: number[]
  enabled: boolean
  sound: string
  // Epoch ms of a pending snooze; it rings then even if the alarm was a one-off that has since turned off.
  snoozeUntil?: number
}

export const ALARM_SOUNDS = ['Beep', 'Chimes', 'Pulse', 'Sunrise'] as const

export const SNOOZE_MINUTES = 9

export const alarmsStore = persistentStore<Alarm[]>('alarms', () => [
  { id: 'a1', hour: 7, minute: 0, name: 'Alarm', days: [1, 2, 3, 4, 5], enabled: false, sound: 'Beep' },
])

// The next time the alarm will ring, or null when it is off.
export function nextRing(alarm: Alarm, now = new Date()): Date | null {
  if (!alarm.enabled) return null
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(alarm.hour, alarm.minute, 0, 0)
    if (d <= now) continue
    if (alarm.days.length === 0 || alarm.days.includes(d.getDay())) return d
  }
  return null
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function repeatSummary(days: number[]): string {
  const set = new Set(days)
  if (set.size === 0) return 'only once'
  if (set.size === 7) return 'every day'
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'weekdays'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'weekends'
  // The phone lists the week from Monday.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => set.has(d))
    .map((d) => SHORT_DAYS[d])
    .join(', ')
}

// "8 hours 5 minutes", the wording of the phone's alarm-set toast.
export function durationText(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  const parts: string[] = []
  if (days) parts.push(part(days, 'day'))
  if (hours) parts.push(part(hours, 'hour'))
  if (minutes && !days) parts.push(part(minutes, 'minute'))
  return parts.join(' ')
}
