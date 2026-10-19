import { useEffect } from 'react'
import { isNoteEmpty, notesStore } from '../../data/notes'
import { PageStack } from '../../navigation'
import type { AppProps } from '../types'
import { NotePage } from './NotePage'
import { AboutPage, HomePage, NotebookPage, OneNoteSettingsPage, SearchPage } from './pages'
import './onenote.css'

export function OneNoteApp({ onExit, handle }: AppProps) {
  // No page is open at launch, so any empty note is a leftover new page.
  useEffect(() => {
    if (notesStore.get().some(isNoteEmpty)) notesStore.set((notes) => notes.filter((n) => !isNoteEmpty(n)))
  }, [])

  const render = (route: string) => {
    const [kind, arg, flag] = route.split(':')
    switch (kind) {
      case 'note':
        return <NotePage id={arg} isNew={flag === 'new'} />
      case 'notebook':
        return <NotebookPage notebook={arg} />
      case 'search':
        return <SearchPage />
      case 'settings':
        return <OneNoteSettingsPage />
      case 'about':
        return <AboutPage />
      default:
        return <HomePage />
    }
  }
  return <PageStack enter initialRoute="home" render={render} onExit={onExit} handle={handle} />
}
