import { ALBUM_BY_ID, ARTIST_BY_ID, TRACK_BY_ID, type Track } from './music'
import { persistentStore, useStore, type Store } from './persist'

export type RepeatMode = 'off' | 'all' | 'one'

export interface PlayerState {
  // Track ids in the order they were picked; `order` maps play order onto them.
  queue: string[]
  order: number[]
  index: number
  shuffle: boolean
  repeat: RepeatMode
  // 0-30, like the phone's volume steps.
  volume: number
  // Where the current track was left, restored after a reload.
  position: number
  // Recently played albums, newest first.
  history: string[]
}

export const VOLUME_STEPS = 30
const HISTORY_LENGTH = 6
const RESTART_THRESHOLD = 3 // seconds into a song after which Previous restarts it

export const playerStore = persistentStore<PlayerState>('player', () => ({
  queue: [],
  order: [],
  index: 0,
  shuffle: false,
  repeat: 'off',
  volume: 20,
  position: 0,
  history: [],
}))

export interface Playback {
  playing: boolean
  time: number
  duration: number
}

function memoryStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function currentTrack(state = playerStore.get()): Track | undefined {
  const i = state.order[state.index]
  return i === undefined ? undefined : TRACK_BY_ID.get(state.queue[i])
}

// The songs still to come, in play order.
export function upNext(state = playerStore.get(), limit = 4): Track[] {
  const out: Track[] = []
  for (let k = 1; k <= limit && k < state.order.length; k++) {
    let at = state.index + k
    if (at >= state.order.length) {
      if (state.repeat !== 'all') break
      at -= state.order.length
    }
    const track = TRACK_BY_ID.get(state.queue[state.order[at]])
    if (track) out.push(track)
  }
  return out
}

export const playbackStore = memoryStore<Playback>({
  playing: false,
  time: playerStore.get().position,
  duration: currentTrack()?.duration ?? 0,
})

let audio: HTMLAudioElement | null = null
let pendingSeek: number | null = null
let savedPosition = playerStore.get().position

const patch = (p: Partial<PlayerState>) => playerStore.set((s) => ({ ...s, ...p }))
const setPlayback = (p: Partial<Playback>) => playbackStore.set((s) => ({ ...s, ...p }))

function savePosition(time: number) {
  savedPosition = time
  patch({ position: time })
}

function element(): HTMLAudioElement {
  if (audio) return audio
  const a = new Audio()
  a.preload = 'auto'
  a.volume = playerStore.get().volume / VOLUME_STEPS
  a.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null) {
      a.currentTime = Math.min(pendingSeek, Math.max(0, a.duration - 1))
      pendingSeek = null
    }
    setPlayback({ duration: a.duration })
  })
  a.addEventListener('timeupdate', () => {
    if (pendingSeek !== null) return
    setPlayback({ time: a.currentTime })
    if (Math.abs(a.currentTime - savedPosition) > 5) savePosition(a.currentTime)
  })
  a.addEventListener('play', () => setPlayback({ playing: true }))
  a.addEventListener('pause', () => {
    setPlayback({ playing: false })
    savePosition(a.currentTime)
  })
  a.addEventListener('ended', () => {
    if (playerStore.get().repeat === 'one') {
      a.currentTime = 0
      void a.play().catch(() => {})
    } else advance(1, true)
  })
  audio = a
  return a
}

function updateMediaSession(track: Track | undefined) {
  if (!('mediaSession' in navigator)) return
  if (!track) {
    navigator.mediaSession.metadata = null
    return
  }
  const album = ALBUM_BY_ID.get(track.album)
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: ARTIST_BY_ID.get(track.artist)?.name ?? '',
    album: album?.title ?? '',
    artwork: album ? [{ src: album.art, sizes: '480x480', type: 'image/jpeg' }] : [],
  })
}

// Points the audio element at the current track, resuming at `at` seconds.
function load(at: number, autoplay: boolean) {
  const track = currentTrack()
  const a = element()
  updateMediaSession(track)
  if (!track) {
    a.pause()
    a.removeAttribute('src')
    setPlayback({ playing: false, time: 0, duration: 0 })
    return
  }
  if (a.dataset.track !== track.id) {
    a.dataset.track = track.id
    pendingSeek = at > 0 ? at : null
    a.src = track.src
    setPlayback({ time: at, duration: track.duration })
  } else {
    a.currentTime = at
    setPlayback({ time: at })
  }
  savePosition(at)
  if (autoplay) void a.play().catch(() => {})
  else a.pause()
}

