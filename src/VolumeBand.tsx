import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type Ref } from 'react'
import { flushSync } from 'react-dom'
import { GLYPHS, type GlyphName } from './components/glyphs'
import { ARTIST_BY_ID } from './data/music'
import { currentTrack, next, previous, setVolume, togglePlay, usePlayback, usePlayer, VOLUME_STEPS } from './data/player'
import { PhIcon } from './icons/PhIcon'
import { EXPO_IN_6, EXPO_OUT_6, prefersReducedMotion } from './motion'

const HIDE_AFTER = 3000

export interface VolumeBandHandle {
  show: () => void
}

function MediaButton({ icon, label, onTap }: { icon: GlyphName; label: string; onTap: () => void }) {
  return (
    <button type="button" className="volume-media-button" aria-label={label} onClick={onTap}>
      <svg viewBox="0 0 48 48" aria-hidden>
        {GLYPHS[icon]}
      </svg>
    </button>
  )
}

function VolumeSlider({ volume }: { volume: number }) {
  const set = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (r.width) setVolume(((e.clientX - r.left) / r.width) * VOLUME_STEPS)
  }
  return (
    <div
      className="volume-slider"
      role="slider"
      tabIndex={0}
      aria-label="volume"
      aria-valuemin={0}
      aria-valuemax={VOLUME_STEPS}
      aria-valuenow={volume}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e)
      }}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
        if (!step) return
        e.preventDefault()
        setVolume(volume + step)
      }}
    >
      <div className="volume-slider-fill" style={{ width: `${(volume / VOLUME_STEPS) * 100}%` }} />
    </div>
  )
}

// The band the phone drops from the top of the screen when a volume key is
// pressed: the volume level, and while music is queued, its controls.
export function VolumeBand({ handle }: { handle: Ref<VolumeBandHandle> }) {
  const [open, setOpen] = useState(false)
  const band = useRef<HTMLDivElement>(null)
  const hideTimer = useRef(0)
  const closing = useRef<Animation | null>(null)
  const state = usePlayer()
  const { playing } = usePlayback()
  const track = currentTrack(state)

  const close = useCallback(() => {
    const el = band.current
    if (!el || prefersReducedMotion()) {
      setOpen(false)
      return
    }
    const anim = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], {
      duration: 200,
      easing: EXPO_IN_6,
      fill: 'forwards',
    })
    closing.current = anim
    anim.finished
      .then(() => {
        if (closing.current !== anim) return
        closing.current = null
        flushSync(() => setOpen(false))
        anim.cancel()
      })
      .catch(() => {})
  }, [])

  const keepOpen = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(close, HIDE_AFTER)
  }, [close])

  useImperativeHandle(
    handle,
    () => ({
      show: () => {
        closing.current?.cancel()
        closing.current = null
        setOpen(true)
        keepOpen()
      },
    }),
    [keepOpen],
  )

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  useLayoutEffect(() => {
    if (!open || !band.current || prefersReducedMotion()) return
    band.current.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], {
      duration: 300,
      easing: EXPO_OUT_6,
    })
  }, [open])

  if (!open) return null
  return (
    <div className="volume-band" ref={band} role="group" aria-label="Volume" onPointerDownCapture={keepOpen} onKeyDownCapture={keepOpen}>
      <div className="volume-row">
        <PhIcon name={state.volume ? 'speaker-simple-high' : 'speaker-simple-x'} size={28} />
        <span className="volume-label">volume</span>
        <span className="volume-value">{state.volume}</span>
      </div>
      <VolumeSlider volume={state.volume} />
      {track && (
        <div className="volume-media">
          <div className="volume-media-text">
            <span className="volume-media-title">{track.title}</span>
            <span className="volume-media-artist">{ARTIST_BY_ID.get(track.artist)?.name}</span>
          </div>
          <MediaButton icon="previous" label="previous" onTap={previous} />
          <MediaButton icon={playing ? 'pause' : 'play'} label={playing ? 'pause' : 'play'} onTap={togglePlay} />
          <MediaButton icon="next" label="next" onTap={next} />
        </div>
      )}
    </div>
  )
}

// Stand-ins for the phone's hardware volume rocker, on the desk beside it.
export function VolumeKeys({ onStep }: { onStep: (step: 1 | -1) => void }) {
  return (
    <aside className="volume-keys" aria-label="Volume keys">
      <span className="volume-keys-title">volume</span>
      <div className="volume-keys-buttons">
        <button type="button" aria-label="Volume down" onClick={() => onStep(-1)}>
          −
        </button>
        <button type="button" aria-label="Volume up" onClick={() => onStep(1)}>
          +
        </button>
      </div>
      <span className="volume-keys-hint">or press − / +</span>
    </aside>
  )
}
