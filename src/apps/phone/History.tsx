import { useEffect, useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { Paragraph, SettingsPage } from '../../components/controls'
import { callsStore, clearCalls, markMissedSeen, missedCallCount, type Call } from '../../data/calls'
import { contactForNumber, contactsStore, digits, type Contact } from '../../data/contacts'
import { useStore } from '../../data/persist'
import { PH } from '../../icons/phosphor'
import { useNavigation } from '../../navigation'
import { ContactList } from '../people/ContactList'
import { PEOPLE_GLYPHS } from '../people/glyphs'
import { MessageBox } from '../people/MessageBox'
import { TextBox } from '../people/TextBox'
import { useTap } from '../people/useTap'
import { nameOf, numberKind, route, whenLabel } from '../people/util'
import '../people/people.css'
import './phone.css'

interface Entry {
  call: Call
  count: number
}

// Back-to-back calls with the same number and outcome on the same day show as one row with a count.
function collapse(calls: Call[]): Entry[] {
  const entries: Entry[] = []
  for (const call of [...calls].sort((a, b) => b.time - a.time)) {
    const last = entries[entries.length - 1]
    if (
      last &&
      last.call.kind === call.kind &&
      digits(last.call.number) === digits(call.number) &&
      new Date(last.call.time).toDateString() === new Date(call.time).toDateString()
    ) {
      last.count++
    } else {
      entries.push({ call, count: 1 })
    }
  }
  return entries
}

const DIRECTION_NAMES: Record<Call['kind'], string> = { incoming: 'Incoming', outgoing: 'Outgoing', missed: 'Missed' }

function Direction({ kind }: { kind: Call['kind'] }) {
  return (
    <svg className="phone-direction" width="18" height="18" viewBox="0 0 256 256" role="img" aria-label={DIRECTION_NAMES[kind]}>
      <path fill="currentColor" d={PH[kind === 'outgoing' ? 'arrow-up-right' : 'arrow-down-left']} />
    </svg>
  )
}

function HistoryRow({ entry, contacts }: { entry: Entry; contacts: Contact[] }) {
  const { navigate } = useNavigation()
  const { call, count } = entry
  const contact = contactForNumber(contacts, call.number)
  const title = contact ? nameOf(contact) : call.number
  const detail = [numberKind(contact, call.number), call.kind === 'missed' ? 'missed' : '', whenLabel(call.time)]
    .filter(Boolean)
    .join(', ')
  const main = useTap<HTMLButtonElement>(() => navigate(route('call', call.number)))
  const more = useTap<HTMLButtonElement>(() =>
    navigate(contact ? route('contact', contact.id) : route('new', call.number)),
  )
  return (
    <div className="phone-row" data-feather data-missed={call.kind === 'missed' || undefined}>
      <button type="button" className="phone-row-main" {...main}>
        <span className="phone-row-title">
          {title}
          {count > 1 && <span className="phone-row-count"> ({count})</span>}
        </span>
        <span className="phone-row-detail">
          <Direction kind={call.kind} />
          {detail}
        </span>
      </button>
      <button
        type="button"
        className="phone-row-more"
        {...more}
        aria-label={contact ? `View ${nameOf(contact)}` : `Save ${call.number}`}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
          {contact ? PEOPLE_GLYPHS.person : PEOPLE_GLYPHS.addPerson}
        </svg>
      </button>
    </div>
  )
}

export function HistoryPage() {
  const calls = useStore(callsStore)
  const contacts = useStore(contactsStore)
  const { navigate } = useNavigation()
  const [confirming, setConfirming] = useState(false)
  // Opening the history is what clears the missed-call count on the Phone tile.
  const unseen = missedCallCount(calls) > 0
  useEffect(() => {
    if (unseen) markMissedSeen()
  }, [unseen])
  const entries = collapse(calls)
  return (
    <div className="app-page phone-page">
      <SettingsPage app="phone" title="history">
        {entries.length === 0 ? (
          <Paragraph subtle>No calls yet. Tap keypad to make one.</Paragraph>
        ) : (
          <div className="phone-history">
            {entries.map((entry) => (
              <HistoryRow key={entry.call.id} entry={entry} contacts={contacts} />
            ))}
          </div>
        )}
      </SettingsPage>
      <AppBar
        buttons={[
          { icon: 'keypad', label: 'keypad', onTap: () => navigate('keypad') },
          { icon: PEOPLE_GLYPHS.person, label: 'people', onTap: () => navigate('pick') },
          { icon: 'search', label: 'search', onTap: () => navigate('search') },
        ]}
        menu={[
          { label: 'delete all', onTap: () => setConfirming(true), disabled: calls.length === 0 },
          { label: 'call settings', onTap: () => navigate('settings') },
        ]}
      />
      {confirming && (
        <MessageBox
          title="Delete call history"
          message="Are you sure you want to delete the entire call history list?"
          confirmLabel="delete"
          onConfirm={clearCalls}
          onClosed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export function PhoneSearchPage() {
  const calls = useStore(callsStore)
  const contacts = useStore(contactsStore)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const d = digits(q)
  const entries = q
    ? collapse(calls).filter(({ call }) => {
        const contact = contactForNumber(contacts, call.number)
        return (contact && nameOf(contact).toLowerCase().includes(q)) || (d && digits(call.number).includes(d))
      })
    : []
  return (
    <div className="app-page phone-page">
      <div className="people-small-title">phone</div>
      <div className="people-search-box">
        <TextBox type="search" aria-label="Search history" autoFocus value={query} onChange={setQuery} />
      </div>
      <div className="people-scroll">
        <div className="phone-history">
          {entries.map((entry) => (
            <HistoryRow key={entry.call.id} entry={entry} contacts={contacts} />
          ))}
        </div>
        {!q && <p className="people-empty">Search your call history by name or number.</p>}
        {q && entries.length === 0 && <p className="people-empty">No results.</p>}
      </div>
    </div>
  )
}

// The app bar's people button: choose someone, then call from their contact card.
export function PickPage() {
  const contacts = useStore(contactsStore)
  const { navigate } = useNavigation()
  return (
    <div className="app-page phone-page">
      <div className="people-small-title">choose a contact</div>
      <div className="people-scroll">
        <ContactList contacts={contacts} onPick={(c) => navigate(route('contact', c.id))} />
      </div>
    </div>
  )
}