function remember(albumId: string) {
  playerStore.set((s) => ({ ...s, history: [albumId, ...s.history.filter((id) => id !== albumId)].slice(0, HISTORY_LENGTH) }))
}

function shuffled(count: number, first: number): number[] {
  const rest = [...Array(count).keys()].filter((i) => i !== first)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return first >= 0 ? [first, ...rest] : rest
}

// Replaces the queue with `tracks` and plays from `start`. Passing `shuffle`
// switches shuffle on or off for this queue ("shuffle all" turns it on).
export function playTracks(tracks: Track[], start = 0, shuffle?: boolean) {
  if (!tracks.length) return
  const on = shuffle ?? playerStore.get().shuffle
  const first = shuffle && start === 0 ? Math.floor(Math.random() * tracks.length) : start
  patch({
    queue: tracks.map((t) => t.id),
    order: on ? shuffled(tracks.length, first) : [...tracks.keys()],
    index: on ? 0 : start,
    shuffle: on,
  })
  remember(tracks[first].album)
  load(0, true)
}

export function addToQueue(tracks: Track[]) {
  const s = playerStore.get()
  if (!s.queue.length) {
    playTracks(tracks)
    return
  }
  const base = s.queue.length
  patch({ queue: [...s.queue, ...tracks.map((t) => t.id)], order: [...s.order, ...tracks.map((_, i) => base + i)] })
}

function advance(step: 1 | -1, automatic = false) {
  const s = playerStore.get()
  if (!s.order.length) return
  const wasPlaying = automatic || playbackStore.get().playing
  let index = s.index + step
  let play = wasPlaying
  if (index >= s.order.length) {
    index = 0
    // Running off the end of the queue stops, unless it repeats.
    if (automatic && s.repeat !== 'all') play = false
  } else if (index < 0) {
    index = s.repeat === 'all' ? s.order.length - 1 : 0
  }
  patch({ index })
  const track = currentTrack()
  if (track) remember(track.album)
  load(0, play)
}

export const next = () => advance(1)

export function previous() {
  if ((audio?.currentTime ?? 0) > RESTART_THRESHOLD) seek(0)
  else advance(-1)
}

export function play() {
  if (!currentTrack()) return
  const a = element()
  if (!a.dataset.track) load(savedPosition, true)
  else void a.play().catch(() => {})
}

export const pause = () => audio?.pause()

export function togglePlay() {
  if (playbackStore.get().playing) pause()
  else play()
}

export function seek(seconds: number) {
  if (!currentTrack()) return
  const a = element()
  if (!a.dataset.track) {
    load(seconds, false)
    return
  }
  a.currentTime = seconds
  setPlayback({ time: seconds })
  savePosition(seconds)
}

export function setShuffle(on: boolean) {
  const s = playerStore.get()
  const playing = s.order[s.index] ?? 0
  if (on === s.shuffle) return
  patch(
    on
      ? { shuffle: true, order: shuffled(s.queue.length, s.queue.length ? playing : -1), index: 0 }
      : { shuffle: false, order: [...s.queue.keys()], index: playing },
  )
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }
export const cycleRepeat = () => patch({ repeat: REPEAT_CYCLE[playerStore.get().repeat] })

export function setVolume(volume: number) {
  const v = Math.max(0, Math.min(VOLUME_STEPS, Math.round(volume)))
  patch({ volume: v })
  if (audio) audio.volume = v / VOLUME_STEPS
}

if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
  const session = navigator.mediaSession
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', play],
    ['pause', pause],
    ['previoustrack', previous],
    ['nexttrack', next],
    ['seekto', (d) => d.seekTime !== undefined && seek(d.seekTime)],
  ]
  for (const [action, handler] of handlers) {
    try {
      session.setActionHandler(action, handler)
    } catch {
      // Not every browser supports every action.
    }
  }
}

export const usePlayer = () => useStore(playerStore)
export const usePlayback = () => useStore(playbackStore)
