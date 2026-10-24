import { at, dayStart, newId, persistentStore } from './persist'

export type BlockKind = 'text' | 'todo' | 'bullet'

export interface NoteBlock {
  id: string
  kind: BlockKind
  text: string
  checked?: boolean
}

export interface Note {
  id: string
  title: string
  blocks: NoteBlock[]
  notebook: string
  section: string
  created: number
  updated: number
  pinned?: boolean
}

export const NOTEBOOK = 'Personal'
export const SECTION = 'Quick Notes'

const block = (kind: BlockKind, text: string, checked = false): NoteBlock => ({
  id: newId(),
  kind,
  text,
  ...(kind === 'todo' ? { checked } : {}),
})

function seed(): Note[] {
  const note = (title: string, blocks: NoteBlock[], created: number, updated: number): Note => ({
    id: newId(),
    title,
    blocks,
    notebook: NOTEBOOK,
    section: SECTION,
    created,
    updated,
  })
  return [
    note(
      'Shopping list',
      [block('todo', 'milk'), block('todo', 'eggs'), block('todo', 'bread'), block('todo', 'coffee beans')],
      at(dayStart(-3), 18, 12),
      Date.now() - 25 * 60_000,
    ),
    note(
      'Trip notes',
      [
        block('text', 'Flight leaves Friday at 7:45 AM from gate 23. Check in online the night before and bring the printed boarding pass.'),
        block('text', 'The hotel is two blocks from the old harbour. Breakfast is included; ask about the ferry to the island on Saturday morning.'),
        block('todo', 'passport', true),
        block('todo', 'charger and spare battery'),
      ],
      at(dayStart(-9), 21, 5),
      at(dayStart(-1), 19, 30),
    ),
    note(
      'Ideas',
      [
        block('text', 'Things to try this summer'),
        block('bullet', 'a photo walk along the river at sunrise'),
        block('bullet', 'learn three songs on the guitar'),
        block('bullet', 'build a small herb garden on the balcony'),
      ],
      at(dayStart(-20), 12, 0),
      at(dayStart(-6), 22, 14),
    ),
  ]
}

export const notesStore = persistentStore<Note[]>('notes', seed)

export interface NoteSettings {
  previews: boolean
}

export const noteSettingsStore = persistentStore<NoteSettings>('onenote-settings', () => ({ previews: true }))

export const newBlock = (kind: BlockKind = 'text', text = '') => block(kind, text)

export function latestNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updated - a.updated)
}

export const isNoteEmpty = (note: Note) => !note.title.trim() && note.blocks.every((b) => !b.text.trim())

// The start of the body as one line, shown under the title in lists. List
// items read better comma-separated ("milk, eggs, bread").
export function noteSnippet(note: Note): string {
  let snippet = ''
  for (const b of note.blocks) {
    const line = b.text.replace(/\s+/g, ' ').trim()
    if (!line) continue
    snippet = snippet ? snippet + (b.kind === 'text' ? ' ' : ', ') + line : line
    if (snippet.length > 120) break
  }
  return snippet
}

export const noteTitle = (note: Note) => note.title.trim() || noteSnippet(note) || 'Untitled page'

export function noteText(note: Note): string {
  return [note.title, ...note.blocks.map((b) => b.text)].join('\n')
}

export function createNote(): Note {
  const now = Date.now()
  const note: Note = {
    id: newId(),
    title: '',
    blocks: [block('text', '')],
    notebook: NOTEBOOK,
    section: SECTION,
    created: now,
    updated: now,
  }
  notesStore.set((notes) => [...notes, note])
  return note
}

export function updateNote(id: string, change: (note: Note) => Partial<Note>) {
  notesStore.set((notes) => notes.map((n) => (n.id === id ? { ...n, ...change(n), updated: Date.now() } : n)))
}

export function deleteNote(id: string) {
  notesStore.set((notes) => notes.filter((n) => n.id !== id))
}
