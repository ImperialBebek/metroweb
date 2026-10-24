import type { SettingsState } from '../store'
import { ACCENTS } from 'metroweb'

export interface SettingsEntry {
  route: string
  title: string
  subtitle?: (s: SettingsState) => string | undefined
}

const onOff = (on: boolean) => (on ? 'turned on' : 'turned off')

// Order comes from HKLM\SOFTWARE\Microsoft\Settings\{GUID}\SecureItems in the
// emulator image; titles and subtitles from Settings3Res.dll.mui and friends.
export const SYSTEM_ITEMS: SettingsEntry[] = [
  { route: 'sounds', title: 'ringtones+sounds' },
  {
    route: 'theme',
    title: 'theme',
    subtitle: (s) => `${s.background === 'dark' ? 'Dark' : 'Light'} ${ACCENTS[s.accent].name}`,
  },
  { route: 'accounts', title: 'email+accounts', subtitle: () => 'set up email, contacts, and others' },
  { route: 'lock', title: 'lock screen', subtitle: () => 'screen time-out: 1 minute' },
  { route: 'wifi', title: 'Wi-Fi', subtitle: (s) => onOff(s.wifi) },
  { route: 'bluetooth', title: 'Bluetooth', subtitle: (s) => onOff(s.bluetooth) },
  { route: 'tapsend', title: 'tap+send', subtitle: (s) => onOff(s.tapSend) },
  { route: 'airplane', title: 'airplane mode', subtitle: (s) => onOff(s.airplaneMode) },
  { route: 'cellular', title: 'cellular', subtitle: (s) => (s.airplaneMode ? 'airplane mode' : 'Home service') },
  { route: 'location', title: 'location', subtitle: (s) => onOff(s.location) },
  { route: 'kidscorner', title: "kid's corner", subtitle: (s) => onOff(s.kidsCorner) },
  { route: 'battery', title: 'battery saver', subtitle: (s) => onOff(s.batterySaver) },
  { route: 'storage', title: 'phone storage', subtitle: () => '4.82 GB free' },
  { route: 'backup', title: 'backup', subtitle: () => 'save stuff to the cloud' },
  { route: 'datetime', title: 'date+time' },
  {
    route: 'brightness',
    title: 'brightness',
    subtitle: (s) => (s.autoBrightness ? 'automatic' : s.brightnessLevel),
  },
  { route: 'keyboard', title: 'keyboard' },
  { route: 'region', title: 'language+region' },
  { route: 'access', title: 'ease of access', subtitle: () => 'text size, high contrast, and more' },
  { route: 'speech', title: 'speech' },
  { route: 'findmyphone', title: 'find my phone', subtitle: () => 'ring, lock, erase, or find your phone' },
  { route: 'update', title: 'phone update', subtitle: () => 'get software updates' },
  { route: 'company', title: 'company apps', subtitle: () => 'add a company account' },
  { route: 'about', title: 'about', subtitle: () => 'your phone' },
  { route: 'feedback', title: 'feedback' },
]

export const APPLICATION_ITEMS: SettingsEntry[] = [
  { route: 'app-people', title: 'people' },
  { route: 'app-photos', title: 'photos+camera' },
  { route: 'app-messaging', title: 'messaging' },
  { route: 'app-phone', title: 'phone' },
  { route: 'app-ie', title: 'Internet Explorer' },
  { route: 'app-office', title: 'Office' },
  { route: 'app-music', title: 'music+videos' },
  { route: 'app-maps', title: 'maps' },
  { route: 'app-search', title: 'search' },
  { route: 'app-wallet', title: 'wallet' },
  { route: 'app-games', title: 'games' },
  { route: 'app-background', title: 'background tasks' },
  { route: 'app-store', title: 'store' },
]

export const ALL_ITEMS = [...SYSTEM_ITEMS, ...APPLICATION_ITEMS]
