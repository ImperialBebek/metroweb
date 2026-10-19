import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
}

const PREFIX = 'wp8-'

// A value kept in localStorage and shared by every component that reads it,
// so a live tile updates as soon as its app changes the data.
export function persistentStore<T>(key: string, seed: () => T): Store<T> {
  const storageKey = PREFIX + key
  const listeners = new Set<() => void>()
  const read = (): T => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
      // Unreadable or blocked storage: start from the seed.
    }
    return seed()
  }
  let value = read()
  const emit = () => listeners.forEach((listener) => listener())
  window.addEventListener('storage', (e) => {
    if (e.key !== storageKey) return
    value = read()
    emit()
  })
  return {
    get: () => value,
    set: (next) => {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      try {
        localStorage.setItem(storageKey, JSON.stringify(value))
      } catch {
        // Quota or private mode: keep the change in memory for this visit.
      }
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

// Seed data is laid out relative to the first visit, so "today" stays today.
export function dayStart(offsetDays = 0, from = new Date()): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d
}

export const at = (day: Date, hour: number, minute = 0) => {
  const d = new Date(day)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}
