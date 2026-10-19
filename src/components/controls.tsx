import type { ReactNode } from 'react'
import { useTilt } from './useTilt'

// UIX DoubleLineListItem / SingleLineListItem as used by SettingsUI.exe.
export function ListItem({ title, subtitle, onTap }: { title: string; subtitle?: string; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="list-item"
      data-feather
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      <span className="list-item-title">{title}</span>
      {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
    </button>
  )
}

export function Button({ children, onTap }: { children: ReactNode; onTap?: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="wp-button"
      onClick={(e) => {
        if (e.detail === 0) onTap?.()
      }}
    >
      <span className="wp-button-face">{children}</span>
    </button>
  )
}

export function Paragraph({ children, subtle = false }: { children: ReactNode; subtle?: boolean }) {
  return (
    <p className={subtle ? 'paragraph paragraph-subtle' : 'paragraph'} data-feather>
      {children}
    </p>
  )
}

// Settings sub-pages are UIX SinglePivotPages: the same title and header
// layout as the main pivot, with one item.
export function SettingsPage({ app = 'SETTINGS', title, children }: { app?: string; title: string; children: ReactNode }) {
  return (
    <div className="pivot">
      <div className="pivot-title" data-feather>
        {app}
      </div>
      <div className="pivot-headers" data-feather>
        <div className="pivot-header-strip">
          <h1 className="pivot-header" data-selected data-continuum-target>
            {title}
          </h1>
        </div>
      </div>
      <div className="pivot-viewport">
        <div className="pivot-item" data-visible>
          <div className="page-content">{children}</div>
        </div>
      </div>
    </div>
  )
}
