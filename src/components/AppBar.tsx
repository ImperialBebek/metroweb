import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { EXPO_IN_6, EXPO_OUT_6, prefersReducedMotion } from '../motion'
import { useNavigation } from '../navigation'
import { GLYPHS, type GlyphName } from './glyphs'

export interface AppBarButtonDef {
  // A name from glyphs.tsx, or an SVG fragment on the same 48-unit grid.
  icon: GlyphName | ReactNode
  label: string
  onTap: () => void
  disabled?: boolean
}

export interface AppBarMenuItemDef {
  label: string
  onTap: () => void
  disabled?: boolean
}

const HEIGHT = 72
const MINIMIZED_HEIGHT = 30

// Shell ApplicationBar: up to four icon buttons and an ellipsis. Tapping the
// ellipsis (or the empty bar) slides it up to show button labels and the menu.
// Put it last in a flex-column page (see .app-page); it reserves its own
// collapsed height and grows upward over the content when expanded.
export function AppBar({
  buttons = [],
  menu = [],
  minimized = false,
}: {
  buttons?: AppBarButtonDef[]
  menu?: AppBarMenuItemDef[]
  minimized?: boolean
}) {
  const { registerBackHandler } = useNavigation()
  const [expanded, setExpanded] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const ellipsis = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const collapsedHeight = minimized ? MINIMIZED_HEIGHT : HEIGHT

  // The menu is about to unmount; keep focus in the bar rather than losing it to the page.
  const keepFocus = () => {
    if (bar.current?.querySelector('.appbar-menu')?.contains(document.activeElement)) {
      ellipsis.current?.focus({ preventScroll: true })
    }
  }

  const collapse = useCallback(() => {
    const el = bar.current
    if (!el || closing.current) return
    keepFocus()
    if (prefersReducedMotion()) {
      setExpanded(false)
      return
    }
    closing.current = true
    const anim = el.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${el.offsetHeight - collapsedHeight}px)` }], {
      duration: 200,
      easing: EXPO_IN_6,
      fill: 'forwards',
    })
    anim.finished
      .then(() => {
        flushSync(() => setExpanded(false))
        anim.cancel()
      })
      .catch(() => {})
      .finally(() => {
        closing.current = false
      })
  }, [collapsedHeight])

  useLayoutEffect(() => {
    const el = bar.current
    if (!expanded || !el || prefersReducedMotion()) return
    el.animate([{ transform: `translateY(${el.offsetHeight - collapsedHeight}px)` }, { transform: 'translateY(0)' }], {
      duration: 250,
      easing: EXPO_OUT_6,
    })
  }, [expanded, collapsedHeight])

  useEffect(() => {
    if (!expanded) return
    return registerBackHandler(() => {
      collapse()
      return true
    })
  }, [expanded, collapse, registerBackHandler])

  const toggle = () => (expanded ? collapse() : setExpanded(true))
  const run = (action: () => void) => {
    keepFocus()
    setExpanded(false)
    action()
  }
  const showButtons = buttons.length > 0 && (!minimized || expanded)

  return (
    <div className="appbar-slot" style={{ height: collapsedHeight }}>
      {expanded && <div className="appbar-scrim" onPointerDown={collapse} />}
      <div
        ref={bar}
        className="appbar"
        data-expanded={expanded || undefined}
        style={{ minHeight: collapsedHeight }}
        onClick={(e) => {
          if (e.target === e.currentTarget) toggle()
        }}
      >
        {showButtons && (
          <div
            className="appbar-buttons"
            onClick={(e) => {
              if (e.target === e.currentTarget) toggle()
            }}
          >
            {buttons.map((b) => (
              <button
                key={b.label}
                type="button"
                className="appbar-button"
                disabled={b.disabled}
                aria-label={b.label}
                onClick={() => run(b.onTap)}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
                  <circle className="appbar-ring" cx="24" cy="24" r="21.5" />
                  <g className="appbar-glyph">{typeof b.icon === 'string' ? GLYPHS[b.icon as GlyphName] : b.icon}</g>
                </svg>
                <span className="appbar-label" aria-hidden>
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="appbar-ellipsis"
          ref={ellipsis}
          aria-label={expanded ? 'Fewer options' : 'More options'}
          aria-expanded={expanded}
          onClick={toggle}
        >
          <i />
          <i />
          <i />
        </button>
        {expanded && menu.length > 0 && (
          <div className="appbar-menu" role="menu">
            {menu.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="appbar-menu-item"
                disabled={item.disabled}
                onClick={() => run(item.onTap)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
