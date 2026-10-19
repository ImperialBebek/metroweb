import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AppBar } from '../../components/AppBar'
import { contactsStore } from '../../data/contacts'
import { deleteThreads, markThreadRead, threadForNumber, threadsStore, type Message } from '../../data/messages'
import { useStore } from '../../data/persist'
import { motionMs } from '../../motionSpeed'
import { useNavigation } from '../../navigation'
import { dayLabel, sameDay, threadName, timeOfDay } from './format'
import { MessageBox } from './MessageBox'
import { sendMessage, useTyping, useViewingThread } from './replies'

const SMS_LENGTH = 160
const STICK_DISTANCE = 48

// Bubbles anchored to the bottom; the list follows new messages unless the
// user has scrolled up to read older ones.
function MessageList({ messages, typing }: { messages: Message[]; typing: boolean }) {
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)

  const toBottom = () => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }

  useLayoutEffect(() => {
    if (messages[messages.length - 1]?.fromMe) stuck.current = true
    if (stuck.current) toBottom()
  }, [messages, typing])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (stuck.current) toBottom()
    })
    if (scroller.current) observer.observe(scroller.current)
    if (content.current) observer.observe(content.current)
    return () => observer.disconnect()
  }, [])

  const items: ReactNode[] = []
  messages.forEach((m, i) => {
    const prev = messages[i - 1]
    items.push(
      <Fragment key={m.id}>
        {(!prev || !sameDay(prev.time, m.time)) && (
          <div className="messaging-day" data-feather>
            {dayLabel(m.time)}
          </div>
        )}
        <div className="messaging-bubble" data-feather data-from={m.fromMe ? 'me' : 'them'}>
          <div className="messaging-bubble-text">{m.text}</div>
          <div className="messaging-bubble-time">{timeOfDay(m.time)}</div>
        </div>
      </Fragment>,
    )
  })

  return (
    <div
      className="messaging-scroll"
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget
        stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_DISTANCE
      }}
    >
      <div className="messaging-bubbles" ref={content} aria-live="polite">
        {items}
        {typing && (
          <div className="messaging-bubble messaging-typing" data-from="them" aria-label="typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
    </div>
  )
}

function counter(length: number) {
  if (length === 0) return ''
  const parts = Math.ceil(length / SMS_LENGTH)
  const used = length - (parts - 1) * SMS_LENGTH
  return parts > 1 ? `(${parts}) ${used}/${SMS_LENGTH}` : `${used}/${SMS_LENGTH}`
}

// The chat-bubble TextBox: grows to a few lines, Enter sends and Shift+Enter
// starts a new line.
export function ComposeBox({
  value,
  onChange,
  onSubmit,
  inputRef,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  autoFocus?: boolean
}) {
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
  }, [value, inputRef])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true })
  }, [autoFocus, inputRef])

  return (
    <div className="messaging-compose" data-feather>
      <textarea
        ref={inputRef}
        className="messaging-textbox messaging-compose-input"
        rows={1}
        value={value}
        placeholder="type a message"
        aria-label="Message"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
      <span className="messaging-counter" aria-hidden>
        {counter(value.length)}
      </span>
    </div>
  )
}

type Dialog = 'delete' | 'attach' | null

// Opened by thread id from Messaging, or by number from People, where the
// thread may not exist until the first message is sent.
export function Conversation({ threadId: id, number, autoFocus }: { threadId?: string; number?: string; autoFocus?: boolean }) {
  const threads = useStore(threadsStore)
  const contacts = useStore(contactsStore)
  const thread = id ? threads.find((t) => t.id === id) : number ? threadForNumber(threads, number) : undefined
  const threadId = thread?.id ?? id ?? ''
  const to = thread?.number ?? number
  const typing = useTyping(threadId)
  const { back } = useNavigation()
  const [text, setText] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  useViewingThread(threadId)

  const unread = thread?.unread ?? 0
  useEffect(() => {
    if (unread > 0) markThreadRead(threadId)
  }, [threadId, unread])

  const body = text.trim()
  const send = () => {
    if (!body || !to) return
    sendMessage(to, body)
    setText('')
    input.current?.focus({ preventScroll: true })
  }

  const deleteThread = () => {
    back()
    // Delete once the page has turned away, so it doesn't empty out mid-animation.
    window.setTimeout(() => deleteThreads([threadId]), motionMs(400))
  }

  return (
    <div className="app-page">
      <div className="messaging-title" data-feather data-continuum-target>
        {to ? threadName(contacts, to) : ''}
      </div>
      <MessageList messages={thread?.messages ?? []} typing={typing} />
      <ComposeBox value={text} onChange={setText} onSubmit={send} inputRef={input} autoFocus={autoFocus} />
      <AppBar
        buttons={[
          { icon: 'send', label: 'send', disabled: !body || !to, onTap: send },
          { icon: 'attach', label: 'attach', onTap: () => setDialog('attach') },
        ]}
        menu={[{ label: 'delete thread', disabled: !thread, onTap: () => setDialog('delete') }]}
      />
      {dialog === 'delete' && (
        <MessageBox
          caption="delete thread?"
          message="All the messages in this conversation will be deleted from your phone."
          buttons={[{ label: 'delete', onTap: deleteThread }, { label: 'cancel' }]}
          onDismissed={() => setDialog(null)}
        />
      )}
      {dialog === 'attach' && (
        <MessageBox
          caption="can't attach"
          message="Pictures, voice notes and other attachments aren't available yet. You can still send text."
          buttons={[{ label: 'ok' }]}
          onDismissed={() => setDialog(null)}
        />
      )}
    </div>
  )
}
