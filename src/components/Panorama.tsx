import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { EXPO_OUT_6, prefersReducedMotion } from '../motion'
import { motionMs } from '../motionSpeed'
import './panorama.css'

export interface PanoramaSection {
  key: string
  header: string
  content: ReactNode
}

// Each section is narrower than the screen so the next one's header peeks in.
const SECTION_WIDTH = 432
const SCREEN_WIDTH = 480
const LOCK_DISTANCE = 14
const COMMIT_FRACTION = 0.2
const FLICK_VELOCITY = 0.45 // px per ms
const SNAP_MS = 450
// The title and background move slower than the sections (parallax).
const TITLE_TRAVEL = 0.5 // of the title's width, over all sections
const BACKGROUND_TRAVEL = 160 // px
// Panorama*IntroSlideInXOffset, fitted to WP8 Games hub footage: the title
// travels ~1.33x the sections and the background ~0.85x.
const INTRO_OFFSET = { background: 1040, title: 1640, content: 1240 }

const mod = (n: number, m: number) => ((n % m) + m) % m

// Controls that use the arrow keys themselves.
const ownsArrows = (t: EventTarget) =>
  t instanceof HTMLInputElement ||
  t instanceof HTMLTextAreaElement ||
  (t instanceof HTMLElement && (t.isContentEditable || /^(slider|spinbutton|listbox|tab)$/.test(t.getAttribute('role') ?? '')))
const expoOut = (t: number) => 1 - (Math.exp(6 * (1 - t)) - 1) / (Math.exp(6) - 1)

interface Drag {
  pointerId: number
  startX: number
  startY: number
  startOffset: number
  scale: number
  axis: 'none' | 'x' | 'y'
  lastX: number
  lastT: number
  velocity: number
}

