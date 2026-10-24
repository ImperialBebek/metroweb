import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react'
import { pages, type DocPage } from 'virtual:design-docs'
import { ACCENTS, themeVariables } from 'metroweb'
import { Demo } from './demos'
import { DesignThemeContext, loadTheme, saveTheme, useDesignTheme, type DesignTheme } from './designTheme'

const HOME = '/design'
const SITE = 'Metro design system'
const byRoute = new Map(pages.map((page) => [page.route, page]))
const normalize = (path: string) => path.replace(/\/+$/, '') || '/'
const inSite = (path: string) => path === HOME || path.startsWith(`${HOME}/`)
const label = (page: DocPage) => (page.route === HOME ? 'overview' : page.title)

interface Place {
  path: string
  hash: string
  // A saved position on Back and Forward; otherwise the hash target or the top.
  scroll: number | null
}

// Scroll positions by history entry: the browser only restores them for
// documents it loaded itself.
const positions = new Map<string, number>()
const newEntry = () => Math.random().toString(36).slice(2)
function currentEntry() {
  const state = history.state as { entry?: string } | null
  if (state?.entry) return state.entry
  const entry = newEntry()
  history.replaceState({ ...state, entry }, '')
  return entry
}
const here = (scroll: number | null = null): Place => ({
  path: normalize(location.pathname),
  hash: location.hash,
  scroll,
})

function useHistory() {
  const [place, setPlace] = useState(() => here())
  useEffect(() => {
    history.scrollRestoration = 'manual'
    currentEntry()
    const onScroll = () => positions.set(currentEntry(), window.scrollY)
    const onPop = () => setPlace(here(positions.get(currentEntry()) ?? null))
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('popstate', onPop)
    }
  }, [])
  const go = useCallback((url: URL) => {
    history.pushState({ entry: newEntry() }, '', url.pathname + url.hash)
    setPlace(here())
  }, [])
  return { place, go }
}

function ThemeControls() {
  const { background, accent, update } = useDesignTheme()
  return (
    <div className="design-theme">
      <fieldset className="design-field">
        <legend>Background</legend>
        <div className="design-backgrounds">
          {(['light', 'dark'] as const).map((value) => (
            <label key={value} className="design-background">
              <input
                type="radio"
                name="design-background"
                checked={background === value}
                onChange={() => update({ background: value })}
              />
              {value === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="design-field">
        <legend>Accent color</legend>
        <div className="design-accents">
          {ACCENTS.map((a, i) => (
            <label key={a.name} className="design-accent" style={{ background: a.color }} title={a.name}>
              <input
                type="radio"
                name="design-accent"
                aria-label={a.name}
                checked={accent === i}
                onChange={() => update({ accent: i })}
              />
            </label>
          ))}
        </div>
        <div className="design-accent-name" aria-hidden>
          {ACCENTS[accent].name}
        </div>
      </fieldset>
    </div>
  )
}

function Article({ page, titleRef }: { page: DocPage; titleRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <article className="doc">
      <h1 className="doc-title" ref={titleRef} tabIndex={-1}>
        {label(page)}
      </h1>
      {page.chunks.map((chunk, i) =>
        'demo' in chunk ? (
          <Demo key={i} name={chunk.demo} />
        ) : (
          <div key={i} className="doc-html" dangerouslySetInnerHTML={{ __html: chunk.html }} />
        ),
      )}
    </article>
  )
}

function Pager({ page }: { page: DocPage }) {
  const index = pages.indexOf(page)
  const previous = pages[index - 1]
  const next = pages[index + 1]
  return (
    <nav className="design-pager" aria-label="Previous and next page">
      {previous && (
        <a href={previous.route} rel="prev">
          <span className="design-pager-label">previous</span>
          <span className="design-pager-title">{label(previous)}</span>
        </a>
      )}
      {next && (
        <a href={next.route} rel="next">
          <span className="design-pager-label">next</span>
          <span className="design-pager-title">{label(next)}</span>
        </a>
      )}
    </nav>
  )
}

export function DesignApp() {
  const { place, go } = useHistory()
  const [theme, setTheme] = useState(loadTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const shown = useRef<string | null>(null)
  const page = byRoute.get(place.path)

  const store = useMemo(
    () => ({
      ...theme,
      update: (patch: Partial<DesignTheme>) => {
        const next = { ...theme, ...patch }
        saveTheme(next)
        setTheme(next)
      },
    }),
    [theme],
  )

  useEffect(() => {
    const background = theme.background === 'dark' ? '#000000' : '#ffffff'
    document.documentElement.style.background = background
    document.documentElement.style.colorScheme = theme.background
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
  }, [theme.background])

  useEffect(() => {
    document.title = !page ? `Page not found · ${SITE}` : page.route === HOME ? SITE : `${page.title} · ${SITE}`
  }, [page])

  useLayoutEffect(() => {
    const target = place.hash ? document.getElementById(decodeURIComponent(place.hash.slice(1))) : null
    if (place.scroll !== null) window.scrollTo(0, place.scroll)
    else if (target) target.scrollIntoView()
    else if (shown.current !== null) window.scrollTo(0, 0)
    // On a new page, focus moves to its title, as it would after a page load.
    if (shown.current !== null && shown.current !== place.path) title.current?.focus({ preventScroll: true })
    shown.current = place.path
  }, [place])

  // Links between the pages stay in this document; in-page links are left to the browser.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const link = (e.target as Element).closest('a')
    if (!link?.href || link.target || link.hasAttribute('download')) return
    const url = new URL(link.href)
    const path = normalize(url.pathname)
    if (url.origin !== location.origin || !inSite(path)) return
    setMenuOpen(false)
    if (path === place.path && url.hash) return
    e.preventDefault()
    if (path === place.path) window.scrollTo(0, 0)
    else go(url)
  }

  return (
    <DesignThemeContext.Provider value={store}>
      <div className="design" style={themeVariables(theme.background, theme.accent) as CSSProperties} onClick={onClick}>
        <a className="design-skip" href="#content">
          Skip to content
        </a>
        <nav className="design-nav" aria-label="Design system" data-open={menuOpen || undefined}>
          <div className="design-nav-head">
            <a className="design-brand" href={HOME}>
              {SITE}
            </a>
            <button
              type="button"
              className="design-menu-button"
              aria-expanded={menuOpen}
              aria-controls="design-nav-body"
              onClick={() => setMenuOpen((open) => !open)}
            >
              sections
            </button>
          </div>
          <div className="design-nav-body" id="design-nav-body">
            <ul className="design-sections">
              {pages.map((p) => (
                <li key={p.route}>
                  <a href={p.route} aria-current={p === page ? 'page' : undefined}>
                    {label(p)}
                  </a>
                  {p === page && p.headings.length > 0 && (
                    <ul className="design-headings">
                      {p.headings.map((h) => (
                        <li key={h.id}>
                          <a href={`#${h.id}`}>{h.text}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="design-nav-foot">
              <ThemeControls />
              <a className="design-phone" href="/">
                open the phone
              </a>
            </div>
          </div>
        </nav>
        <main className="design-main" id="content" tabIndex={-1}>
          {page ? (
            <>
              <Article key={page.route} page={page} titleRef={title} />
              <Pager page={page} />
            </>
          ) : (
            <article className="doc">
              <h1 className="doc-title" ref={title} tabIndex={-1}>
                page not found
              </h1>
              <div className="doc-html">
                <p>
                  There's no page at this address. <a href={HOME}>Go to the overview</a>.
                </p>
              </div>
            </article>
          )}
        </main>
      </div>
    </DesignThemeContext.Provider>
  )
}
