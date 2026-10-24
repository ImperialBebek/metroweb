import type { IconName } from './icons'

// Built-in apps from the manifests in Windows\System32\Manifests: each tile
// template comes from its PrimaryToken; the icons are redrawn (icons.tsx).
// The image has no default Start layout (the phone writes one on first
// boot), so DEFAULT_LAYOUT is composed by hand from these tiles.
export type TileSize = 'small' | 'medium' | 'wide'

export type LiveContent =
  | { kind: 'iconic'; count?: number }
  | { kind: 'flip'; back: { title: string; lines: string[] } }
  | { kind: 'people' }
  // Camera roll pictures, then the sample pictures.
  | { kind: 'cycle' }
  | { kind: 'calendar' }
  // Flips to the next alarm while one is on.
  | { kind: 'alarm' }
  // The album (or, on a wide tile, the artist) last played.
  | { kind: 'music' }

export interface AppDef {
  id: string
  title: string
  glyph: IconName
  live: LiveContent
}

export const APPS: AppDef[] = [
  { id: 'alarms', glyph: 'alarm', title: 'alarms', live: { kind: 'alarm' } },
  { id: 'calculator', glyph: 'calculator', title: 'calculator', live: { kind: 'iconic' } },
  { id: 'calendar', glyph: 'calendar', title: 'calendar', live: { kind: 'calendar' } },
  { id: 'camera', glyph: 'camera', title: 'camera', live: { kind: 'iconic' } },
  {
    id: 'datasense',
    glyph: 'datasense',
    title: 'Data Sense',
    live: { kind: 'flip', back: { title: 'Data Sense', lines: ['412 MB used', 'of 1 GB this month'] } },
  },
  { id: 'games', glyph: 'games', title: 'Games', live: { kind: 'iconic' } },
  { id: 'ie', glyph: 'browser', title: 'Internet Explorer', live: { kind: 'iconic' } },
  { id: 'maps', glyph: 'maps', title: 'maps', live: { kind: 'iconic' } },
  { id: 'messaging', glyph: 'messaging', title: 'messaging', live: { kind: 'iconic' } },
  { id: 'music', glyph: 'music', title: 'Music+Videos', live: { kind: 'music' } },
  {
    id: 'office',
    glyph: 'office',
    title: 'Office',
    live: { kind: 'flip', back: { title: 'Office', lines: ['Budget 2012.xlsx', 'Trip notes.docx'] } },
  },
  {
    id: 'onenote',
    glyph: 'notebook',
    title: 'OneNote',
    live: { kind: 'flip', back: { title: 'Shopping list', lines: ['milk, eggs, bread', 'coffee beans'] } },
  },
  { id: 'outlook', glyph: 'email', title: 'Outlook', live: { kind: 'iconic', count: 5 } },
  { id: 'people', glyph: 'people', title: 'people', live: { kind: 'people' } },
  { id: 'phone', glyph: 'phone', title: 'phone', live: { kind: 'iconic' } },
  {
    id: 'photos',
    glyph: 'photos',
    title: 'photos',
    live: { kind: 'cycle' },
  },
  { id: 'settings', glyph: 'settings', title: 'settings', live: { kind: 'iconic' } },
  { id: 'store', glyph: 'store', title: 'Store', live: { kind: 'iconic', count: 3 } },
  {
    id: 'wallet',
    glyph: 'wallet',
    title: 'Wallet',
    live: { kind: 'flip', back: { title: 'Coffee card', lines: ['$12.40 balance'] } },
  },
]

export const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]))

export interface PinnedTile {
  app: string
  size: TileSize
}

export const DEFAULT_LAYOUT: PinnedTile[] = [
  { app: 'phone', size: 'medium' },
  { app: 'people', size: 'medium' },
  { app: 'messaging', size: 'medium' },
  { app: 'outlook', size: 'medium' },
  { app: 'calendar', size: 'wide' },
  { app: 'ie', size: 'medium' },
  { app: 'store', size: 'medium' },
  { app: 'photos', size: 'wide' },
  { app: 'music', size: 'medium' },
  { app: 'games', size: 'medium' },
  { app: 'settings', size: 'medium' },
  { app: 'camera', size: 'small' },
  { app: 'maps', size: 'small' },
  { app: 'alarms', size: 'small' },
  { app: 'calculator', size: 'small' },
  { app: 'wallet', size: 'medium' },
  { app: 'office', size: 'medium' },
  { app: 'onenote', size: 'medium' },
  { app: 'datasense', size: 'medium' },
]

// The phone sorts the app list by display name, ignoring case.
export const APP_LIST = [...APPS].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
