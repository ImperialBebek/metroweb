import { useEffect, useState } from 'react'
import { AppBar, type AppBarButtonDef } from '../../components/AppBar'
import { Paragraph } from '../../components/controls'
import { Pivot } from '../../components/Pivot'
import { useTilt } from '../../components/useTilt'
import { contactsStore } from '../../data/contacts'
import { deleteThreads, lastMessage, sortedThreads, threadsStore, type Thread } from '../../data/messages'
import { useStore } from '../../data/persist'
import { PhIcon } from '../../icons/PhIcon'
import { PageStack, useNavigation } from '../../navigation'
import type { AppProps } from '../types'
import { Conversation } from './Conversation'
import { listTime, threadName } from './format'
import { MessageBox } from '../../components/MessageBox'
import { NewMessagePage } from './NewMessage'
import './messaging.css'

function ThreadRow({
  thread,
  name,
  selecting,
  checked,
  onTap,
}: {
  thread: Thread
  name: string
  selecting: boolean
  checked: boolean
  onTap: () => void
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  const last = lastMessage(thread)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="messaging-thread"
      data-feather
      data-unread={thread.unread > 0 || undefined}
      data-selecting={selecting || undefined}
      aria-pressed={selecting ? checked : undefined}
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      <span className="messaging-check" data-checked={checked || undefined} aria-hidden>
        <PhIcon name="check-bold" size={22} />
      </span>
      <span className="messaging-thread-body">
        <span className="messaging-thread-top">
          <span className="messaging-thread-name" data-continuum>
            {name}
          </span>
          {last && <span className="messaging-thread-time">{listTime(last.time)}</span>}
        </span>
        <span className="messaging-thread-snippet">{last?.text ?? ''}</span>
      </span>
    </button>
  )
}

function ConversationsPage() {
  const threads = useStore(threadsStore)
  const contacts = useStore(contactsStore)
  const { navigate, registerBackHandler } = useNavigation()
  const [pivot, setPivot] = useState(0)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)

  const sorted = sortedThreads(threads)
  const chosen = selected.filter((id) => threads.some((t) => t.id === id))

  const stopSelecting = () => {
    setSelecting(false)
    setSelected([])
  }

  useEffect(() => {
    if (!selecting) return
    return registerBackHandler(() => {
      setSelecting(false)
      setSelected([])
      return true
    })
  }, [selecting, registerBackHandler])

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const buttons: AppBarButtonDef[] = selecting
    ? [{ icon: 'delete', label: 'delete', disabled: chosen.length === 0, onTap: () => setConfirming(true) }]
    : [
        { icon: 'add', label: 'new', onTap: () => navigate('new') },
        ...(pivot === 0
          ? [{ icon: 'select', label: 'select', disabled: threads.length === 0, onTap: () => setSelecting(true) }]
          : []),
      ]

  const conversations = (
    <div className="messaging-list">
      {sorted.length === 0 && <Paragraph subtle>no conversations</Paragraph>}
      {sorted.map((t) => (
        <ThreadRow
          key={t.id}
          thread={t}
          name={threadName(contacts, t.number)}
          selecting={selecting}
          checked={chosen.includes(t.id)}
          onTap={() => (selecting ? toggle(t.id) : navigate(`thread:${t.id}`))}
        />
      ))}
    </div>
  )

  const online = (
    <div className="messaging-list">
      <Paragraph subtle>
        You're not signed in to any chat services. When you add an account that supports chat, friends who are online
        will show up here.
      </Paragraph>
    </div>
  )

  return (
    <div className="app-page">
      <div className="messaging-main">
        <Pivot
          title="messaging"
          selected={pivot}
          onSelectedChange={setPivot}
          items={[
            { key: 'conversations', header: 'conversations', content: conversations },
            { key: 'online', header: 'online', content: online },
          ]}
        />
      </div>
      <AppBar buttons={buttons} />
      {confirming && (
        <MessageBox
          caption={chosen.length === 1 ? 'Delete thread?' : 'Delete threads?'}
          message={
            chosen.length === 1
              ? 'All the messages in this thread will be deleted from your phone.'
              : 'All the messages in these threads will be deleted from your phone.'
          }
          buttons={[
            {
              label: 'delete',
              onTap: () => {
                deleteThreads(chosen)
                stopSelecting()
              },
            },
            { label: 'cancel' },
          ]}
          onDismissed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export function MessagingApp({ onExit, handle }: AppProps) {
  const render = (route: string) => {
    if (route === 'new') return <NewMessagePage />
    if (route.startsWith('thread:')) return <Conversation threadId={route.slice('thread:'.length)} />
    return <ConversationsPage />
  }
  return <PageStack enter initialRoute="main" render={render} onExit={onExit} handle={handle} />
}
