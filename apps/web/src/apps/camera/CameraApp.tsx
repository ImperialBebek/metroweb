import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Button, GLYPHS, PageStack, ph, PhIcon, prefersReducedMotion, useNavigation } from 'metroweb'
import { savePhoto, usePhotos } from '../../data/photos'
import { PhotoViewer } from '../photos/PhotoViewer'
import type { AppProps } from '../types'
import './camera.css'

type CameraError = 'denied' | 'missing' | 'busy' | 'insecure' | 'unsupported' | 'other'
type Status = 'starting' | 'live' | CameraError
type Flash = 'auto' | 'on' | 'off'
type Facing = 'environment' | 'user'

const MAX_EDGE = 1600
const SWIPE_DISTANCE = 60
const TAP_SLOP = 12
const FOCUS_MS = 350

const MESSAGES: Record<CameraError, string> = {
  denied: 'Camera access is blocked. Allow this site to use your camera in your browser settings, then try again.',
  missing: "We couldn't find a camera on this device. Connect one and try again.",
  busy: 'Another app may be using the camera right now. Close it and try again.',
  insecure: 'The camera only works when this page is opened from a secure (https) address.',
  unsupported: "This browser doesn't let web pages use the camera.",
  other: "Something went wrong while starting the camera. Try again in a moment.",
}

function errorKind(error: unknown): CameraError {
  const name = (error as { name?: string } | null)?.name
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'NotSupportedError':
    case 'OverconstrainedError':
      return 'missing'
    case 'NotReadableError':
    case 'AbortError':
      return 'busy'
    default:
      return 'other'
  }
}

// Checked once: neither can change while the page is open.
const UNAVAILABLE: CameraError | null = !window.isSecureContext
  ? 'insecure'
  : !navigator.mediaDevices?.getUserMedia
    ? 'unsupported'
    : null

const stopStream = (stream: MediaStream) => stream.getTracks().forEach((track) => track.stop())
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const FLASH_GLYPHS: Record<Flash, ReactNode> = {
  auto: ph('lightning-a'),
  on: ph('lightning'),
  off: ph('lightning-slash'),
}
const NEXT_FLASH: Record<Flash, Flash> = { auto: 'on', on: 'off', off: 'auto' }

function RoundButton({
  label,
  onTap,
  children,
  className = '',
}: {
  label: string
  onTap: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button type="button" className={`camera-round ${className}`} aria-label={label} onClick={onTap}>
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        <circle className="camera-ring" cx="24" cy="24" r="21.5" />
        <g className="camera-glyph">{children}</g>
      </svg>
    </button>
  )
}

interface Focus {
  x: number
  y: number
  key: number
  locked: boolean
}

