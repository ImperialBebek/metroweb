// Values in this file come from the Windows Phone 8 emulator image:
// - accents: HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Control Panel\Theme\Themes\*\Accents
// - accent names: uixmobileres.dll.mui string table (10017-10059)
// - palettes and type ramp: Windows\System32\0000_ThemeResources.xaml (light) and 0100_ (dark)

export type Background = 'dark' | 'light'

export interface Accent {
  name: string
  color: string
}

// Registry order, which is also the order of the accent picker grid.
export const ACCENTS: Accent[] = [
  { name: 'Lime', color: '#A4C400' },
  { name: 'Green', color: '#60A917' },
  { name: 'Emerald', color: '#008A00' },
  { name: 'Teal', color: '#00ABA9' },
  { name: 'Cyan', color: '#1BA1E2' },
  { name: 'Cobalt', color: '#0050EF' },
  { name: 'Indigo', color: '#6A00FF' },
  { name: 'Violet', color: '#AA00FF' },
  { name: 'Pink', color: '#F472D0' },
  { name: 'Magenta', color: '#D80073' },
  { name: 'Crimson', color: '#A20025' },
  { name: 'Red', color: '#E51400' },
  { name: 'Orange', color: '#FA6800' },
  { name: 'Amber', color: '#F0A30A' },
  { name: 'Yellow', color: '#E3C800' },
  { name: 'Brown', color: '#825A2C' },
  { name: 'Olive', color: '#6D8764' },
  { name: 'Steel', color: '#647687' },
  { name: 'Mauve', color: '#76608A' },
  { name: 'Taupe', color: '#87794E' },
]

// DefaultTheme = 1 (Dark), DefaultAccent = 0xB (Red) in the emulator registry.
export const DEFAULT_BACKGROUND: Background = 'dark'
export const DEFAULT_ACCENT = 11

// XAML colours are #AARRGGBB; CSS wants rgba().
function argb(hex: string): string {
  const v = hex.replace('#', '')
  const a = parseInt(v.slice(0, 2), 16) / 255
  const r = parseInt(v.slice(2, 4), 16)
  const g = parseInt(v.slice(4, 6), 16)
  const b = parseInt(v.slice(6, 8), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`
}

const PALETTES: Record<Background, Record<string, string>> = {
  dark: {
    foreground: argb('#FFFFFFFF'),
    background: argb('#FF000000'),
    contrastForeground: argb('#FF000000'),
    contrastBackground: argb('#FFFFFFFF'),
    disabled: argb('#66FFFFFF'),
    textBox: argb('#BFFFFFFF'),
    textBoxForeground: argb('#FF000000'),
    textBoxEditBackground: argb('#FFFFFFFF'),
    subtle: argb('#99FFFFFF'),
    chrome: argb('#FF1F1F1F'),
    border: argb('#BFFFFFFF'),
    semitransparent: argb('#AA000000'),
    buttonBasePressedForeground: argb('#FFFFFFFF'),
    pivotUnselectedOpacity: '0.4',
  },
  light: {
    foreground: argb('#DE000000'),
    background: argb('#FFFFFFFF'),
    contrastForeground: argb('#FFFFFFFF'),
    contrastBackground: argb('#DE000000'),
    disabled: argb('#4D000000'),
    textBox: argb('#26000000'),
    textBoxForeground: argb('#DE000000'),
    textBoxEditBackground: argb('#00000000'),
    subtle: argb('#66000000'),
    chrome: argb('#FFDDDDDD'),
    border: argb('#99000000'),
    semitransparent: argb('#AAFFFFFF'),
    buttonBasePressedForeground: argb('#FFFFFFFF'),
    pivotUnselectedOpacity: '0.23144',
  },
}

export function themeVariables(background: Background, accent: number): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(PALETTES[background])) {
    vars[`--wp-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value
  }
  vars['--wp-accent'] = ACCENTS[accent].color
  return vars
}
