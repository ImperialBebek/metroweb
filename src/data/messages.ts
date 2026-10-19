import { newId, persistentStore } from './persist'

export interface Message {
  id: string
  text: string
  time: number
  fromMe: boolean
}

export interface Thread {
  id: string
  // Phone number of the other person; the contact is looked up from it.
  number: string
  messages: Message[]
  unread: number
}

export const threadsStore = persistentStore<Thread[]>('messages', () => {
  const now = Date.now()
  const min = 60_000
  return [
    {
      id: 't1',
      number: '(425) 555-0110',
      unread: 1,
      messages: [
        { id: 'm1', text: 'Morning! Are we still on for lunch?', time: now - 50 * min, fromMe: false },
      ],
    },
    {
      id: 't2',
      number: '(425) 555-0116',
      unread: 1,
      messages: [
        { id: 'm2', text: 'Happy Friday! Any plans for the weekend?', time: now - 3 * 60 * min, fromMe: false },
      ],
    },
    {
      id: 't3',
      number: '(425) 555-0111',
      unread: 0,
      messages: [
        { id: 'm3', text: 'Movie night at mine, bring snacks', time: now - 26 * 60 * min, fromMe: false },
        { id: 'm4', text: "Deal. I'll bring popcorn", time: now - 25 * 60 * min, fromMe: true },
      ],
    },
  ]
})

export const unreadThreadCount = (threads: Thread[]) => threads.filter((t) => t.unread > 0).length

export const lastMessage = (thread: Thread): Message | undefined => thread.messages[thread.messages.length - 1]

const lastTime = (thread: Thread) => lastMessage(thread)?.time ?? 0

// Newest conversation first, as on the phone.
export const sortedThreads = (threads: Thread[]) => [...threads].sort((a, b) => lastTime(b) - lastTime(a))

// Numbers typed in different formats ("4255550110", "(425) 555-0110") are the same recipient.
function sameNumber(a: string, b: string) {
  const da = a.replace(/\D/g, '')
  const db = b.replace(/\D/g, '')
  return da ? da === db : a.trim().toLowerCase() === b.trim().toLowerCase()
}

export const threadForNumber = (threads: Thread[], number: string) => threads.find((t) => sameNumber(t.number, number))

// Appends a message to the conversation with `number`, starting one if there
// is none, and returns the thread id.
export function addMessage(number: string, text: string, fromMe: boolean, markUnread = false): string {
  const existing = threadForNumber(threadsStore.get(), number)
  const id = existing?.id ?? newId()
  const message: Message = { id: newId(), text, time: Date.now(), fromMe }
  threadsStore.set((prev) => {
    if (!prev.some((t) => t.id === id)) return [...prev, { id, number, messages: [message], unread: markUnread ? 1 : 0 }]
    return prev.map((t) => {
      if (t.id !== id) return t
      const unread = fromMe ? 0 : markUnread ? t.unread + 1 : t.unread
      return { ...t, messages: [...t.messages, message], unread }
    })
  })
  return id
}

export function markThreadRead(id: string) {
  if (!threadsStore.get().some((t) => t.id === id && t.unread > 0)) return
  threadsStore.set((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
}

export function deleteThreads(ids: string[]) {
  threadsStore.set((prev) => prev.filter((t) => !ids.includes(t.id)))
}
