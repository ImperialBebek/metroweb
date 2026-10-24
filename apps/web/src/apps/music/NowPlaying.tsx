import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GLYPHS, Paragraph, SettingsPage, type GlyphName } from 'metroweb'
import { ALBUM_BY_ID, ARTIST_BY_ID, formatDuration } from '../../data/music'
import {
  currentTrack,
  cycleRepeat,
  next,
  previous,
  seek,
  setShuffle,
  togglePlay,
  upNext,
  usePlayback,
  usePlayer,
} from '../../data/player'

export function RoundButton({
  icon,
  label,
  onTap,
  className = 'music-round',
  pressed,
}: {
  icon: GlyphName
  label: string
  onTap: () => void
  className?: string
  pressed?: boolean
}) {
  return (
    <button type="button" className={className} aria-label={label} aria-pressed={pressed} onClick={onTap}>
      <svg viewBox="0 0 48 48" aria-hidden>
        {GLYPHS[icon]}
      </svg>
    </button>
  )
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

function SeekBar({ time, duration }: { time: number; duration: number }) {
  const [drag, setDrag] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const fraction = (clientX: number) => {
    const r = track.current?.getBoundingClientRect()
    return r && r.width ? clamp((clientX - r.left) / r.width) : 0
  }
  const shown = drag ?? (duration ? clamp(time / duration) : 0)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(fraction(e.clientX))
  }
  const onPointerUp = () => {
    if (drag === null) return
    seek(drag * duration)
    setDrag(null)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0
    if (!step) return
    e.preventDefault()
    seek(Math.min(duration, Math.max(0, time + step)))
  }
  return (
    <div className="music-seek">
      <div
        ref={track}
        className="music-seek-track"
        role="slider"
        tabIndex={0}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatDuration(time)} of ${formatDuration(duration)}`}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => drag !== null && setDrag(fraction(e.clientX))}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKeyDown}
      >
        <div className="music-seek-fill" style={{ width: `${shown * 100}%` }} data-dragging={drag !== null || undefined} />
      </div>
      <div className="music-seek-times">
        <span>{formatDuration(drag !== null ? drag * duration : time)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}

// Zune now playing: the artist's name runs off the top of the screen, the
// album art sits beside the songs coming up, and tapping the art shows
// shuffle, repeat and the timeline.
export function NowPlaying() {
  const state = usePlayer()
  const { playing, time, duration } = usePlayback()
  const [details, setDetails] = useState(false)
  const track = currentTrack(state)
  if (!track) {
    return (
      <SettingsPage app="music+videos" title="now playing">
        <Paragraph subtle>Nothing is playing. Pick a song in your music collection.</Paragraph>
      </SettingsPage>
    )
  }
  const album = ALBUM_BY_ID.get(track.album)
  const artist = ARTIST_BY_ID.get(track.artist)
  const upcoming = upNext(state)
  return (
    <div className="music-np">
      <div className="music-np-artist" data-feather>
        {artist?.name}
      </div>
      <div className="music-np-stage">
        <div className="music-np-art" data-feather>
          <button
            type="button"
            className="music-np-art-hit"
            aria-label={details ? 'Hide playback options' : 'Show playback options'}
            aria-expanded={details}
            onClick={() => setDetails((d) => !d)}
          >
            {album && <img src={album.art} alt="" draggable={false} />}
          </button>
          {details && (
            <>
              <RoundButton
                className="music-np-toggle music-np-shuffle"
                icon="shuffle"
                label="Shuffle"
                pressed={state.shuffle}
                onTap={() => setShuffle(!state.shuffle)}
              />
              <RoundButton
                className="music-np-toggle music-np-repeat"
                icon={state.repeat === 'one' ? 'repeatOnce' : 'repeat'}
                label={state.repeat === 'one' ? 'Repeat one' : 'Repeat'}
                pressed={state.repeat !== 'off'}
                onTap={cycleRepeat}
              />
              <SeekBar time={time} duration={duration || track.duration} />
            </>
          )}
        </div>
        <ol className="music-np-next" data-feather aria-label="Up next">
          {upcoming.map((t, i) => (
            <li key={`${i}:${t.id}`}>{t.title}</li>
          ))}
        </ol>
      </div>
      <div className="music-np-song" data-feather>
        {track.title}
      </div>
      <div className="music-np-album" data-feather>
        {album?.title} · {track.performer}
      </div>
      <div className="music-np-spacer" />
      <div className="music-np-controls" data-feather>
        <RoundButton icon="previous" label="Previous" onTap={previous} />
        <RoundButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onTap={togglePlay} />
        <RoundButton icon="next" label="Next" onTap={next} />
      </div>
    </div>
  )
}
