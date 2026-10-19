import { useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { Paragraph, SettingsPage } from '../../components/controls'
import { Pivot } from '../../components/Pivot'
import { contactsStore, digits, type Contact, type ContactGroup } from '../../data/contacts'
import { useStore } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { ContactList, ContactRow } from './ContactList'
import { ContactPicture } from './ContactPicture'
import { TextBox } from './TextBox'
import { useTap } from './useTap'
import { byName, matchesQuery, nameOf, route, whenLabel } from './util'
import './people.css'

// Made-up social posts; no networks are connected.
const UPDATES: { contact: string; text: string; hoursAgo: number }[] = [
  { contact: 'c5', text: 'Tried making fresh pasta tonight. Turned out better than expected!', hoursAgo: 1 },
  { contact: 'c8', text: 'Checked in at Lakeside Park.', hoursAgo: 3 },
  { contact: 'c1', text: 'Big week at Contoso: the new office is finally open.', hoursAgo: 6 },
  { contact: 'c13', text: 'Any book recommendations for a long flight?', hoursAgo: 20 },
  { contact: 'c10', text: 'Added 12 photos to the album "Weekend hike".', hoursAgo: 30 },
  { contact: 'c4', text: 'Finished my first half marathon. Legs are not speaking to me.', hoursAgo: 50 },
]

const GROUPS: { id: ContactGroup; name: string }[] = [
  { id: 'family', name: 'family' },
  { id: 'work', name: 'work' },
]

function Update({ contact, text, when }: { contact: Contact; text: string; when: string }) {
  const { navigate } = useNavigation()
  const tap = useTap<HTMLButtonElement>(() => navigate(route('contact', contact.id)))
  return (
    <button type="button" className="people-update" data-feather {...tap}>
      <ContactPicture contact={contact} />
      <span className="people-update-text">
        <span className="people-update-name" data-continuum>
          {nameOf(contact)}
        </span>
        <span className="people-update-body">{text}</span>
        <span className="people-row-sub">{when} · sample update</span>
      </span>
    </button>
  )
}

function WhatsNew({ contacts }: { contacts: Contact[] }) {
  const [now] = useState(() => Date.now())
  const updates = UPDATES.flatMap((u) => {
    const contact = contacts.find((c) => c.id === u.contact)
    return contact ? [{ ...u, contact }] : []
  })
  return (
    <div className="people-list">
      <p className="people-empty" data-feather>These are sample posts. No social networks are connected.</p>
      {updates.map((u) => (
        <Update
          key={u.contact.id}
          contact={u.contact}
          text={u.text}
          when={u.hoursAgo < 24 ? `${u.hoursAgo} hour${u.hoursAgo === 1 ? '' : 's'} ago` : whenLabel(now - u.hoursAgo * 3_600_000, now)}
        />
      ))}
    </div>
  )
}

function GroupRow({ name, members, onTap }: { name: string; members: Contact[]; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-group-row" data-feather {...tap}>
      <span className="people-group-tile" aria-hidden>
        {members.slice(0, 4).map((c) => (
          <ContactPicture key={c.id} contact={c} size="fill" />
        ))}
      </span>
      <span className="people-row-text">
        <span className="people-row-name" data-continuum>
          {name}
        </span>
        <span className="people-row-sub">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </span>
      </span>
    </button>
  )
}

function Together({ contacts }: { contacts: Contact[] }) {
  const { navigate } = useNavigation()
  const groups = GROUPS.map((g) => ({ ...g, members: contacts.filter((c) => c.group === g.id).sort(byName) })).filter(
    (g) => g.members.length > 0,
  )
  return (
    <div className="people-list">
      {groups.map((g) => (
        <GroupRow key={g.id} name={g.name} members={g.members} onTap={() => navigate(route('group', g.id))} />
      ))}
      <p className="people-empty" data-feather>
        {groups.length ? 'Put someone in a group when you edit their contact.' : 'No groups yet. Edit a contact to put them in family or work.'}
      </p>
    </div>
  )
}

export function PeopleHub() {
  const contacts = useStore(contactsStore)
  const { navigate } = useNavigation()
  return (
    <div className="app-page people-page">
      <Pivot
        title="people"
        items={[
          {
            key: 'all',
            header: 'all',
            content: <ContactList contacts={contacts} favorites onPick={(c) => navigate(route('contact', c.id))} />,
          },
          { key: 'new', header: "what's new", content: <WhatsNew contacts={contacts} /> },
          { key: 'together', header: 'together', content: <Together contacts={contacts} /> },
        ]}
      />
      <AppBar
        buttons={[
          { icon: 'add', label: 'new', onTap: () => navigate(route('new')) },
          { icon: 'search', label: 'search', onTap: () => navigate('search') },
        ]}
      />
    </div>
  )
}

export function GroupPage({ group }: { group: string }) {
  const contacts = useStore(contactsStore)
  const { navigate } = useNavigation()
  const members = contacts.filter((c) => c.group === group).sort(byName)
  return (
    <SettingsPage app="people" title={group}>
      <div className="people-list people-list-flat">
        {members.map((c) => (
          <ContactRow key={c.id} contact={c} onTap={() => navigate(route('contact', c.id))} />
        ))}
      </div>
      {members.length === 0 && <Paragraph subtle>Nobody is in this group.</Paragraph>}
    </SettingsPage>
  )
}

// The line under a result shows what matched: a number or email, or the mobile number for a name match.
function matchDetail(c: Contact, query: string) {
  const q = query.trim().toLowerCase()
  if (!nameOf(c).toLowerCase().includes(q)) {
    if (c.email?.toLowerCase().includes(q)) return c.email
    if (c.company?.toLowerCase().includes(q)) return c.company
    const d = digits(q)
    const number = d ? [c.mobile, c.work].find((n) => n && digits(n).includes(d)) : undefined
    if (number) return number
  }
  return c.mobile ?? c.work ?? c.email
}

export function PeopleSearchPage() {
  const contacts = useStore(contactsStore)
  const { navigate } = useNavigation()
  const [query, setQuery] = useState('')
  const results = contacts.filter((c) => matchesQuery(c, query)).sort(byName)
  return (
    <div className="app-page people-page">
      <div className="people-small-title" data-feather>
        people
      </div>
      <div className="people-search-box" data-feather>
        <TextBox type="search" aria-label="search people" autoFocus value={query} onChange={setQuery} enterKeyHint="search" />
      </div>
      <div className="people-scroll">
        <div className="people-list people-list-flat">
          {results.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              detail={matchDetail(c, query)}
              onTap={() => navigate(route('contact', c.id))}
            />
          ))}
        </div>
        {query.trim() === '' && <p className="people-empty" data-feather>Search by name, phone number or email.</p>}
        {query.trim() !== '' && results.length === 0 && <p className="people-empty" data-feather>No results.</p>}
      </div>
    </div>
  )
}
