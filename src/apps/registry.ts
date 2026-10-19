import type { ComponentType } from 'react'
import { CalculatorApp } from './calculator/CalculatorApp'
import { OneNoteApp } from './onenote/OneNoteApp'
import { CameraApp } from './camera/CameraApp'
import { PhotosApp } from './photos/PhotosApp'
import { AlarmsApp } from './alarms/AlarmsApp'
import { CalendarApp } from './calendar/CalendarApp'
import { PeopleApp } from './people/PeopleApp'
import { PhoneApp } from './phone/PhoneApp'
import { MessagingApp } from './messaging/MessagingApp'
import { MusicApp } from './music/MusicApp'
import type { AppProps } from './types'

// Apps with their own implementation; anything else opens PlaceholderApp.
export const APP_COMPONENTS: Partial<Record<string, ComponentType<AppProps>>> = {
  calculator: CalculatorApp,
  onenote: OneNoteApp,
  camera: CameraApp,
  photos: PhotosApp,
  alarms: AlarmsApp,
  calendar: CalendarApp,
  people: PeopleApp,
  phone: PhoneApp,
  messaging: MessagingApp,
  music: MusicApp,
}
