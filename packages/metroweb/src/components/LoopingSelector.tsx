import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { prefersReducedMotion } from '../motion.ts'
import { motionMs } from '../motionSpeed.ts'

// Toolkit LoopingSelector: a column of square items. At rest only the selected
// item shows; touching the column reveals the rest so it can be spun.
const ITEM = 148
const STEP = ITEM + 12
const TAP_SLOP = 8
const SETTLE_MS = 320

const mod = (n: number, m: number) => ((n % m) + m) % m
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

interface Drag {
  pointerId: number
  startY: number
  startOffset: number
  scale: number
  lastY: number
  lastT: number
  velocity: number
  moved: boolean
  wasActive: boolean
}

export function LoopingSelector({
  label,
  count,
  value,
  onChange,
  renderItem,
  loop = true,
  active,
  onActivate,
}: {
  label: string
  count: number
  value: number
  onChange: (index: number) => void
  renderItem: (index: number) => ReactNode
  loop?: boolean
  active: boolean
  onActivate: () => void
}) {
  const [offset, setOffset] = useState(value)
  const [height, setHeight] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const settling = useRef(false)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Follow value changes made from outside (e.g. the day clamped after the month changed).
  useEffect(() => {
    if (drag.current || settling.current) return
    setOffset((o) => (mod(Math.round(o), count) === value ? o : value))
  }, [value, count])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const clamp = (o: number) => (loop ? o : Math.max(0, Math.min(count - 1, o)))

  const settleTo = (from: number, target: number) => {
    cancelAnimationFrame(frame.current)
    const finish = () => {
      settling.current = false
      const index = loop ? mod(target, count) : target
      setOffset(index)
      if (index !== value) onChange(index)
    }
    if (prefersReducedMotion() || from === target) {
      finish()
      return
    }
    settling.current = true
    const start = performance.now()
    const duration = motionMs(SETTLE_MS)
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setOffset(from + (target - from) * easeOut(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else finish()
    }
    frame.current = requestAnimationFrame(tick)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    cancelAnimationFrame(frame.current)
    settling.current = false
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: offset,
      scale: el.getBoundingClientRect().height / el.offsetHeight || 1,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      moved: false,
      wasActive: active,
    }
    onActivate()
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dy = (e.clientY - d.startY) / d.scale
    if (!d.moved && Math.abs(dy) < TAP_SLOP) return
    d.moved = true
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = -((e.clientY - d.lastY) / d.scale / STEP) / dt
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    let o = d.startOffset - dy / STEP
    if (!loop) {
      if (o < 0) o /= 3
      if (o > count - 1) o = count - 1 + (o - count + 1) / 3
    }
    setOffset(o)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (!d.moved) {
      // Tapping a neighbouring item in an open column spins to it.
      if (!d.wasActive || !root.current) return
      const rect = root.current.getBoundingClientRect()
      const y = (e.clientY - rect.top) / d.scale - height / 2
      settleTo(offset, clamp(Math.round(offset + y / STEP)))
      return
    }
    settleTo(offset, clamp(Math.round(offset + d.velocity * 250)))
  }

  const step = (delta: number) => settleTo(offset, clamp(Math.round(offset) + delta))

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (settling.current || Math.abs(e.deltaY) < 4) return
    onActivate()
    step(Math.sign(e.deltaY))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') step(1)
    else if (e.key === 'ArrowUp') step(-1)
    else return
    e.preventDefault()
    onActivate()
  }

  const reach = Math.ceil(height / 2 / STEP) + 1
  const centre = Math.round(offset)
  const items: ReactNode[] = []
  for (let k = centre - reach; k <= centre + reach; k++) {
    if (!loop && (k < 0 || k >= count)) continue
    const index = mod(k, count)
    items.push(
      <div
        key={k}
        className="ls-item"
        data-selected={k === centre || undefined}
        style={{ transform: `translateY(${height / 2 - ITEM / 2 + (k - offset) * STEP}px)` }}
      >
        {renderItem(index)}
      </div>,
    )
  }

  return (
    <div
      ref={root}
      className="ls"
      data-active={active || undefined}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onFocus={onActivate}
    >
      {items}
    </div>
  )
}
