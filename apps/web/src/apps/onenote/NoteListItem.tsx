import { useTilt } from 'metroweb'
import { noteSnippet, noteTitle, type Note } from '../../data/notes'
import { listDate } from './format'

export function NoteListItem({ note, preview, onTap }: { note: Note; preview: boolean; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  const snippet = note.title.trim() ? noteSnippet(note) : ''
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="onenote-item"
      data-feather
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      <span className="onenote-item-title">{noteTitle(note)}</span>
      {preview && snippet && <span className="onenote-item-snippet">{snippet}</span>}
      <span className="onenote-item-date">{listDate(note.updated)}</span>
    </button>
  )
}
