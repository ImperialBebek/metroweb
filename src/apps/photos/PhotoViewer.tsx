import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { AppBar, type AppBarButtonDef } from '../../components/AppBar'
import { useStore } from '../../data/persist'
import { deletePhoto, favoritesStore, toggleFavorite, usePhotos } from '../../data/photos'
import { EXPO_OUT_6 } from '../../motion'
import { motionMs } from '../../motionSpeed'
import { useNavigation } from '../../navigation'
import { formatTakenDate, formatTakenTime, useAlbum, type AlbumId } from './albums'
import { PhotosMessageBox } from './PhotosMessageBox'
import './photos.css'

interface Point {
  x: number
  y: number
}

interface Zoom {
  s: number
  x: number
  y: number
}

const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 }
const GAP = 24
const COMMIT_FRACTION = 0.2
const FLICK_VELOCITY = 0.45 // px per ms
const SNAP_MS = 300
const DOUBLE_TAP_MS = 280
const TAP_SLOP = 10
const MAX_SCALE = 4
const EDGE_RESISTANCE = 0.3

interface Gesture {
  pointers: Map<number, Point>
  mode: 'idle' | 'swipe' | 'pan' | 'pinch' | 'ignore'
  start: Point
  moved: boolean
  base: Zoom
  zoom: Zoom
  pinchDistance: number
  pinchMid: Point
  rawDx: number
  lastX: number
  lastT: number
  velocity: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

const starPath = 'M24 13l3.2 7 7.5.6-5.7 5 1.8 7.4L24 29l-6.8 4 1.8-7.4-5.7-5 7.5-.6z'
const STAR_OUTLINE = <path fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" d={starPath} />
const STAR_FILLED = (
  <path fill="currentColor" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" d={starPath} />
)

// Full-screen photo viewer: swipe between the album's photos, double-tap or
// pinch to zoom, tap to show the date and a minimized app bar. `reversed`
// lays the album out oldest-to-newest (the camera's film strip), and
// `onSwipePastEnd` fires when swiping on from the last photo.
export function PhotoViewer({
  album,
  initialId,
  reversed = false,
  onSwipePastEnd,
}: {
  album: AlbumId
  initialId: string
  reversed?: boolean
  onSwipePastEnd?: () => void
}) {
  const { back } = useNavigation()
  const { ready } = usePhotos()
  const albumPhotos = useAlbum(album)
  const photos = useMemo(() => (reversed ? [...albumPhotos].reverse() : albumPhotos), [albumPhotos, reversed])
  const favorites = useStore(favoritesStore)

  // Removing the current photo (delete, unfavourite) moves to a neighbour first,
  // so a missing id only happens while the album is still loading.
  const [currentId, setCurrentId] = useState(initialId)
  const found = photos.findIndex((p) => p.id === currentId)
  const index = found >= 0 ? found : reversed ? photos.length - 1 : 0
  const photo = photos[index]

  const stage = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const [size, setSize] = useState({ w: 480, h: 764 })
  const [dx, setDx] = useState(0)
  const [snap, setSnap] = useState<-1 | 0 | 1 | null>(null)
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM)
  const [zoomAnimated, setZoomAnimated] = useState(false)
  const [chrome, setChrome] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const gesture = useRef<Gesture | null>(null)
  const lastTap = useRef<{ t: number; p: Point } | null>(null)
  const tapTimer = useRef(0)

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setSize({ w: el.offsetWidth || 480, h: el.offsetHeight || 764 })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => window.clearTimeout(tapTimer.current), [])

  const leaving = useRef(false)
  useEffect(() => {
    if (ready && photos.length === 0 && !leaving.current) {
      leaving.current = true
      back()
    }
  }, [ready, photos.length, back])

  const finishSnap = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    finishSnap.current = () => {
      if (snap) {
        const next = photos[index + snap]
        if (next) setCurrentId(next.id)
        setZoom(NO_ZOOM)
      }
      setDx(0)
      setSnap(null)
    }
  })
  useEffect(() => {
    if (snap === null) return
    const timer = window.setTimeout(() => finishSnap.current(), motionMs(SNAP_MS))
    return () => window.clearTimeout(timer)
  }, [snap])

  const clampZoom = (z: Zoom): Zoom => {
    const img = image.current
    const nw = img?.naturalWidth || size.w
    const nh = img?.naturalHeight || size.h
    const fit = Math.min(size.w / nw, size.h / nh)
    const maxX = Math.max(0, (nw * fit * z.s - size.w) / 2)
    const maxY = Math.max(0, (nh * fit * z.s - size.h) / 2)
    return { s: z.s, x: clamp(z.x, -maxX, maxX), y: clamp(z.y, -maxY, maxY) }
  }

  // Pointer position in the stage's unscaled coordinates, relative to its centre.
  const local = (e: PointerEvent<HTMLElement>): Point => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const k = rect.width / el.offsetWidth || 1
    return { x: (e.clientX - rect.left) / k - el.offsetWidth / 2, y: (e.clientY - rect.top) / k - el.offsetHeight / 2 }
  }

  const startPinch = (g: Gesture) => {
    const [a, b] = [...g.pointers.values()]
    g.mode = 'pinch'
    g.moved = true
    g.base = g.zoom
    g.pinchDistance = distance(a, b) || 1
    g.pinchMid = midpoint(a, b)
    if (g.rawDx) {
      g.rawDx = 0
      setDx(0)
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (snap !== null || !photo) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = local(e)
    let g = gesture.current
    if (!g) {
      g = {
        pointers: new Map(),
        mode: 'idle',
        start: p,
        moved: false,
        base: zoom,
        zoom,
        pinchDistance: 1,
        pinchMid: p,
        rawDx: 0,
        lastX: p.x,
        lastT: e.timeStamp,
        velocity: 0,
      }
      gesture.current = g
    }
    g.pointers.set(e.pointerId, p)
    setZoomAnimated(false)
    if (g.pointers.size === 2) startPinch(g)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || !g.pointers.has(e.pointerId)) return
    const p = local(e)
    g.pointers.set(e.pointerId, p)
    if (g.mode === 'pinch') {
      if (g.pointers.size < 2) return
      const [a, b] = [...g.pointers.values()]
      const s = clamp((g.base.s * distance(a, b)) / g.pinchDistance, 1, MAX_SCALE)
      const m = midpoint(a, b)
      // Keep the content point that started under the fingers' midpoint under it.
      const cx = (g.pinchMid.x - g.base.x) / g.base.s
      const cy = (g.pinchMid.y - g.base.y) / g.base.s
      g.zoom = clampZoom({ s, x: m.x - cx * s, y: m.y - cy * s })
      setZoom(g.zoom)
      return
    }
    const mx = p.x - g.start.x
    const my = p.y - g.start.y
    if (!g.moved) {
      if (Math.hypot(mx, my) < TAP_SLOP) return
      g.moved = true
      g.base = g.zoom
      g.mode = g.zoom.s > 1.01 ? 'pan' : Math.abs(mx) > Math.abs(my) ? 'swipe' : 'ignore'
    }
    if (g.mode === 'pan') {
      g.zoom = clampZoom({ s: g.base.s, x: g.base.x + mx, y: g.base.y + my })
      setZoom(g.zoom)
    } else if (g.mode === 'swipe') {
      const dt = e.timeStamp - g.lastT
      if (dt > 0) g.velocity = (p.x - g.lastX) / dt
      g.lastX = p.x
      g.lastT = e.timeStamp
      g.rawDx = mx
      const pastEdge = (mx > 0 && index === 0) || (mx < 0 && index === photos.length - 1)
      setDx(pastEdge ? mx * EDGE_RESISTANCE : mx)
    }
  }

  const onTap = (p: Point, t: number) => {
    const prev = lastTap.current
    if (prev && t - prev.t < DOUBLE_TAP_MS && distance(p, prev.p) < 40) {
      window.clearTimeout(tapTimer.current)
      lastTap.current = null
      setZoomAnimated(true)
      // Zoom to 2x about the tapped point: the content under it stays put.
      setZoom(zoom.s > 1.01 ? NO_ZOOM : clampZoom({ s: 2, x: -p.x, y: -p.y }))
      return
    }
    lastTap.current = { t, p }
    tapTimer.current = window.setTimeout(() => {
      lastTap.current = null
      setChrome((c) => !c)
    }, DOUBLE_TAP_MS)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || !g.pointers.has(e.pointerId)) return
    g.pointers.delete(e.pointerId)
    if (g.mode === 'pinch') {
      if (g.pointers.size === 1) {
        g.mode = 'pan'
        g.start = [...g.pointers.values()][0]
        g.base = g.zoom
        return
      }
      gesture.current = null
      if (g.zoom.s < 1.05) {
        setZoomAnimated(true)
        setZoom(NO_ZOOM)
      }
      return
    }
    if (g.pointers.size > 0) return
    gesture.current = null
    if (g.mode === 'swipe') {
      let direction: -1 | 0 | 1 = 0
      if (g.rawDx < -size.w * COMMIT_FRACTION || g.velocity < -FLICK_VELOCITY) direction = 1
      else if (g.rawDx > size.w * COMMIT_FRACTION || g.velocity > FLICK_VELOCITY) direction = -1
      if (direction === 1 && index >= photos.length - 1) {
        direction = 0
        onSwipePastEnd?.()
      }
      if (direction === -1 && index <= 0) direction = 0
      setSnap(direction)
      setDx(-direction * (size.w + GAP))
    } else if (!g.moved && e.type === 'pointerup') {
      onTap(local(e), e.timeStamp)
    }
  }

  const moveOffCurrent = () => {
    const neighbour = photos[index + 1] ?? photos[index - 1]
    if (neighbour) setCurrentId(neighbour.id)
    setZoom(NO_ZOOM)
  }

  const confirmDelete = () => {
    setConfirming(false)
    if (!photo) return
    moveOffCurrent()
    deletePhoto(photo.id).catch(() => {})
  }

  const favorite = photo ? favorites.includes(photo.id) : false
  const buttons: AppBarButtonDef[] = photo
    ? [
        {
          icon: favorite ? STAR_FILLED : STAR_OUTLINE,
          label: favorite ? 'unfavorite' : 'favorite',
          onTap: () => {
            if (album === 'favorites' && favorite) moveOffCurrent()
            toggleFavorite(photo.id)
          },
        },
        ...(photo.sample
          ? []
          : [{ icon: 'delete' as const, label: 'delete', onTap: () => setConfirming(true) }]),
      ]
    : []

  const slideTransition = snap !== null ? `transform ${SNAP_MS}ms ${EXPO_OUT_6}` : 'none'

  return (
    <div className="app-page photos-viewer">
      <div
        className="photos-viewer-stage"
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {[-1, 0, 1].map((k) => {
          const p = photos[index + k]
          if (!p) return null
          const current = k === 0
          return (
            <div
              key={p.id}
              className="photos-viewer-slide"
              data-current={current || undefined}
              style={{ transform: `translateX(${k * (size.w + GAP) + dx}px)`, transition: slideTransition }}
            >
              <img
                ref={current ? image : undefined}
                className="photos-viewer-img"
                src={p.src}
                alt=""
                draggable={false}
                style={
                  current
                    ? {
                        transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`,
                        transition: zoomAnimated ? `transform 250ms ${EXPO_OUT_6}` : 'none',
                      }
                    : undefined
                }
              />
            </div>
          )
        })}
      </div>
      {chrome && photo && (
        <div className="photos-viewer-info">
          <span>{formatTakenDate(photo.taken)}</span>
          <span className="photos-viewer-time">{formatTakenTime(photo.taken)}</span>
        </div>
      )}
      <div className="photos-viewer-spacer" />
      {chrome && photo && <AppBar minimized buttons={buttons} />}
      {confirming && photo && (
        <PhotosMessageBox
          title="Delete?"
          message="This picture will be deleted."
          confirmLabel="delete"
          onConfirm={confirmDelete}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
