import { PageStack } from '../../navigation'
import type { AppProps } from '../types'
import { GroupPage, PeopleHub, PeopleSearchPage } from './hub'
import { SharedRoute } from './routes'
import { parseRoute } from './util'

export function PeopleApp({ onExit, handle }: AppProps) {
  const render = (value: string) => {
    const { name, arg } = parseRoute(value)
    switch (name) {
      case 'hub':
        return <PeopleHub />
      case 'search':
        return <PeopleSearchPage />
      case 'group':
        return <GroupPage group={arg} />
      default:
        return <SharedRoute route={value} />
    }
  }
  return <PageStack enter transition="feather" initialRoute="hub" render={render} onExit={onExit} handle={handle} />
}
