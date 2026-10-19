import { PH } from '../icons/phosphor'

// Phosphor glyphs for the iconic tiles and the app list.
const GLYPHS = {
  phone: 'phone',
  people: 'users',
  messaging: 'chat',
  email: 'envelope-simple',
  calendar: 'calendar-blank',
  browser: 'globe',
  store: 'shopping-bag',
  photos: 'image',
  music: 'headphones',
  games: 'game-controller',
  settings: 'gear',
  camera: 'camera',
  maps: 'map-trifold',
  alarm: 'alarm',
  calculator: 'calculator',
  wallet: 'wallet',
  office: 'file-text',
  notebook: 'notebook',
  datasense: 'chart-pie-slice',
} as const satisfies Record<string, keyof typeof PH>

export type IconName = keyof typeof GLYPHS

export function Icon({ name, size }: { name: IconName; size: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <path fill="currentColor" d={PH[GLYPHS[name]]} />
    </svg>
  )
}
