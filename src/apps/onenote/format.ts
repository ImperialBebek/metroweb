import { formatShortDate, formatTimeOfDay } from '../../format'

const DAY = 86_400_000

const timeOf = (d: Date) => formatTimeOfDay(d.getHours(), d.getMinutes())

const midnight = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// How the lists date a page: the time today, then "yesterday", the weekday
// for the past week, and the short date after that, all lower case.
export function listDate(t: number, now = Date.now()): string {
  const days = Math.round((midnight(now) - midnight(t)) / DAY)
  const d = new Date(t)
  if (days <= 0) return timeOf(d)
  if (days === 1) return 'yesterday'
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  return formatShortDate(d)
}

export function longDate(t: number): string {
  const d = new Date(t)
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return `${date}  ${timeOf(d)}`
}
