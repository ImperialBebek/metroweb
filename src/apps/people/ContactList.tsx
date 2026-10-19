import { useRef, useState } from 'react'
import { FullScreenPopup } from '../../components/popup'
import { usePopupClose } from '../../components/popupLayer'
import type { Contact } from '../../data/contacts'
import { ContactPicture } from './ContactPicture'
import { useTap } from './useTap'
import { byName, groupByLetter, LETTERS, nameOf, scrollToTop } from './util'
import './people.css'

export function ContactRow({ contact, detail, onTap }: { contact: Contact; detail?: string; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-row" data-feather {...tap}>
      <ContactPicture contact={contact} />
      <span className="people-row-text">
        <span className="people-row-name" data-continuum>
          {nameOf(contact)}
        </span>
        {detail && <span className="people-row-sub">{detail}</span>}
      </span>
    </button>
  )
}

function FavoriteTile({ contact, onTap }: { contact: Contact; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-fav" data-feather {...tap} aria-label={nameOf(contact)}>
      <ContactPicture contact={contact} size="fill" />
      <span className="people-fav-name" data-continuum aria-hidden>
        {contact.first || nameOf(contact)}
      </span>
    </button>
  )
}

function LetterTile({ letter, onTap }: { letter: string; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-letter" data-feather {...tap} aria-label={`${letter}, jump to a letter`}>
      {letter}
    </button>
  )
}

function JumpTile({ letter, enabled, onTap }: { letter: string; enabled: boolean; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap, enabled)
  return (
    <button type="button" className="people-jump-tile" {...tap} disabled={!enabled}>
      {letter}
    </button>
  )
}

// The LongListSelector jump list: every letter as a tile, dimmed when no
// contact starts with it.
function JumpList({ available, onPick }: { available: Set<string>; onPick: (letter: string) => void }) {
  const close = usePopupClose()
  return (
    <div className="people-jump">
      <div className="people-jump-grid">
        {LETTERS.map((letter) => (
          <JumpTile
            key={letter}
            letter={letter}
            enabled={available.has(letter)}
            onTap={() => {
              onPick(letter)
              close()
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Alphabetical contact list grouped under accent letter tiles. Lives inside a
// .pivot-item or .people-scroll, which is what the jump list scrolls.
export function ContactList({
  contacts,
  onPick,
  favorites = false,
}: {
  contacts: Contact[]
  onPick: (contact: Contact) => void
  favorites?: boolean
}) {
  const groups = groupByLetter(contacts)
  const favs = favorites ? contacts.filter((c) => c.favorite).sort(byName) : []
  const [jumping, setJumping] = useState(false)
  const groupEls = useRef(new Map<string, HTMLElement>())

  return (
    <div className="people-list">
      {favs.length > 0 && (
        <section className="people-favs" aria-label="favorites">
          <div className="people-section-label" data-feather>
            favorites
          </div>
          <div className="people-fav-grid">
            {favs.map((c) => (
              <FavoriteTile key={c.id} contact={c} onTap={() => onPick(c)} />
            ))}
          </div>
        </section>
      )}
      {groups.map((g) => (
        <section
          key={g.letter}
          className="people-group"
          ref={(el) => {
            if (el) groupEls.current.set(g.letter, el)
            else groupEls.current.delete(g.letter)
          }}
        >
          <LetterTile letter={g.letter} onTap={() => setJumping(true)} />
          {g.contacts.map((c) => (
            <ContactRow key={c.id} contact={c} onTap={() => onPick(c)} />
          ))}
        </section>
      ))}
      {groups.length === 0 && <p className="people-empty" data-feather>No contacts yet. Tap new to add someone.</p>}
      {jumping && (
        <FullScreenPopup label="Jump to a letter" onClosed={() => setJumping(false)}>
          <JumpList
            available={new Set(groups.map((g) => g.letter))}
            onPick={(letter) => {
              const el = groupEls.current.get(letter)
              if (el) scrollToTop(el)
            }}
          />
        </FullScreenPopup>
      )}
    </div>
  )
}
