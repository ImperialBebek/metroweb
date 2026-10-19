import { useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { ListItem, Paragraph, SettingsPage } from '../../components/controls'
import { Pivot } from '../../components/Pivot'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import { useTilt } from '../../components/useTilt'
import {
  createNote,
  isNoteEmpty,
  latestNotes,
  NOTEBOOK,
  noteSettingsStore,
  notesStore,
  noteText,
  noteTitle,
  SECTION,
  type Note,
} from '../../data/notes'
import { useStore } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { NoteListItem } from './NoteListItem'

// Notes still empty are new pages being written; they are not listed yet.
function useListedNotes(notebook?: string): Note[] {
  const notes = useStore(notesStore)
  return latestNotes(notes.filter((n) => !isNoteEmpty(n) && (!notebook || n.notebook === notebook)))
}

function useNewNote() {
  const { navigate } = useNavigation()
  return () => navigate(`note:${createNote().id}:new`)
}

function NoteList({ notes, empty }: { notes: Note[]; empty: string }) {
  const { navigate } = useNavigation()
  const { previews } = useStore(noteSettingsStore)
  if (!notes.length) return <Paragraph subtle>{empty}</Paragraph>
  return (
    <div className="list">
      {notes.map((note) => (
        <NoteListItem key={note.id} note={note} preview={previews} onTap={() => navigate(`note:${note.id}`)} />
      ))}
    </div>
  )
}

export function HomePage() {
  const { navigate } = useNavigation()
  const notes = useListedNotes()
  const newNote = useNewNote()
  const pages = notes.length === 1 ? '1 page' : `${notes.length} pages`
  return (
    <div className="app-page">
      <div className="onenote-fill">
        <Pivot
          title="OneNote"
          items={[
            {
              key: 'recent',
              header: 'recent',
              content: <NoteList notes={notes} empty="Tap new to start a page." />,
            },
            {
              key: 'all',
              header: 'all',
              content: (
                <div className="list">
                  <ListItem title={NOTEBOOK} subtitle={pages} onTap={() => navigate(`notebook:${NOTEBOOK}`)} />
                </div>
              ),
            },
          ]}
        />
      </div>
      <AppBar
        buttons={[
          { icon: 'add', label: 'new', onTap: newNote },
          { icon: 'search', label: 'search', onTap: () => navigate('search') },
        ]}
        menu={[
          { label: 'settings', onTap: () => navigate('settings') },
          { label: 'about', onTap: () => navigate('about') },
        ]}
      />
    </div>
  )
}

export function NotebookPage({ notebook }: { notebook: string }) {
  const notes = useListedNotes(notebook)
  const newNote = useNewNote()
  return (
    <div className="app-page">
      <div className="onenote-fill">
        <SettingsPage app={notebook.toUpperCase()} title={SECTION.toLowerCase()}>
          <NoteList notes={notes} empty="This section is empty. Tap new to start a page." />
        </SettingsPage>
      </div>
      <AppBar buttons={[{ icon: 'add', label: 'new', onTap: newNote }]} />
    </div>
  )
}

// The line of the page around the first match, with the match marked.
function matchContext(note: Note, query: string): [string, string, string] | null {
  const q = query.toLowerCase()
  for (const line of noteText(note).split('\n')) {
    const at = line.toLowerCase().indexOf(q)
    if (at < 0) continue
    const from = Math.max(0, at - 24)
    return [(from > 0 ? '...' : '') + line.slice(from, at), line.slice(at, at + q.length), line.slice(at + q.length)]
  }
  return null
}

function SearchResult({ note, query, onTap }: { note: Note; query: string; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  const context = matchContext(note, query)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="onenote-item"
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      <span className="onenote-item-title">{noteTitle(note)}</span>
      {context && (
        <span className="onenote-item-snippet">
          {context[0]}
          <mark className="onenote-match">{context[1]}</mark>
          {context[2]}
        </span>
      )}
    </button>
  )
}

export function SearchPage() {
  const { navigate } = useNavigation()
  const notes = useListedNotes()
  const [query, setQuery] = useState('')
  const q = query.trim()
  const results = q ? notes.filter((n) => noteText(n).toLowerCase().includes(q.toLowerCase())) : []
  return (
    <SettingsPage app="OneNote" title="search">
      <input
        className="onenote-textbox"
        type="search"
        value={query}
        autoFocus
        aria-label="Search pages"
        enterKeyHint="search"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      {q && !results.length && <Paragraph subtle>No pages contain "{q}".</Paragraph>}
      <div className="list">
        {results.map((note) => (
          <SearchResult key={note.id} note={note} query={q} onTap={() => navigate(`note:${note.id}`)} />
        ))}
      </div>
    </SettingsPage>
  )
}

export function OneNoteSettingsPage() {
  const settings = useStore(noteSettingsStore)
  return (
    <SettingsPage app="OneNote" title="settings">
      <ToggleSwitch
        header="Page previews"
        checked={settings.previews}
        onChange={(previews) => noteSettingsStore.set((s) => ({ ...s, previews }))}
      />
      <Paragraph subtle>Show the first line of each page under its title in the recent and notebook lists.</Paragraph>
    </SettingsPage>
  )
}

export function AboutPage() {
  return (
    <SettingsPage app="OneNote" title="about">
      <div className="onenote-about">
        <div className="onenote-about-name">OneNote Mobile</div>
        <div className="onenote-about-line">Version 15.0</div>
      </div>
      <Paragraph subtle>Pages are saved on this phone as you type, in this browser's local storage.</Paragraph>
    </SettingsPage>
  )
}