// A wrapping panorama: sections slide by under a big title and a background
// picture that both lag behind; swiping on from the last section wraps to the first.
export function Panorama({
  title,
  background,
  sections,
}: {
  title: string
  background?: string
  sections: PanoramaSection[]
}) {
  const count = sections.length
  const total = count * SECTION_WIDTH
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(0)
  const [settling, setSettling] = useState(false)
  const offsetRef = useRef(0)
  const frame = useRef(0)
  const drag = useRef<Drag | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const [titleWidth, setTitleWidth] = useState(0)
  const headers = useRef<(HTMLHeadingElement | null)[]>([])
  const focusHeader = useRef(false)

  useLayoutEffect(() => {
    if (!focusHeader.current) return
    focusHeader.current = false
    headers.current[selected]?.focus({ preventScroll: true })
  }, [selected])

  useLayoutEffect(() => {
    const measure = () => setTitleWidth(titleRef.current?.offsetWidth ?? 0)
    measure()
    document.fonts?.ready.then(measure)
  }, [title])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const move = (value: number) => {
    offsetRef.current = value
    setOffset(value)
  }

  const snapTo = (target: number) => {
    cancelAnimationFrame(frame.current)
    setSelected(mod(Math.round(target / SECTION_WIDTH), count))
    const from = offsetRef.current
    if (prefersReducedMotion() || from === target) {
      move(mod(target, total))
      return
    }
    setSettling(true)
    const start = performance.now()
    const duration = motionMs(SNAP_MS)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      if (t < 1) {
        move(from + (target - from) * expoOut(t))
        frame.current = requestAnimationFrame(step)
      } else {
        move(mod(target, total))
        setSettling(false)
      }
    }
    frame.current = requestAnimationFrame(step)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (count < 2 || e.button !== 0) return
    if (frame.current) {
      // Catch a settling panorama where it is.
      cancelAnimationFrame(frame.current)
      frame.current = 0
      move(mod(offsetRef.current, total))
      setSettling(false)
    }
    const el = e.currentTarget
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offsetRef.current,
      scale: el.getBoundingClientRect().width / el.offsetWidth || 1,
      axis: 'none',
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const mx = (e.clientX - d.startX) / d.scale
    const my = (e.clientY - d.startY) / d.scale
    if (d.axis === 'none') {
      if (Math.abs(mx) > LOCK_DISTANCE && Math.abs(mx) > Math.abs(my)) {
        d.axis = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
      } else if (Math.abs(my) > LOCK_DISTANCE) {
        d.axis = 'y'
      }
    }
    if (d.axis !== 'x') return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / d.scale / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    move(d.startOffset - Math.max(-SECTION_WIDTH, Math.min(SECTION_WIDTH, mx)))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (d.axis !== 'x') {
      if (offsetRef.current % SECTION_WIDTH !== 0) snapTo(Math.round(offsetRef.current / SECTION_WIDTH) * SECTION_WIDTH)
      return
    }
    const moved = d.startOffset - offsetRef.current
    const base = Math.round(d.startOffset / SECTION_WIDTH)
    let direction = 0
    if (moved < -SECTION_WIDTH * COMMIT_FRACTION || d.velocity < -FLICK_VELOCITY) direction = 1
    else if (moved > SECTION_WIDTH * COMMIT_FRACTION || d.velocity > FLICK_VELOCITY) direction = -1
    snapTo((base + direction) * SECTION_WIDTH)
  }

  // Not on the phone: arrow keys move a section at a time, and focus follows
  // to the new section's header.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step || count < 2 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || ownsArrows(e.target)) return
    e.preventDefault()
    if (drag.current) return
    focusHeader.current = true
    snapTo((Math.round(offsetRef.current / SECTION_WIDTH) + step) * SECTION_WIDTH)
  }

  // While settling, the title and background glide (with a CSS transition)
  // straight to the target section's position, so wrapping from the last
  // section back to the first slides them back rather than jumping.
  const lastStart = (count - 1) * SECTION_WIDTH
  const progressOffset = settling ? selected * SECTION_WIDTH : Math.min(Math.max(offset, 0), lastStart)
  const progress = lastStart ? progressOffset / lastStart : 0
  const layerTransition = settling ? `transform ${SNAP_MS + 150}ms ${EXPO_OUT_6}` : 'none'

  return (
    <div
      className="pano"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {background && (
        <div
          className="pano-bg"
          data-intro={INTRO_OFFSET.background}
          style={{
            width: SCREEN_WIDTH + BACKGROUND_TRAVEL,
            backgroundImage: `url(${background})`,
            transform: `translateX(${-progress * BACKGROUND_TRAVEL}px)`,
            transition: layerTransition,
          }}
        >
          <div className="pano-dim" />
        </div>
      )}
      <div
        className="pano-title"
        ref={titleRef}
        data-intro={INTRO_OFFSET.title}
        style={{ transform: `translateX(${-progress * titleWidth * TITLE_TRAVEL}px)`, transition: layerTransition }}
      >
        {/* The layer carries the parallax transform; the text inside feathers. */}
        <span data-feather>{title}</span>
      </div>
      {sections.map((section, i) => {
        const left = mod(i * SECTION_WIDTH - offset + SECTION_WIDTH, total) - SECTION_WIDTH
        // The section just off the left edge shows during the hub intro.
        const near = left >= -SECTION_WIDTH && left < SCREEN_WIDTH
        return (
          <section
            key={section.key}
            className="pano-section"
            data-intro={INTRO_OFFSET.content}
            style={{ transform: `translateX(${left}px)`, visibility: near ? undefined : 'hidden' }}
            inert={i !== selected}
            aria-hidden={i !== selected}
          >
            <h2
              className="pano-header"
              data-feather
              ref={(el) => {
                headers.current[i] = el
              }}
              tabIndex={count > 1 ? (i === selected ? 0 : -1) : undefined}
              aria-keyshortcuts={count > 1 ? 'ArrowLeft ArrowRight' : undefined}
            >
              {section.header}
            </h2>
            <div className="pano-content">{section.content}</div>
          </section>
        )
      })}
    </div>
  )
}
