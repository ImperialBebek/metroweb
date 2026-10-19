import { useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react'

// Open popups, oldest first. Only the newest takes input; the shell makes the
// screen behind all of them inert.
const stack: HTMLElement[] = []
const listeners = new Set<() => void>()

const update = () => {
  stack.forEach((el, i) => {
    el.inert = i < stack.length - 1
  })
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useModalOpen = () => useSyncExternalStore(subscribe, () => stack.length > 0)

const FOCUSABLE = 'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, textarea, select, a[href]'

// For a popup's root element. While it is mounted the screen behind is inert;
// on open, focus moves to `initial` (a selector, which may match the root
// itself) or the first focusable element inside, and on close it goes back to
// whatever had it before.
export function useModal(root: RefObject<HTMLElement | null>, initial?: string) {
  const [opener] = useState(() => document.activeElement)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    stack.push(el)
    update()
    if (!el.contains(document.activeElement)) {
      const chosen = initial && (el.matches(initial) ? el : el.querySelector<HTMLElement>(initial))
      const target = chosen || el.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus({ preventScroll: true })
    }
    return () => {
      stack.splice(stack.indexOf(el), 1)
      el.inert = false
      update()
      // A frame later, once the screen behind is no longer inert.
      requestAnimationFrame(() => {
        if (!(opener instanceof HTMLElement) || !opener.isConnected || opener.closest('[inert]')) return
        const active = document.activeElement
        if (active && active !== document.body) return
        opener.focus({ preventScroll: true })
      })
    }
  }, [root, initial, opener])
}
