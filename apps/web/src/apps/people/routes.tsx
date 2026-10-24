import { Conversation } from '../messaging/Conversation'
import { InCallPage } from '../phone/InCall'
import { ContactCardPage } from './ContactCard'
import { ContactEditPage } from './ContactEdit'
import { parseRoute } from './util'
import './people.css'

// Pages People and Phone both push: contact card, edit/new contact, text and the in-call screen.
export function SharedRoute({ route }: { route: string }) {
  const { name, arg } = parseRoute(route)
  switch (name) {
    case 'contact':
      return <ContactCardPage id={arg} />
    case 'edit':
      return <ContactEditPage id={arg} />
    case 'new':
      return <ContactEditPage number={arg} />
    case 'text':
      return <Conversation number={arg} autoFocus />
    case 'call':
      return <InCallPage number={arg} />
    default:
      return null
  }
}
