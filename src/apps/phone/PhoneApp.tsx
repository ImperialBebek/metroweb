import { PageStack } from '../../navigation'
import { SharedRoute } from '../people/routes'
import type { AppProps } from '../types'
import { CallSettingsPage } from './CallSettings'
import { HistoryPage, PhoneSearchPage, PickPage } from './History'
import { KeypadPage } from './Keypad'

export function PhoneApp({ onExit, handle }: AppProps) {
  const render = (route: string) => {
    switch (route) {
      case 'history':
        return <HistoryPage />
      case 'keypad':
        return <KeypadPage />
      case 'pick':
        return <PickPage />
      case 'search':
        return <PhoneSearchPage />
      case 'settings':
        return <CallSettingsPage />
      default:
        return <SharedRoute route={route} />
    }
  }
  return <PageStack enter initialRoute="history" render={render} onExit={onExit} handle={handle} />
}
