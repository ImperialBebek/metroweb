import type { Contact } from '../../data/contacts'
import { contactForNumber, displayName } from '../../data/contacts'
import { formatShortDate, formatTimeOfDay } from '../../format'

const DAY = 86_400_000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function startOfDay(time: number) {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const daysAgo = (time: number) => Math.round((startOfDay(Date.now()) - startOfDay(time)) / DAY)

export const sameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b)

export function timeOfDay(time: number) {
  const d = new Date(time)
  return formatTimeOfDay(d.getHours(), d.getMinutes())
}

// Conversation list: the time today, the weekday this week, then the date.
export function listTime(time: number) {
  const days = daysAgo(time)
  if (days <= 0) return timeOfDay(time)
  if (days < 7) return WEEKDAYS[new Date(time).getDay()].slice(0, 3)
  return formatShortDate(new Date(time))
}

export function dayLabel(time: number) {
  const days = daysAgo(time)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return WEEKDAYS[new Date(time).getDay()]
  return formatShortDate(new Date(time))
}

export function threadName(contacts: Contact[], number: string) {
  const contact = contactForNumber(contacts, number)
  return contact ? displayName(contact) : number
}
