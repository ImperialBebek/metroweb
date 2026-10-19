import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useTilt } from '../components/useTilt'
import { alarmsStore, nextRing, type Alarm } from '../data/alarms'
import { formatTime, eventsStore, upcomingEvents, type CalendarEvent } from '../data/calendar'
import { callsStore, missedCallCount } from '../data/calls'
import { contactsStore, initials } from '../data/contacts'
import { threadsStore, unreadThreadCount } from '../data/messages'
import { ALBUM_BY_ID, ARTIST_BY_ID } from '../data/music'
import { latestNotes, noteSnippet, noteTitle, notesStore } from '../data/notes'
import { useStore } from '../data/persist'
import { SAMPLE_PHOTOS, usePhotos } from '../data/photos'
import { currentTrack, playerStore } from '../data/player'
import { formatTimeOfDay } from '../format'
import { prefersReducedMotion } from '../motion'
import type { AppDef, TileSize } from './apps'
import { Icon } from './icons'
import { flipCell, flipTile } from './tileFlip'

const GLYPH_SIZE: Record<TileSize, number> = { small: 44, medium: 84, wide: 84 }

// Runs `tick` at random intervals while the Start screen is visible, the way
// live tiles stagger their updates (ShellControls GetRandomAnimationDelay).
function useLiveTimer(active: boolean, min: number, max: number, tick: () => void) {
  const tickRef = useRef(tick)
  useLayoutEffect(() => {
    tickRef.current = tick
  })
  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          tickRef.current()
          schedule()
        },
        min + Math.random() * (max - min),
      )
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [active, min, max])
}

// Flip tiles turn over as a whole, background and all.
const wholeTile = (face: HTMLElement) => face.closest<HTMLElement>('.tile-clip') ?? face

function Iconic({ app, size, count }: { app: AppDef; size: TileSize; count?: number }) {
  return (
    <div className="tile-iconic">
      <Icon name={app.glyph} size={GLYPH_SIZE[size]} />
      {count ? <span className="tile-count">{count}</span> : null}
    </div>
  )
}

function Title({ children }: { children: ReactNode }) {
  return <span className="tile-title">{children}</span>
}

function nextAlarmFace(alarms: Alarm[]) {
  let best: { alarm: Alarm; at: Date } | null = null
  for (const alarm of alarms) {
    const at = nextRing(alarm)
    if (at && (!best || at < best.at)) best = { alarm, at }
  }
  if (!best) return null
  const day =
    best.at.toDateString() === new Date().toDateString()
      ? 'today'
      : best.at.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  return { title: 'alarms', lines: [formatTimeOfDay(best.alarm.hour, best.alarm.minute), day] }
}

function FlipContent({ app, size, active }: { app: AppDef; size: TileSize; active: boolean }) {
  const face = useRef<HTMLDivElement>(null)
  const [showBack, setShowBack] = useState(false)
  const notes = useStore(notesStore)
  const alarms = useStore(alarmsStore)
  const latest = app.id === 'onenote' ? latestNotes(notes)[0] : undefined
  const back = latest
    ? { title: noteTitle(latest), lines: [noteSnippet(latest)] }
    : app.live.kind === 'alarm'
      ? nextAlarmFace(alarms)
      : app.live.kind === 'flip'
        ? app.live.back
        : null
  useLiveTimer(active && size !== 'small' && back !== null, 6000, 10000, () => {
    if (face.current) flipTile(wholeTile(face.current), () => setShowBack((b) => !b))
  })
  return (
    <div className="tile-face" ref={face}>
      {showBack && back ? (
        <>
          <div className="tile-back-lines">
            {back.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <Title>{back.title}</Title>
        </>
      ) : (
        <>
          <Iconic app={app} size={size} />
          {size !== 'small' && <Title>{app.title}</Title>}
        </>
      )}
    </div>
  )
}

// TemplatePeople: a FlipGrid of contact pictures (3x3 on a medium tile, 6x3
// on a wide one) where single cells flip to other contacts. Contacts have no
// photos, so each picture is a shaded initials card.
function PeopleContent({ app, size, active }: { app: AppDef; size: TileSize; active: boolean }) {
  const columns = size === 'wide' ? 6 : 3
  const cellCount = columns * 3
  const labels = useStore(contactsStore).map(initials)
  const [cells, setCells] = useState(() => Array.from({ length: cellCount }, (_, i) => i))
  const grid = useRef<HTMLDivElement>(null)
  useLiveTimer(active && size !== 'small' && labels.length > 0, 2200, 4200, () => {
    const index = Math.floor(Math.random() * cellCount)
    const el = grid.current?.children[index] as HTMLElement | undefined
    if (!el) return
    flipCell(el, () =>
      setCells((current) => {
        const shown = current.map((c) => c % labels.length)
        const unused = labels.map((_, i) => i).filter((i) => !shown.includes(i))
        const next = [...current]
        next[index] = unused[Math.floor(Math.random() * unused.length)] ?? current[index]
        return next
      }),
    )
  })
  if (size === 'small' || labels.length === 0) return <Iconic app={app} size={size} />
  return (
    <>
      <div className="people-grid" ref={grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {cells.slice(0, cellCount).map((contact, i) => (
          <span key={i} className="people-cell" data-shade={contact % 4}>
            {labels[contact % labels.length]}
          </span>
        ))}
      </div>
      <Title>{app.title}</Title>
    </>
  )
}

// TemplateCycle: pictures pan up into the tile one after another.
function CycleContent({ app, size, active }: { app: AppDef; size: TileSize; active: boolean }) {
  const { cameraRoll } = usePhotos()
  const frames = [...cameraRoll.slice(0, 6), ...SAMPLE_PHOTOS].map((photo) => ({ src: photo.src, position: '50% 50%' }))
  const [step, setIndex] = useState(0)
  const index = step % frames.length
  const strip = useRef<HTMLDivElement>(null)
  useLiveTimer(active && size !== 'small' && frames.length > 1, 5000, 7000, () => {
    const el = strip.current
    if (!el) return
    const pan = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }], {
      duration: 1200,
      easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
      fill: 'forwards',
    })
    pan.finished
      .then(() => {
        flushSync(() => setIndex((i) => (i + 1) % frames.length))
        pan.cancel()
      })
      .catch(() => {})
  })
  if (size === 'small' || frames.length === 0) return <Iconic app={app} size={size} />
  const current = frames[index]
  const next = frames[(index + 1) % frames.length]
  return (
    <>
      <div className="cycle-strip" ref={strip}>
        {[current, next].map((frame, i) => (
          <span
            key={i}
            className="cycle-frame"
            style={{ backgroundImage: `url(${frame.src})`, backgroundPosition: frame.position }}
          />
        ))}
      </div>
      <Title>{app.title}</Title>
    </>
  )
}