function Viewfinder() {
  const { navigate } = useNavigation()
  const { cameraRoll } = usePhotos()
  const page = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const shutter = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLImageElement>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [mirrored, setMirrored] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  const [status, setStatus] = useState<Status>('starting')
  const [cameraCount, setCameraCount] = useState(0)
  const [torch, setTorch] = useState(false)
  const [flash, setFlash] = useState<Flash>('auto')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [flyout, setFlyout] = useState<string | null>(null)
  const capturing = useRef(false)
  const focusKey = useRef(0)
  const timers = useRef<number[]>([])
  const press = useRef<{ id: number; x: number; y: number; scale: number } | null>(null)

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // The stream only runs while the page is visible; leaving the app
  // unmounts this page, which stops it too.
  useEffect(() => {
    if (!visible || UNAVAILABLE) return
    let cancelled = false
    let own: MediaStream | null = null
    const el = video.current
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then(async (s) => {
        if (cancelled) {
          stopStream(s)
          return
        }
        own = s
        stream.current = s
        if (el) {
          el.srcObject = s
          await el.play().catch(() => {})
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (cancelled) return
        const cameras = devices.filter((d) => d.kind === 'videoinput').length
        const track = s.getVideoTracks()[0]
        const actual = track?.getSettings().facingMode
        // Webcams don't report a facing mode; treat a lone camera as a front one.
        setMirrored((actual || (cameras > 1 ? facing : 'user')) === 'user')
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
        setTorch(!!caps.torch)
        setCameraCount(cameras)
        setStatus('live')
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(errorKind(error))
      })
    return () => {
      cancelled = true
      if (own) stopStream(own)
      if (stream.current === own) stream.current = null
      if (el) el.srcObject = null
    }
  }, [visible, facing, attempt])

  useLayoutEffect(() => {
    const el = flyoutRef.current
    if (!flyout || !el) return
    const anim = el.animate(
      [
        { transform: 'translateX(0) scale(1)', opacity: 1 },
        { transform: 'translateX(0) scale(0.3)', opacity: 1, offset: 0.45 },
        { transform: 'translateX(-100%) scale(0.3)', opacity: 1 },
      ],
      { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    )
    anim.finished.then(() => setFlyout(null)).catch(() => {})
    return () => anim.cancel()
  }, [flyout])

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const blink = (bright: boolean) => {
    const el = shutter.current
    if (!el || prefersReducedMotion()) return
    el.style.background = bright ? '#fff' : '#000'
    el.animate([{ opacity: 0 }, { opacity: bright ? 0.9 : 0.75, offset: 0.25 }, { opacity: 0 }], { duration: 260 })
  }

  const capture = async () => {
    const el = video.current
    if (capturing.current || status !== 'live' || !el || !el.videoWidth) return
    capturing.current = true
    const track = stream.current?.getVideoTracks()[0]
    const useTorch = torch && flash === 'on' && !!track
    try {
      if (useTorch) {
        await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }).catch(() => {})
        await wait(250)
      }
      const scale = Math.min(1, MAX_EDGE / Math.max(el.videoWidth, el.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(el.videoWidth * scale)
      canvas.height = Math.round(el.videoHeight * scale)
      // Drawn straight from the video, so a mirrored front-camera preview is saved unmirrored.
      canvas.getContext('2d')?.drawImage(el, 0, 0, canvas.width, canvas.height)
      if (useTorch) track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => {})
      blink(flash === 'on')
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      if (!blob) return
      const photo = await savePhoto(blob)
      if (!prefersReducedMotion()) setFlyout(photo.src)
    } catch {
      // A failed capture just leaves the viewfinder as it was.
    } finally {
      capturing.current = false
    }
  }

  const focusAndCapture = (x: number, y: number) => {
    if (status !== 'live' || capturing.current || focus) return
    const key = ++focusKey.current
    setFocus({ x, y, key, locked: false })
    later(FOCUS_MS, () => {
      setFocus((f) => (f?.key === key ? { ...f, locked: true } : f))
      capture().finally(() => later(250, () => setFocus((f) => (f?.key === key ? null : f))))
    })
  }

  const openRoll = () => {
    if (cameraRoll[0]) navigate(`roll:${cameraRoll[0].id}`)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget
    press.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      scale: el.getBoundingClientRect().width / el.offsetWidth || 1,
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    press.current = null
    const dx = (e.clientX - p.x) / p.scale
    const dy = (e.clientY - p.y) / p.scale
    if (dx > SWIPE_DISTANCE && Math.abs(dy) < dx) {
      openRoll()
    } else if (Math.hypot(dx, dy) < TAP_SLOP) {
      const rect = e.currentTarget.getBoundingClientRect()
      focusAndCapture((e.clientX - rect.left) / p.scale, (e.clientY - rect.top) / p.scale)
    }
  }

  const shutterPress = () => {
    const el = page.current
    if (el) focusAndCapture(el.offsetWidth / 2, (el.offsetHeight - 96) / 2)
  }

  const error = UNAVAILABLE ?? (status !== 'live' && status !== 'starting' ? status : null)

  return (
    <div className="camera-page" ref={page}>
      <video className="camera-video" ref={video} muted playsInline data-mirrored={mirrored || undefined} />
      <div
        className="camera-surface"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null
        }}
      />
      {focus && (
        <svg
          key={focus.key}
          className="camera-focus"
          data-locked={focus.locked || undefined}
          style={{ left: focus.x, top: focus.y }}
          width="112"
          height="112"
          viewBox="0 0 112 112"
          aria-hidden
        >
          <path d="M2 26V2h24M86 2h24v24M110 86v24H86M26 110H2V86" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      )}
      <div className="camera-shutter" ref={shutter} />
      {flyout && <img className="camera-flyout" ref={flyoutRef} src={flyout} alt="" />}
      {error && (
        <div className="camera-message" role="alert">
          <div className="camera-message-title">camera unavailable</div>
          <p className="camera-message-text">{MESSAGES[error]}</p>
          <div className="camera-message-buttons">
            {error !== 'insecure' && error !== 'unsupported' && (
              <Button
                onTap={() => {
                  setStatus('starting')
                  setAttempt((n) => n + 1)
                }}
              >
                try again
              </Button>
            )}
            {cameraRoll.length > 0 && <Button onTap={openRoll}>camera roll</Button>}
          </div>
        </div>
      )}
      {cameraRoll.length > 0 && !error && (
        <button type="button" className="camera-chevron" aria-label="Camera roll" onClick={openRoll}>
          <PhIcon name="caret-left" size={36} />
        </button>
      )}
      <div className="camera-bar">
        <div className="camera-bar-slot">
          {!error && (
            <RoundButton label={`Flash: ${flash}`} onTap={() => setFlash((f) => NEXT_FLASH[f])}>
              {FLASH_GLYPHS[flash]}
            </RoundButton>
          )}
          {!error && <span className="camera-bar-label">{flash}</span>}
        </div>
        {!error && (
          <button
            type="button"
            className="camera-shutter-button"
            aria-label="Take photo"
            disabled={status !== 'live'}
            onClick={shutterPress}
          >
            <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
              <circle className="camera-shutter-ring" cx="38" cy="38" r="35" />
              {ph('camera', 32, 38, 38)}
            </svg>
          </button>
        )}
        <div className="camera-bar-slot">
          {cameraCount > 1 && !error && (
            <RoundButton
              label={facing === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
              onTap={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              {GLYPHS.switchCamera}
            </RoundButton>
          )}
        </div>
      </div>
    </div>
  )
}

function CameraRoll({ id }: { id: string }) {
  const { back } = useNavigation()
  return <PhotoViewer album="camera-roll" initialId={id} reversed onSwipePastEnd={back} />
}

export function CameraApp({ onExit, handle }: AppProps) {
  const render = (route: string) =>
    route.startsWith('roll:') ? <CameraRoll id={route.slice(5)} /> : <Viewfinder />
  return <PageStack enter initialRoute="viewfinder" render={render} onExit={onExit} handle={handle} />
}
