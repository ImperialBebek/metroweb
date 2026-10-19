import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { AppBar } from '../../components/AppBar'
import {
  deleteNote,
  isNoteEmpty,
  newBlock,
  notesStore,
  updateNote,
  type BlockKind,
  type NoteBlock,
} from '../../data/notes'
import { useStore } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { longDate } from './format'
import { PhIcon } from '../../icons/PhIcon'
import { BULLETS_GLYPH, TODO_GLYPH } from './glyphs'
import { MessageBox } from './MessageBox'

type Field = HTMLInputElement | HTMLTextAreaElement

interface FocusTarget {
  // A block id, or null for the title.
  id: string | null
  caret: number
}

// How many note pages currently show each note. StrictMode mounts pages twice,
// so a page only discards its empty note once nothing shows it any more.
const openPages = new Map<string, number>()

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function BlockRow({
  block,
  placeholder,
  onText,
  onKeyDown,
  onFocus,
  onCheck,
}: {
  block: NoteBlock
  placeholder?: string
  onText: (text: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus: () => void
  onCheck: () => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => autosize(field.current), [block.text, block.kind])
  return (
    <div className="onenote-block" data-kind={block.kind} data-checked={block.checked || undefined}>
      {block.kind === 'todo' && (
        <button
          type="button"
          role="checkbox"
          className="onenote-check"
          aria-checked={!!block.checked}
          aria-label={block.text || 'to-do'}
          onClick={onCheck}
        >
          <PhIcon name="check-bold" size={20} />
        </button>
      )}
      {block.kind === 'bullet' && <span className="onenote-bullet" aria-hidden />}
      <textarea
        ref={field}
        rows={1}
        className="onenote-block-text"
        data-block={block.id}
        value={block.text}
        placeholder={placeholder}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />
    </div>
  )
}

export function NotePage({ id, isNew = false }: { id: string; isNew?: boolean }) {
  const { back } = useNavigation()
  const notes = useStore(notesStore)
  const found = notes.find((n) => n.id === id)
  // Keeps the page drawn while it turns away after the note is deleted.
  const [lastSeen, setLastSeen] = useState(found)
  if (found && found !== lastSeen) setLastSeen(found)
  const note = found ?? lastSeen
  const page = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const focusField = (target: FocusTarget) => {
    const selector = target.id === null ? '.onenote-title' : `[data-block="${target.id}"]`
    const el = page.current?.querySelector<Field>(selector)
    if (!el) return
    el.focus()
    const caret = Math.min(target.caret, el.value.length)
    el.setSelectionRange(caret, caret)
  }

  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    focusField(target)
  })

  useEffect(() => {
    if (isNew) page.current?.querySelector<Field>('.onenote-title')?.focus()
  }, [isNew])

  useEffect(() => {
    openPages.set(id, (openPages.get(id) ?? 0) + 1)
    return () => {
      openPages.set(id, (openPages.get(id) ?? 1) - 1)
      window.setTimeout(() => {
        if (openPages.get(id)) return
        openPages.delete(id)
        const current = notesStore.get().find((n) => n.id === id)
        if (current && isNoteEmpty(current)) deleteNote(id)
      })
    }
  }, [id])

  if (!note) return null
  const blocks = note.blocks

  const setBlocks = (change: (blocks: NoteBlock[]) => NoteBlock[]) => updateNote(id, (n) => ({ blocks: change(n.blocks) }))
  const patchBlock = (blockId: string, patch: Partial<NoteBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, ...patch } : b)))
  const kindPatch = (kind: BlockKind): Partial<NoteBlock> => ({ kind, checked: kind === 'todo' ? false : undefined })
  const caretOf = (blockId: string) =>
    page.current?.querySelector<HTMLTextAreaElement>(`[data-block="${blockId}"]`)?.selectionStart ?? 0

  // The to-do and list buttons switch the block being edited; with no block
  // in focus they start a new one at the end of the page.
  const toggleKind = (kind: BlockKind) => {
    const current = blocks.find((b) => b.id === active)
    if (current) {
      pendingFocus.current = { id: current.id, caret: caretOf(current.id) }
      patchBlock(current.id, kindPatch(current.kind === kind ? 'text' : kind))
      return
    }
    const last = blocks[blocks.length - 1]
    if (last && !last.text && last.kind === 'text') {
      pendingFocus.current = { id: last.id, caret: 0 }
      patchBlock(last.id, kindPatch(kind))
      return
    }
    const created = newBlock(kind)
    pendingFocus.current = { id: created.id, caret: 0 }
    setBlocks((bs) => [...bs, created])
  }

  const focusFirstBlock = () => {
    if (blocks.length) {
      focusField({ id: blocks[0].id, caret: 0 })
      return
    }
    const created = newBlock()
    pendingFocus.current = { id: created.id, caret: 0 }
    setBlocks(() => [created])
  }

  const onTitleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusFirstBlock()
    }
  }

  const onBlockKey = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.nativeEvent.isComposing) return
    const block = blocks[index]
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    const collapsed = start === end
    const prev = blocks[index - 1]
    const next = blocks[index + 1]

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Enter on an empty list item ends the list, as in the desktop app.
      if (block.kind !== 'text' && !block.text) {
        patchBlock(block.id, kindPatch('text'))
        return
      }
      const created = newBlock(block.kind, block.text.slice(end))
      pendingFocus.current = { id: created.id, caret: 0 }
      setBlocks((bs) => bs.flatMap((b) => (b.id === block.id ? [{ ...b, text: b.text.slice(0, start) }, created] : [b])))
      return
    }

    if (e.key === 'Backspace' && collapsed && start === 0) {
      if (block.kind !== 'text') {
        e.preventDefault()
        patchBlock(block.id, kindPatch('text'))
      } else if (prev) {
        e.preventDefault()
        pendingFocus.current = { id: prev.id, caret: prev.text.length }
        setBlocks((bs) =>
          bs.filter((b) => b.id !== block.id).map((b) => (b.id === prev.id ? { ...b, text: b.text + block.text } : b)),
        )
      } else if (!block.text) {
        e.preventDefault()
        if (next) {
          pendingFocus.current = { id: next.id, caret: 0 }
          setBlocks((bs) => bs.filter((b) => b.id !== block.id))
        } else {
          focusField({ id: null, caret: note.title.length })
        }
      }
      return
    }

    if (e.key === 'Delete' && collapsed && start === block.text.length && next) {
      e.preventDefault()
      pendingFocus.current = { id: block.id, caret: start }
      setBlocks((bs) =>
        bs.filter((b) => b.id !== next.id).map((b) => (b.id === block.id ? { ...b, text: b.text + next.text } : b)),
      )
      return
    }

    if (e.key === 'ArrowUp' && collapsed && start === 0) {
      e.preventDefault()
      focusField(prev ? { id: prev.id, caret: prev.text.length } : { id: null, caret: note.title.length })
      return
    }

    if (e.key === 'ArrowDown' && collapsed && end === block.text.length && next) {
      e.preventDefault()
      focusField({ id: next.id, caret: 0 })
    }
  }

  // Tapping the empty space below the last block continues the page there.
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const last = blocks[blocks.length - 1]
    if (!last) {
      focusFirstBlock()
    } else if (last.text && last.kind === 'text') {
      const created = newBlock()
      pendingFocus.current = { id: created.id, caret: 0 }
      setBlocks((bs) => [...bs, created])
    } else {
      focusField({ id: last.id, caret: last.text.length })
    }
  }

  const activeKind = blocks.find((b) => b.id === active)?.kind

  return (
    <div className="app-page onenote-note" ref={page}>
      <div className="onenote-note-scroll" onClick={onCanvasClick}>
        <input
          className="onenote-title"
          value={note.title}
          placeholder="Title"
          aria-label="Page title"
          enterKeyHint="next"
          onChange={(e) => updateNote(id, () => ({ title: e.target.value }))}
          onKeyDown={onTitleKey}
          onFocus={() => setActive(null)}
        />
        <div className="onenote-note-date">{longDate(note.created)}</div>
        <div className="onenote-blocks" onClick={onCanvasClick}>
          {blocks.map((block, index) => (
            <BlockRow
              key={block.id}
              block={block}
              placeholder={blocks.length === 1 && !note.title ? 'Take a note' : undefined}
              onText={(text) => patchBlock(block.id, { text })}
              onKeyDown={(e) => onBlockKey(e, index)}
              onFocus={() => setActive(block.id)}
              onCheck={() => patchBlock(block.id, { checked: !block.checked })}
            />
          ))}
        </div>
      </div>
      <AppBar
        buttons={[
          { icon: TODO_GLYPH, label: activeKind === 'todo' ? 'no to-do' : 'to-do', onTap: () => toggleKind('todo') },
          { icon: BULLETS_GLYPH, label: activeKind === 'bullet' ? 'no list' : 'list', onTap: () => toggleKind('bullet') },
          { icon: 'delete', label: 'delete', onTap: () => setConfirming(true) },
        ]}
      />
      {confirming && (
        <MessageBox
          title="Delete page?"
          message={`"${note.title.trim() || 'Untitled page'}" will be deleted from ${note.notebook}.`}
          buttons={['delete', 'cancel']}
          onClose={(result) => {
            setConfirming(false)
            if (result !== 'delete') return
            deleteNote(id)
            back()
          }}
        />
      )}
    </div>
  )
}
