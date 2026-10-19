import { newId, persistentStore } from './persist'

export interface Call {
  id: string
  number: string
  time: number
  kind: 'incoming' | 'outgoing' | 'missed'
  // Seconds; 0 for missed calls.
  duration: number
  // Missed calls stay counted on the Phone tile until the history is viewed.
  seen: boolean
}

export const callsStore = persistentStore<Call[]>('calls', () => {
  const now = Date.now()
  const hour = 3_600_000
  return [
    { id: 'k1', number: '(425) 555-0113', time: now - 2 * hour, kind: 'missed', duration: 0, seen: false },
    { id: 'k4', number: '(425) 555-0114', time: now - 5 * hour, kind: 'outgoing', duration: 47, seen: true },
    { id: 'k2', number: '(425) 555-0110', time: now - 20 * hour, kind: 'incoming', duration: 312, seen: true },
    { id: 'k3', number: '(425) 555-0111', time: now - 30 * hour, kind: 'outgoing', duration: 95, seen: true },
    { id: 'k5', number: '(206) 555-0142', time: now - 52 * hour, kind: 'missed', duration: 0, seen: true },
    { id: 'k6', number: '(425) 555-0112', time: now - 75 * hour, kind: 'incoming', duration: 1260, seen: true },
  ]
})

export const missedCallCount = (calls: Call[]) => calls.filter((c) => c.kind === 'missed' && !c.seen).length

export function logCall(number: string, kind: Call['kind'], time: number, duration: number) {
  callsStore.set((calls) => [{ id: newId(), number, time, kind, duration, seen: kind !== 'missed' }, ...calls])
}

export function markMissedSeen() {
  if (missedCallCount(callsStore.get()) === 0) return
  callsStore.set((calls) => calls.map((c) => (c.kind === 'missed' && !c.seen ? { ...c, seen: true } : c)))
}

export const clearCalls = () => callsStore.set([])

// mm:ss, or h:mm:ss for calls over an hour.
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`
}

// North American formatting as digits are dialled; anything with * or # (or
// an international + number) is left as typed.
export function formatNumber(raw: string): string {
  if (!/^\d+$/.test(raw)) return raw
  const d = raw
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return d
}
