import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND, type Background } from 'metroweb'

export type BrightnessLevel = 'low' | 'medium' | 'high'

export interface SettingsState {
  background: Background
  accent: number
  airplaneMode: boolean
  wifi: boolean
  bluetooth: boolean
  tapSend: boolean
  location: boolean
  batterySaver: boolean
  kidsCorner: boolean
  autoBrightness: boolean
  brightnessLevel: BrightnessLevel
  // Radio states to restore when airplane mode is turned off again.
  radiosBeforeAirplane: { wifi: boolean; bluetooth: boolean; tapSend: boolean } | null
}

const DEFAULTS: SettingsState = {
  background: DEFAULT_BACKGROUND,
  accent: DEFAULT_ACCENT,
  airplaneMode: false,
  wifi: true,
  bluetooth: false,
  tapSend: true,
  location: true,
  batterySaver: false,
  kidsCorner: false,
  autoBrightness: true,
  brightnessLevel: 'medium',
  radiosBeforeAirplane: null,
}

const STORAGE_KEY = 'wp8-settings'

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

interface Store {
  settings: SettingsState
  update: (patch: Partial<SettingsState>) => void
}

const SettingsContext = createContext<Store | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const store = useMemo<Store>(
    () => ({ settings, update: (patch) => setSettings((s) => ({ ...s, ...patch })) }),
    [settings],
  )
  return <SettingsContext.Provider value={store}>{children}</SettingsContext.Provider>
}

export function useSettings(): Store {
  const store = useContext(SettingsContext)
  if (!store) throw new Error('useSettings must be used inside SettingsProvider')
  return store
}
