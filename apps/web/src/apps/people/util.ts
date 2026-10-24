import { digits, displayName, type Contact } from '../../data/contacts'
import { formatShortDate, formatTimeOfDay } from 'metroweb'

export const LETTERS = ['#', ...'abcdefghijklmnopqrstuvwxyz']

// Number-only contacts still need something to show and sort by.
export const nameOf = (c: Contact) => displayName(c) || c.mobile || c.work || c.email || 'unnamed'

export function letterOf(c: Contact): string {
  const ch = nameOf(c).normalize('NFD').charAt(0).toLowerCase()
  return ch >= 'a' && ch <= 'z' ? ch : '#'
}

export const byName = (a: Contact, b: Contact) => nameOf(a).localeCompare(nameOf(b), 'en', { sensitivity: 'base' })

export function groupByLetter(contacts: Contact[]): { letter: string; contacts: Contact[] }[] {
  const groups = new Map<string, Contact[]>()
  for (const c of [...contacts].sort(byName)) {
    const letter = letterOf(c)
    groups.set(letter, [...(groups.get(letter) ?? []), c])
  }
  return LETTERS.filter((l) => groups.has(l)).map((letter) => ({ letter, contacts: groups.get(letter)! }))
}

// A stable shade per contact, so a picture keeps its colour between screens.
export function shadeOf(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 4
}

export function matchesQuery(c: Contact, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  if ([nameOf(c), c.email, c.company].some((s) => s?.toLowerCase().includes(q))) return true
  const d = digits(q)
  return d.length > 0 && [c.mobile, c.work].some((n) => n && digits(n).includes(d))
}

export function numberKind(c: Contact | undefined, number: string): 'mobile' | 'work' | undefined {
  if (!c) return undefined
  const d = digits(number)
  if (c.mobile && digits(c.mobile) === d) return 'mobile'
  if (c.work && digits(c.work) === d) return 'work'
  return undefined
}

// Routes carry one argument, which may be a phone number with spaces and parentheses.
export const route = (name: string, arg = '') => `${name}:${encodeURIComponent(arg)}`

export function parseRoute(value: string): { name: string; arg: string } {
  const i = value.indexOf(':')
  return i < 0 ? { name: value, arg: '' } : { name: value.slice(0, i), arg: decodeURIComponent(value.slice(i + 1)) }
}

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatBirthday = (iso: string) =>
  parseIsoDate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// How the phone labels a time in lists: the time today, then "yesterday",
// the weekday for the last week, and a short date after that.
export function whenLabel(time: number, now = Date.now()): string {
  const d = new Date(time)
  const day = new Date(time).setHours(0, 0, 0, 0)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((today - day) / 86_400_000)
  if (days <= 0) return formatTimeOfDay(d.getHours(), d.getMinutes())
  if (days === 1) return 'yesterday'
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  return formatShortDate(d)
}

// Scrolls the nearest list container so `el` sits at its top.
export function scrollToTop(el: HTMLElement) {
  const container = el.closest<HTMLElement>('.pivot-item, .people-scroll')
  if (!container) return
  let top = 0
  let node: HTMLElement | null = el
  while (node && node !== container) {
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  container.scrollTop = top
}
