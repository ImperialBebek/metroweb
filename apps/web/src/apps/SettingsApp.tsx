import type { Ref } from 'react'
import { PageStack, type StackHandle } from 'metroweb'
import {
  AboutPage,
  AirplanePage,
  BatteryPage,
  BluetoothPage,
  BrightnessPage,
  LocationPage,
  PlaceholderPage,
  SettingsHome,
  TapSendPage,
  ThemePage,
  WifiPage,
} from '../pages/pages'

export function SettingsApp({
  popupLayer,
  onExit,
  handle,
}: {
  popupLayer: HTMLDivElement | null
  onExit: () => void
  handle: Ref<StackHandle>
}) {
  const render = (route: string) => {
    switch (route) {
      case 'home':
        return <SettingsHome />
      case 'theme':
        return <ThemePage popupLayer={popupLayer} />
      case 'airplane':
        return <AirplanePage />
      case 'wifi':
        return <WifiPage />
      case 'bluetooth':
        return <BluetoothPage />
      case 'tapsend':
        return <TapSendPage />
      case 'location':
        return <LocationPage />
      case 'battery':
        return <BatteryPage />
      case 'brightness':
        return <BrightnessPage />
      case 'about':
        return <AboutPage />
      default:
        return <PlaceholderPage route={route} />
    }
  }
  return <PageStack enter initialRoute="home" render={render} onExit={onExit} handle={handle} />
}
