import { useState, type ReactNode } from 'react'
import { AppBar } from '../../components/AppBar'
import { Pivot } from '../../components/Pivot'
import { callsStore, formatDuration } from '../../data/calls'
import { contactsStore, digits } from '../../data/contacts'
import { threadsStore } from '../../data/messages'
import { useStore } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { ContactPicture } from './ContactPicture'
import { PEOPLE_GLYPHS } from './glyphs'
import { MessageBox } from './MessageBox'
import { useTap } from './useTap'
import { formatBirthday, nameOf, numberKind, route, whenLabel } from './util'
import './people.css'

function Action({ title, detail, onTap }: { title: string; detail?: string; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-action" data-feather {...tap}>
      <span className="people-action-title">{title}</span>
      {detail && <span className="people-action-sub">{detail}</span>}
    </button>
  )
}

function LinkAction({ title, detail, href }: { title: string; detail: string; href: string }) {
  const tap = useTap<HTMLAnchorElement>()
  return (
    <a className="people-action" data-feather href={href} {...tap}>
      <span className="people-action-title">{title}</span>
      <span className="people-action-sub">{detail}</span>
    </a>
  )
}

function Info({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="people-action people-info" data-feather>
      <span className="people-action-title">{title}</span>
      <span className="people-action-sub">{detail}</span>
    </div>
  )
}

interface HistoryItem {
  key: string
  time: number
  title: ReactNode
  detail: string
  missed?: boolean
  number?: string
}

function HistoryEntry({ item, onCall }: { item: HistoryItem; onCall: (number: string) => void }) {
  const number = item.number
  const tap = useTap<HTMLButtonElement>(number ? () => onCall(number) : undefined, Boolean(number))
  const body = (
    <>
      <span className="people-history-title">{item.title}</span>
      <span className="people-action-sub">{item.detail}</span>
    </>
  )
  return number ? (
    <button type="button" className="people-history" data-feather data-missed={item.missed || undefined} {...tap}>
      {body}
    </button>
  ) : (
    <div className="people-history" data-feather>
      {body}
    </div>
  )
}

export function ContactCardPage({ id }: { id: string }) {
  const contacts = useStore(contactsStore)
  const calls = useStore(callsStore)
  const threads = useStore(threadsStore)
  const { navigate, back } = useNavigation()
  const [confirming, setConfirming] = useState(false)
  const live = contacts.find((c) => c.id === id)
  // Keep showing a just-deleted contact while the page turns away.
  const [shown, setShown] = useState(live)
  if (live && live !== shown) setShown(live)
  const contact = live ?? shown
  if (!contact) return null

  const { mobile, work, email, company, birthday } = contact
  const textNumber = mobile ?? work
  const numbers = [mobile, work].filter((n): n is string => Boolean(n)).map(digits)
  const history: HistoryItem[] = [
    ...calls
      .filter((c) => numbers.includes(digits(c.number)))
      .map((c) => ({
        key: c.id,
        time: c.time,
        number: c.number,
        missed: c.kind === 'missed',
        title: `${c.kind} call`,
        detail: [numberKind(contact, c.number), whenLabel(c.time), c.duration ? formatDuration(c.duration) : '']
          .filter(Boolean)
          .join(', '),
      })),
    ...threads
      .filter((t) => numbers.includes(digits(t.number)))
      .flatMap((t) =>
        t.messages.map((m) => ({
          key: m.id,
          time: m.time,
          title: m.text,
          detail: `${m.fromMe ? 'sent' : 'received'} message, ${whenLabel(m.time)}`,
        })),
      ),
  ].sort((a, b) => b.time - a.time)

  const toggleFavorite = () =>
    contactsStore.set((cs) => cs.map((c) => (c.id === contact.id ? { ...c, favorite: !c.favorite } : c)))
  const call = (number: string) => navigate(route('call', number))
  const hasInfo = mobile || work || email || company || birthday

  const profile = (
    <div className="people-card">
      <div className="people-card-head" data-feather>
        <ContactPicture contact={contact} size={173} />
        <div className="people-card-name">
          {contact.first || contact.last ? (
            <>
              <span>{contact.first}</span>
              <span>{contact.last}</span>
            </>
          ) : (
            nameOf(contact)
          )}
        </div>
      </div>
      {mobile && <Action title="call mobile" detail={mobile} onTap={() => call(mobile)} />}
      {work && <Action title="call work" detail={work} onTap={() => call(work)} />}
      {textNumber && <Action title="text" detail={textNumber} onTap={() => navigate(route('text', textNumber))} />}
      {email && <LinkAction title="send email" detail={email} href={`mailto:${email}`} />}
      {company && <Info title="company" detail={company} />}
      {birthday && <Info title="birthday" detail={formatBirthday(birthday)} />}
      {!hasInfo && <p className="people-empty" data-feather>There's no contact info yet. Tap edit to add a phone number or email.</p>}
    </div>
  )

  const historyPane = (
    <div className="people-card">
      {history.length === 0 ? (
        <p className="people-empty" data-feather>No calls or messages with {nameOf(contact)} yet.</p>
      ) : (
        history.map((item) => <HistoryEntry key={item.key} item={item} onCall={call} />)
      )}
    </div>
  )

  return (
    <div className="app-page people-page">
      <Pivot
        title={nameOf(contact)}
        items={[
          { key: 'profile', header: 'profile', content: profile },
          { key: 'history', header: 'history', content: historyPane },
        ]}
      />
      <AppBar
        buttons={[
          { icon: 'edit', label: 'edit', onTap: () => navigate(route('edit', contact.id)) },
          contact.favorite
            ? { icon: PEOPLE_GLYPHS.favoriteOn, label: 'unfavorite', onTap: toggleFavorite }
            : { icon: 'favorite', label: 'favorite', onTap: toggleFavorite },
        ]}
        menu={[{ label: 'delete', onTap: () => setConfirming(true) }]}
      />
      {confirming && (
        <MessageBox
          title="Delete contact?"
          message={`${nameOf(contact)} will be deleted from your phone.`}
          confirmLabel="delete"
          onClosed={() => setConfirming(false)}
          onConfirm={() => {
            contactsStore.set((cs) => cs.filter((c) => c.id !== contact.id))
            back()
          }}
        />
      )}
    </div>
  )
}
