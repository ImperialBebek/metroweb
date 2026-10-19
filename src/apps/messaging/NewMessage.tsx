import { useMemo, useRef, useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { FullScreenPopup } from '../../components/popup'
import { usePopupClose } from '../../components/popupLayer'
import { useTilt } from '../../components/useTilt'
import { contactsStore, digits, displayName, type Contact } from '../../data/contacts'
import { useStore } from '../../data/persist'
import { ph } from '../../icons/ph'
import { ComposeBox, Conversation } from './Conversation'
import { MessageBox } from '../../components/MessageBox'
import { sendMessage } from './replies'

interface Recipient {
  name: string
  number: string
}

const MAX_SUGGESTIONS = 6

const reachable = (contacts: Contact[]) =>
  contacts
    .filter((c) => c.mobile || c.work)
    .sort((a, b) => displayName(a).localeCompare(displayName(b), 'en', { sensitivity: 'base' }))

const numberOf = (c: Contact) => (c.mobile ?? c.work)!

function suggestionsFor(contacts: Contact[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const qDigits = digits(q)
  return reachable(contacts)
    .filter((c) => {
      const words = displayName(c).toLowerCase()
      if (words.startsWith(q) || words.split(' ').some((w) => w.startsWith(q))) return true
      const numeric = qDigits.length >= 2 && qDigits.length === q.replace(/[\s()+-]/g, '').length
      return numeric && digits(numberOf(c)).includes(qDigits)
    })
    .slice(0, MAX_SUGGESTIONS)
}

// A typed name that matches one contact exactly, or anything that looks like a phone number.
function resolve(contacts: Contact[], query: string): Recipient | null {
  const q = query.trim()
  if (!q) return null
  const named = reachable(contacts).find((c) => displayName(c).toLowerCase() === q.toLowerCase())
  if (named) return { name: displayName(named), number: numberOf(named) }
  if (digits(q).length >= 3 && /^[\d\s()+.-]+$/.test(q)) return { name: q, number: q }
  return null
}

function ContactRow({ contact, onTap }: { contact: Contact; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="messaging-contact"
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      <span className="messaging-contact-name">{displayName(contact)}</span>
      <span className="messaging-contact-number">
        {contact.mobile ? 'mobile' : 'work'} {numberOf(contact)}
      </span>
    </button>
  )
}

function ContactPicker({ contacts, onPick }: { contacts: Contact[]; onPick: (c: Contact) => void }) {
  const close = usePopupClose()
  return (
    <div className="messaging-picker">
      <div className="messaging-title">choose a contact</div>
      <div className="messaging-picker-list">
        {reachable(contacts).map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            onTap={() => {
              onPick(c)
              close()
            }}
          />
        ))}
      </div>
    </div>
  )
}

function NewMessageForm({ onSent }: { onSent: (threadId: string) => void }) {
  const contacts = useStore(contactsStore)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Recipient | null>(null)
  const [text, setText] = useState('')
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState(false)
  const toInput = useRef<HTMLInputElement>(null)
  const compose = useRef<HTMLTextAreaElement>(null)

  const suggestions = useMemo(() => (picked ? [] : suggestionsFor(contacts, query)), [contacts, query, picked])
  const recipient = picked ?? resolve(contacts, query)
  const body = text.trim()

  const pick = (c: Contact) => {
    setPicked({ name: displayName(c), number: numberOf(c) })
    setQuery(displayName(c))
    compose.current?.focus({ preventScroll: true })
  }

  const send = () => {
    if (!body) return
    if (!recipient) {
      toInput.current?.focus({ preventScroll: true })
      return
    }
    onSent(sendMessage(recipient.number, body))
  }

  return (
    <div className="app-page">
      <div className="messaging-title">new message</div>
      <div className="messaging-to">
        <label className="messaging-to-label" htmlFor="messaging-to-input">
          To:
        </label>
        <input
          id="messaging-to-input"
          ref={toInput}
          className="messaging-textbox messaging-to-input"
          data-picked={picked ? true : undefined}
          value={query}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setPicked(null)
            setQuery(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (suggestions.length === 1) pick(suggestions[0])
            else compose.current?.focus({ preventScroll: true })
          }}
        />
        <button type="button" className="messaging-round" aria-label="Choose a contact" onClick={() => setPicking(true)}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
            <circle className="appbar-ring" cx="24" cy="24" r="21.5" />
            {ph('plus')}
          </svg>
        </button>
      </div>
      <div className="messaging-suggestions">
        {suggestions.map((c) => (
          <ContactRow key={c.id} contact={c} onTap={() => pick(c)} />
        ))}
      </div>
      <ComposeBox value={text} onChange={setText} onSubmit={send} inputRef={compose} />
      <AppBar
        buttons={[
          { icon: 'send', label: 'send', disabled: !body || !recipient, onTap: send },
          { icon: 'attach', label: 'attach', onTap: () => setNotice(true) },
        ]}
      />
      {picking && (
        <FullScreenPopup label="Choose a contact" onClosed={() => setPicking(false)}>
          <ContactPicker contacts={contacts} onPick={pick} />
        </FullScreenPopup>
      )}
      {notice && (
        <MessageBox
          caption="Can't attach"
          message="Pictures, voice notes and other attachments aren't available yet. You can still send text."
          buttons={[{ label: 'ok' }]}
          onDismissed={() => setNotice(false)}
        />
      )}
    </div>
  )
}

// After the first message is sent the page turns into that conversation, as on
// the phone, so Back from it returns to the conversation list.
export function NewMessagePage() {
  const [threadId, setThreadId] = useState<string | null>(null)
  if (threadId) return <Conversation threadId={threadId} autoFocus />
  return <NewMessageForm onSent={setThreadId} />
}
