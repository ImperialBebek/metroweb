import { addDays, formatTime, type CalendarEvent } from '../../data/calendar'
import { dayStart } from '../../data/persist'

export const todayStart = () => dayStart().getTime()

export const startOfDay = (ms: number) => dayStart(0, new Date(ms)).getTime()

// "Sunday, October 18": the calendar's pivot title and details-page date.
export const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// Agenda day headers: "today", "tomorrow", then "tuesday, october 20".
export function relativeDay(dayMs: number, today = todayStart()): string {
  if (dayMs === today) return 'today'
  if (dayMs === addDays(today, 1)) return 'tomorrow'
  if (dayMs === addDays(today, -1)) return 'yesterday'
  return longDate(dayMs).toLowerCase()
}

export function timeRange(event: CalendarEvent): string {
  if (event.allDay) return 'all day'
  return `${formatTime(event.start)} to ${formatTime(event.end)}`
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  if (hours === 1) return '1 hour'
  if (Number.isInteger(hours * 2)) return `${hours} hours`
  return `${Math.floor(hours)} hours ${minutes % 60} minutes`
}

// Durations offered by the "how long" picker; ALL_DAY marks an all-day event.
export const ALL_DAY = -1
export const DURATIONS = [30, 60, 90, 120, ALL_DAY]

// Reminder minutes; NO_REMINDER keeps `reminder` undefined.
export const NO_REMINDER = -1
export const REMINDERS = [NO_REMINDER, 5, 15, 30, 60, 1440]

export function reminderLabel(minutes: number | undefined): string {
  if (minutes === undefined || minutes === NO_REMINDER) return 'none'
  if (minutes === 1440) return '1 day'
  if (minutes % 1440 === 0) return `${minutes / 1440} days`
  if (minutes === 60) return '1 hour'
  if (minutes % 60 === 0) return `${minutes / 60} hours`
  return `${minutes} minutes`
}

export const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
