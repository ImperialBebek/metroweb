import type { MouseEvent } from 'react'
import { useTilt } from '../../components/useTilt'

// Tilt plus keyboard activation: pointer taps fire from the tilt's pointerup,
// Enter/Space arrive as clicks with detail 0.
export function useTap<T extends HTMLElement>(onTap?: () => void, enabled = true) {
  const { ref, handlers } = useTilt<T>(onTap ? () => onTap() : undefined, enabled)
  return {
    ref,
    ...handlers,
    onClick: (e: MouseEvent<T>) => {
      if (e.detail === 0 && enabled) onTap?.()
    },
  }
}
