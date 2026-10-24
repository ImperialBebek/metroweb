import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { callsStore, formatNumber } from '../../data/calls'
import { contactForNumber, contactsStore, digits } from '../../data/contacts'
import { useStore } from '../../data/persist'
import { GLYPHS, PhIcon, useNavigation } from 'metroweb'
import { PEOPLE_GLYPHS } from '../people/glyphs'
import { useTap } from '../people/useTap'
import { nameOf, route } from '../people/util'
import { DIAL_KEYS } from './dial'
import './phone.css'

const LONG_PRESS = 600
const MAX_LENGTH = 24

function Voicemail() {
  return <PhIcon name="voicemail" size={26} />
}

// A dial key: digits go in on press, like the phone. Keys with `onLong`
// (0 for "+", backspace to clear) wait for release to tell the two apart.
export function Key({
  label,
  className = 'phone-key',
  onPress,
  onLong,
  children,
}: {
  label: string
  className?: string
  onPress: () => void
  onLong?: () => void
  children: ReactNode
}) {
  const timer = useRef(0)
  const longFired = useRef(false)
  const down = useRef(false)
  const cancel = () => {
    window.clearTimeout(timer.current)
    down.current = false
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        down.current = true
        if (!onLong) {
          onPress()
          return
        }
        longFired.current = false
        timer.current = window.setTimeout(() => {
          longFired.current = true
          onLong()
        }, LONG_PRESS)
      }}
      onPointerUp={() => {
        if (down.current && onLong && !longFired.current) onPress()
        cancel()
      }}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.detail === 0) onPress()
      }}
    >
      {children}
    </button>
  )
}

export function DialKeyFace({ digit, letters }: { digit: string; letters: string }) {
  return (
    <>
      <span className="phone-key-digit">{digit}</span>
      <span className="phone-key-letters">{digit === '1' ? <Voicemail /> : letters}</span>
    </>
  )
}

function WideButton({ className, onTap, children }: { className: string; onTap: () => void; children: ReactNode }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className={className} {...tap}>
      {children}
    </button>
  )
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)

export function KeypadPage() {
  const contacts = useStore(contactsStore)
  const calls = useStore(callsStore)
  const { navigate } = useNavigation()
  const [raw, setRaw] = useState('')
  const page = useRef<HTMLDivElement>(null)
  const shown = formatNumber(raw)
  const match = raw.length >= 7 ? contactForNumber(contacts, raw) : undefined

  const add = (ch: string) => setRaw((r) => (r + ch).slice(0, MAX_LENGTH))
  const call = () => {
    if (raw) {
      navigate(route('call', shown))
      return
    }
    // An empty call key recalls the last number dialled, as on the phone.
    const last = calls.filter((c) => c.kind === 'outgoing').sort((a, b) => b.time - a.time)[0]
    if (last) setRaw((last.number.startsWith('+') ? '+' : '') + digits(last.number))
  }
  const save = () => navigate(route('new', shown))

  const latest = useRef({ call, raw })
  useLayoutEffect(() => {
    latest.current = { call, raw }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (page.current?.closest('.page-host')?.getAttribute('data-active') !== 'true') return
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9*#+]$/.test(e.key)) {
        e.preventDefault()
        setRaw((r) => (r + e.key).slice(0, MAX_LENGTH))
      } else if (e.key === 'Backspace' && latest.current.raw) {
        // Capture phase, so the shell's Backspace-means-Back handler never sees it.
        e.preventDefault()
        e.stopPropagation()
        setRaw((r) => r.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        latest.current.call()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const size = shown.length > 16 ? 36 : shown.length > 12 ? 44 : 54
  return (
    <div className="phone-keypad" data-sheet ref={page}>
      <div className="phone-display">
        <div className="phone-display-text">
          <div className="phone-display-name">{match ? nameOf(match) : '\u00a0'}</div>
          <div className="phone-display-number" style={{ fontSize: size }} aria-live="polite">
            {shown || '\u00a0'}
          </div>
        </div>
        {raw && (
          <Key
            label="Backspace"
            className="phone-backspace"
            onPress={() => setRaw((r) => r.slice(0, -1))}
            onLong={() => setRaw('')}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
              {PEOPLE_GLYPHS.backspace}
            </svg>
          </Key>
        )}
      </div>
      <div className="phone-keys">
        {DIAL_KEYS.map(([digit, letters]) => (
          <Key
            key={digit}
            label={digit}
            onPress={() => add(digit)}
            onLong={digit === '0' ? () => add('+') : undefined}
          >
            <DialKeyFace digit={digit} letters={letters} />
          </Key>
        ))}
      </div>
      <div className="phone-keypad-actions">
        <WideButton className="phone-dial-call" onTap={call}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
            {GLYPHS.phone}
          </svg>
          call
        </WideButton>
        <WideButton className="phone-dial-save" onTap={save}>
          save
        </WideButton>
      </div>
    </div>
  )
}
