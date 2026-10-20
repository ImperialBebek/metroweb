import { createContext, useContext } from 'react'
import { ACCENTS, DEFAULT_ACCENT, DEFAULT_BACKGROUND, type Background } from '../theme'

export interface DesignTheme {
  background: Background
  accent: number
}

interface DesignThemeStore extends DesignTheme {
  update: (patch: Partial<DesignTheme>) => void
}

const STORAGE_KEY = 'wp8-design-theme'
// Until a theme is picked here, the pages follow the phone's own setting.
const PHONE_KEY = 'wp8-settings'

export function loadTheme(): DesignTheme {
  for (const key of [STORAGE_KEY, PHONE_KEY]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      const { background, accent } = saved ?? {}
      if ((background === 'dark' || background === 'light') && Number.isInteger(accent) && ACCENTS[accent]) {
        return { background, accent }
      }
    } catch {
      // Unreadable; try the next one.
    }
  }
  return { background: DEFAULT_BACKGROUND, accent: DEFAULT_ACCENT }
}

export function saveTheme(theme: DesignTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // Storage is full or blocked; the choice lasts until the page closes.
  }
}

export const DesignThemeContext = createContext<DesignThemeStore | null>(null)

export function useDesignTheme(): DesignThemeStore {
  const store = useContext(DesignThemeContext)
  if (!store) throw new Error('useDesignTheme must be used inside DesignThemeContext')
  return store
}
