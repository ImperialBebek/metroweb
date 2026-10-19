import { useCallback, useRef, type PointerEvent } from 'react'

// Port of the Windows Phone Toolkit TiltEffect: the element tips toward the
// finger and sinks in, then springs back after a short delay.
const MAX_ANGLE = 0.3 // radians
const MAX_DEPRESSION = 25 // px
const RETURN_DELAY = 200 // ms
const RETURN_DURATION = 100 // ms
const TAP_SLOP = 12 // px of movement before a press becomes a pan

function tiltTransform(el: HTMLElement, clientX: number, clientY: number): string {
  const rect = el.getBoundingClientRect()
  const nx = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
  const ny = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1)
  const xMagnitude = Math.abs(nx - 0.5)
  const yMagnitude = Math.abs(ny - 0.5)
  const xDirection = -Math.sign(nx - 0.5)
  const yDirection = Math.sign(ny - 0.5)
  const magnitude = xMagnitude + yMagnitude
  const xContribution = magnitude > 0 ? xMagnitude / magnitude : 0
  const angle = (magnitude * MAX_ANGLE * 180) / Math.PI
  const depression = (1 - magnitude) * MAX_DEPRESSION
  // PlaneProjection rotations are negated in CSS.
  const rotationY = -(angle * xContribution * xDirection)
  const rotationX = -(angle * (1 - xContribution) * yDirection)
  return `perspective(1000px) translateZ(${-depression}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`
}

interface Press {
  pointerId: number
  x: number
  y: number
  cancelled: boolean
}

export function useTilt<T extends HTMLElement>(onTap?: (element: T) => void, enabled = true) {
  const ref = useRef<T>(null)
  const press = useRef<Press | null>(null)
  const returning = useRef<Animation | null>(null)

  const release = useCallback((delay: number) => {
    const el = ref.current
    if (!el || !el.style.transform) return
    const from = el.style.transform
    el.style.transform = ''
    returning.current = el.animate([{ transform: from }, { transform: 'none' }], {
      delay,
      duration: RETURN_DURATION,
      fill: 'backwards',
    })
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent<T>) => {
      if (!enabled || e.button !== 0 || !ref.current) return
      returning.current?.cancel()
      press.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, cancelled: false }
      ref.current.style.transform = tiltTransform(ref.current, e.clientX, e.clientY)
    },
    [enabled],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      const p = press.current
      if (!p || p.pointerId !== e.pointerId || p.cancelled || !ref.current) return
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP) {
        p.cancelled = true
        release(0)
        return
      }
      ref.current.style.transform = tiltTransform(ref.current, e.clientX, e.clientY)
    },
    [release],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent<T>) => {
      const p = press.current
      if (!p || p.pointerId !== e.pointerId) return
      press.current = null
      if (p.cancelled) return
      release(RETURN_DELAY)
      if (ref.current) onTap?.(ref.current)
    },
    [onTap, release],
  )

  const onPointerCancel = useCallback(() => {
    press.current = null
    release(0)
  }, [release])

  return {
    ref,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave: onPointerCancel },
  }
}
