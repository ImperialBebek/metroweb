import type { ReactNode } from 'react'
import { ph } from '../icons/ph'

// App bar glyphs: Phosphor icons centred in the button's 48-unit circle.
// Apps can pass their own SVG fragments on the same grid.
export const GLYPHS = {
  add: ph('plus'),
  check: ph('check'),
  close: ph('x'),
  delete: ph('trash'),
  edit: ph('pencil-simple'),
  search: ph('magnifying-glass'),
  send: ph('paper-plane-right'),
  refresh: ph('arrow-clockwise'),
  // Outline, so it reads differently from the filled "unfavorite" star.
  favorite: ph('star-regular'),
  pin: ph('push-pin'),
  play: ph('play'),
  pause: ph('pause'),
  previous: ph('skip-back'),
  next: ph('skip-forward'),
  shuffle: ph('shuffle'),
  repeat: ph('repeat'),
  repeatOnce: ph('repeat-once'),
  camera: ph('camera'),
  flash: ph('lightning'),
  switchCamera: ph('camera-rotate'),
  save: ph('floppy-disk'),
  list: ph('list'),
  today: ph('calendar-check'),
  month: ph('calendar-dots'),
  phone: ph('phone'),
  keypad: ph('dots-nine'),
  speaker: ph('speaker-high'),
  mute: ph('microphone-slash'),
  video: ph('video-camera'),
  contact: ph('user-plus'),
  select: ph('list-checks'),
  attach: ph('paperclip'),
} satisfies Record<string, ReactNode>

export type GlyphName = keyof typeof GLYPHS
