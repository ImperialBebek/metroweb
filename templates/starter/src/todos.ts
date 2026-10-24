import { formatShortDate } from 'metroweb'

export interface Todo {
  id: string
  subject: string
  due?: Date
  done: boolean
}

// Midnight, `days` from today.
export function inDays(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

export const dueLabel = (todo: Todo) => (todo.due ? `due ${formatShortDate(todo.due)}` : undefined)

export const SAMPLE_TODOS: Todo[] = [
  { id: '1', subject: 'Pick up dry cleaning', due: inDays(0), done: false },
  { id: '2', subject: 'Book a table for Friday', due: inDays(2), done: false },
  { id: '3', subject: 'Call the bank', done: false },
  { id: '4', subject: 'Renew library books', due: inDays(-1), done: true },
]