const DAY = 86_400_000

function whenLine(event: CalendarEvent, today: Date): string {
  const sameDay = new Date(event.start).toDateString() === today.toDateString()
  const weekday = new Date(event.start).toLocaleDateString('en-US', { weekday: 'short' })
  if (event.allDay) return sameDay ? 'all day' : `${weekday}, all day`
  return sameDay ? formatTime(event.start) : `${weekday} ${formatTime(event.start)}`
}

// TemplateCalendar: the next appointments in the coming week, with today's
// day number and name where the title would be.
function CalendarContent({ app, size, active }: { app: AppDef; size: TileSize; active: boolean }) {
  const events = useStore(eventsStore)
  const [now, setNow] = useState(() => Date.now())
  const [step, setStep] = useState(0)
  const face = useRef<HTMLDivElement>(null)
  const today = new Date(now)
  const upcoming = upcomingEvents(events, now)
    .filter((e) => e.start < now + 7 * DAY)
    .slice(0, 3)
  useLiveTimer(active && size !== 'small', 8000, 11000, () => {
    setNow(Date.now())
    if (face.current && upcoming.length > 1) flipTile(wholeTile(face.current), () => setStep((i) => i + 1))
  })
  if (size === 'small') return <span className="calendar-day-small">{today.getDate()}</span>
  const event = upcoming.length ? upcoming[step % upcoming.length] : null
  const lines = event ? [event.title, event.location, whenLine(event, today)].filter(Boolean) : []
  return (
    <div className="tile-face" ref={face}>
      <div className="tile-back-lines calendar-lines">
        {lines.map((line, i) => (
          <span key={i} data-first={i === 0 || undefined}>
            {line}
          </span>
        ))}
      </div>
      <span className="tile-title calendar-title" aria-label={app.title}>
        <span className="calendar-day">{today.getDate()}</span>
        {today.toLocaleDateString('en-US', { weekday: 'long' })}
      </span>
    </div>
  )
}

function MusicContent({ app, size }: { app: AppDef; size: TileSize }) {
  const state = useStore(playerStore)
  const album = ALBUM_BY_ID.get(currentTrack(state)?.album ?? state.history[0] ?? '')
  if (!album) {
    return (
      <>
        <Iconic app={app} size={size} />
        {size !== 'small' && <Title>{app.title}</Title>}
      </>
    )
  }
  const image = size === 'wide' ? (ARTIST_BY_ID.get(album.artist)?.image ?? album.art) : album.art
  return (
    <>
      <span className="music-tile-art" style={{ backgroundImage: `url(${image})` }} />
      {size !== 'small' && <Title>{app.title}</Title>}
    </>
  )
}

// Counts on iconic tiles that come from app data.
function useBadge(id: string): number | undefined {
  const threads = useStore(threadsStore)
  const calls = useStore(callsStore)
  if (id === 'messaging') return unreadThreadCount(threads)
  if (id === 'phone') return missedCallCount(calls)
  return undefined
}

export function Tile({
  app,
  size,
  active,
  onLaunch,
}: {
  app: AppDef
  size: TileSize
  active: boolean
  onLaunch: (source: HTMLElement) => void
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onLaunch)
  const badge = useBadge(app.id)
  const live = app.live
  let content: ReactNode
  switch (live.kind) {
    case 'flip':
    case 'alarm':
      content = <FlipContent app={app} size={size} active={active} />
      break
    case 'people':
      content = <PeopleContent app={app} size={size} active={active} />
      break
    case 'cycle':
      content = <CycleContent app={app} size={size} active={active} />
      break
    case 'calendar':
      content = <CalendarContent app={app} size={size} active={active} />
      break
    case 'music':
      content = <MusicContent app={app} size={size} />
      break
    default:
      content = (
        <>
          <Iconic app={app} size={size} count={badge ?? live.count} />
          {size !== 'small' && <Title>{app.title}</Title>}
        </>
      )
  }
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="tile"
      data-size={size}
      data-feather
      aria-label={app.title}
      onClick={(e) => {
        if (e.detail === 0 && ref.current) onLaunch(ref.current)
      }}
    >
      <span className="tile-clip">{content}</span>
    </button>
  )
}
