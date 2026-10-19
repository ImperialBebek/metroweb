import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { GLYPHS } from '../../components/glyphs'
import { formatDuration, logCall } from '../../data/calls'
import { contactForNumber, contactsStore, digits } from '../../data/contacts'
import { useStore } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { ContactPicture } from '../people/ContactPicture'
import { PEOPLE_GLYPHS } from '../people/glyphs'
import { useTap } from '../people/useTap'
import { nameOf, numberKind } from '../people/util'
import { DIAL_KEYS } from './dial'
import { DialKeyFace, Key } from './Keypad'
import './phone.css'

type Toggle = 'speaker' | 'mute' | 'keypad' | 'hold' | 'add'

const BUTTONS: { id: Toggle | 'bluetooth'; label: string; icon: ReactNode }[] = [
  { id: 'speaker', label: 'speaker', icon: GLYPHS.speaker },
  { id: 'mute', label: 'mute', icon: GLYPHS.mute },
  { id: 'keypad', label: 'keypad', icon: GLYPHS.keypad },
  { id: 'hold', label: 'hold', icon: GLYPHS.pause },
  { id: 'add', label: 'add call', icon: PEOPLE_GLYPHS.addPerson },
  { id: 'bluetooth', label: 'bluetooth', icon: PEOPLE_GLYPHS.bluetooth },
]

function CallButton({
  label,
  icon,
  pressed,
  disabled,
  onTap,
}: {
  label: string
  icon: ReactNode
  pressed: boolean
  disabled: boolean
  onTap: () => void
}) {
  const tap = useTap<HTMLButtonElement>(onTap, !disabled)
  return (
    <button type="button" className="phone-call-toggle" aria-pressed={pressed} disabled={disabled} {...tap}>
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        {icon}
      </svg>
      <span>{label}</span>
    </button>
  )
}

function EndButton({ onTap, disabled }: { onTap: () => void; disabled: boolean }) {
  const tap = useTap<HTMLButtonElement>(onTap, !disabled)
  return (
    <button type="button" className="phone-call-end" disabled={disabled} {...tap}>
      end call
    </button>
  )
}

// The in-call screen. Nothing is dialled: it "connects" after a short delay,
// counts the call time, and logs an outgoing call when it ends.
export function InCallPage({ number }: { number: string }) {
  const contacts = useStore(contactsStore)
  const contact = contactForNumber(contacts, number)
  const kind = numberKind(contact, number)
  const { back, registerBackHandler } = useNavigation()
  const [startedAt] = useState(() => Date.now())
  const [connectDelay] = useState(() => 1500 + Math.random() * 1500)
  const [now, setNow] = useState(startedAt)
  const [endedAfter, setEndedAfter] = useState<number | null>(null)
  const [on, setOn] = useState<Record<Toggle, boolean>>({
    speaker: false,
    mute: false,
    keypad: false,
    hold: false,
    add: false,
  })
  const [tones, setTones] = useState('')
  const call = useRef({ ended: false, startedAt, connectedAt: startedAt + connectDelay, leave: 0 })

  const ended = endedAfter !== null
  useEffect(() => {
    if (ended) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [ended])

  const connectedAt = startedAt + connectDelay
  const connected = now >= connectedAt
  const seconds = connected ? Math.floor((now - connectedAt) / 1000) : 0

  const end = useCallback(() => {
    const c = call.current
    if (c.ended) return
    c.ended = true
    const t = Date.now()
    const duration = t >= c.connectedAt ? Math.floor((t - c.connectedAt) / 1000) : 0
    logCall(number, 'outgoing', c.startedAt, duration)
    setEndedAfter(duration)
    c.leave = window.setTimeout(back, 900)
  }, [number, back])

  useEffect(
    () =>
      registerBackHandler(() => {
        if (call.current.ended) return false
        end()
        return true
      }),
    [registerBackHandler, end],
  )

  // Leaving with Start hangs up too. A call that never connected (including
  // StrictMode's mount check) isn't logged.
  useEffect(() => {
    const c = call.current
    return () => {
      window.clearTimeout(c.leave)
      if (c.ended || Date.now() < c.connectedAt) return
      c.ended = true
      logCall(number, 'outgoing', c.startedAt, Math.floor((Date.now() - c.connectedAt) / 1000))
    }
  }, [number])

  const status = ended
    ? `call ended${endedAfter ? ` ${formatDuration(endedAfter)}` : ''}`
    : !connected
      ? 'calling...'
      : on.hold
        ? `on hold ${formatDuration(seconds)}`
        : formatDuration(seconds)

  const telHref = `tel:${number.trim().startsWith('+') ? '+' : ''}${digits(number) || number}`

  return (
    <div className="phone-call" data-ended={ended || undefined}>
      <div className="phone-call-top">
        <div className="phone-call-status" aria-live="polite">
          {status}
        </div>
        <div className="phone-call-name">{contact ? nameOf(contact) : number}</div>
        <div className="phone-call-number">
          {contact ? `${kind ?? 'phone'} ${number}` : '\u00a0'}
          {on.keypad && tones && <span className="phone-call-tones"> {tones}</span>}
        </div>
      </div>
      <div className="phone-call-middle">
        {on.keypad ? (
          <div className="phone-keys phone-keys-small">
            {DIAL_KEYS.map(([digit, letters]) => (
              <Key
                key={digit}
                label={digit}
                onPress={() => !ended && setTones((t) => (t + digit).slice(-16))}
              >
                <DialKeyFace digit={digit} letters={letters} />
              </Key>
            ))}
          </div>
        ) : (
          <ContactPicture contact={contact} size={200} />
        )}
      </div>
      <div className="phone-call-buttons">
        {BUTTONS.map((b) => (
          <CallButton
            key={b.id}
            label={b.label}
            icon={b.icon}
            pressed={b.id !== 'bluetooth' && on[b.id]}
            disabled={ended || b.id === 'bluetooth' || (!connected && (b.id === 'hold' || b.id === 'add'))}
            onTap={() => {
              if (b.id !== 'bluetooth') setOn((s) => ({ ...s, [b.id]: !s[b.id as Toggle] }))
            }}
          />
        ))}
      </div>
      <EndButton onTap={end} disabled={ended} />
      <a className="phone-call-tel" href={telHref}>
        call from your phone
      </a>
    </div>
  )
}
