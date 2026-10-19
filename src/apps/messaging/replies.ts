import { useEffect, useSyncExternalStore } from 'react'
import { addMessage } from '../../data/messages'

// Threads currently on screen. A reply that lands in one of them is read straight away.
const viewing = new Set<string>()

export function useViewingThread(id: string) {
  useEffect(() => {
    viewing.add(id)
    return () => {
      viewing.delete(id)
    }
  }, [id])
}

let typing: readonly string[] = []
const listeners = new Set<() => void>()

function setTyping(id: string, on: boolean) {
  if (typing.includes(id) === on) return
  typing = on ? [...typing, id] : typing.filter((t) => t !== id)
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useTyping = (id: string) => useSyncExternalStore(subscribe, () => typing.includes(id))

const REPLIES: [RegExp, string[]][] = [
  [
    /\b(lunch|dinner|eat|food|hungry)\b/i,
    ['Lunch sounds great! The usual place at 12:30?', "I'm starving, count me in", 'Yes! I know a new noodle place we should try'],
  ],
  [/\b(thank|thx|cheers)/i, ['Anytime :)', 'No problem, happy to help!', 'Of course!']],
  [/\b(sorry|late)\b/i, ['No worries at all', "It's fine, take your time"]],
  [/\b(movie|film|popcorn|snack)/i, ["Can't wait. You pick the movie this time", 'I call the comfy chair']],
  [/\b(weekend|saturday|sunday|friday)\b/i, ['Thinking of a hike if the weather holds. You in?', 'Nothing planned yet, any ideas?']],
  [/^\s*(hi|hey|hello|yo)\b/i, ["Hey! How's your day going?", 'Hi there! What are you up to?']],
  [/\?\s*$/, ['Good question, let me check and get back to you', 'Hmm, I think so? Let me double-check', 'Yes, definitely']],
]

const FALLBACK = ['Sounds good!', 'Ha, love it', 'Okay, talk soon', 'Got it', 'Nice, see you later!', 'Sure thing']

let fallbackTurn = Math.floor(Math.random() * FALLBACK.length)

function pickReply(text: string) {
  const match = REPLIES.find(([pattern]) => pattern.test(text))
  if (match) return match[1][Math.floor(Math.random() * match[1].length)]
  fallbackTurn = (fallbackTurn + 1) % FALLBACK.length
  return FALLBACK[fallbackTurn]
}

const pending = new Map<string, number[]>()
const between = (min: number, max: number) => min + Math.random() * (max - min)

// Timers live at module level, not in effects, so a reply still arrives after
// the thread or the whole app is closed, and StrictMode can't schedule it twice.
// Several quick messages in a row get one reply to the latest.
function scheduleReply(threadId: string, number: string, text: string) {
  pending.get(threadId)?.forEach((timer) => window.clearTimeout(timer))
  setTyping(threadId, false)
  const wait = between(700, 1500)
  const typeFor = between(1100, 2300)
  const startTyping = window.setTimeout(() => setTyping(threadId, true), wait)
  const deliver = window.setTimeout(() => {
    pending.delete(threadId)
    setTyping(threadId, false)
    addMessage(number, pickReply(text), false, !viewing.has(threadId))
  }, wait + typeFor)
  pending.set(threadId, [startTyping, deliver])
}

export function sendMessage(number: string, text: string): string {
  const id = addMessage(number, text, true)
  scheduleReply(id, number, text)
  return id
}
