import {
  continuum,
  dropOut,
  FEATHER_MAX_DELAY,
  FEATHER_PIXEL_DELAY,
  hubSwing,
  nativePageTurn,
  panoramaIntro,
  slideSheet,
  turnstileFeather,
  type TurnstileMode,
} from './motion.ts'

const SCREEN_WIDTH = 480
const SOURCE_EXTRA_DELAY = 140
const FADE_MS = 140
let hubIntroCount = 0

export interface FeatherOptions {
  // The tapped [data-feather] element: it leaves last.
  source?: HTMLElement | null
  // A [data-continuum] label. Going forward it drops out of `source`; coming
  // back it flies back into place.
  label?: HTMLElement | null
  // Whether the page's [data-continuum-target] (its title) takes part.
  continuumTarget?: boolean
}

interface Target {
  el: HTMLElement
  x: number
  y: number
  delay: number
}

// The outermost visible [data-feather] elements on screen, each with its
// top-left corner in screen px and its feather delay.
function featherTargets(page: HTMLElement, frame: DOMRect, height: number): Target[] {
  const scale = frame.width / SCREEN_WIDTH || 1
  const targets: Target[] = []
  page.querySelectorAll<HTMLElement>('[data-feather]').forEach((el) => {
    if (el.parentElement?.closest('[data-feather]')) return
    if (!el.checkVisibility({ visibilityProperty: true })) return
    const r = el.getBoundingClientRect()
    const x = (r.left - frame.left) / scale
    const y = (r.top - frame.top) / scale
    const w = r.width / scale
    const h = r.height / scale
    if (!w || !h || y + h <= 0 || y >= height || x + w <= 0 || x >= SCREEN_WIDTH) return
    targets.push({ el, x, y, delay: Math.min(Math.max(y, 0) * FEATHER_PIXEL_DELAY, FEATHER_MAX_DELAY) })
  })
  return targets
}

// Fades everything in `source` except the branch holding `label`.
function fadeAround(label: HTMLElement, source: HTMLElement, delay: number): Animation[] {
  const animations: Animation[] = []
  for (let node: HTMLElement | null = label; node && node !== source; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling !== node && sibling instanceof HTMLElement) {
        animations.push(sibling.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, delay, fill: 'forwards' }))
      }
    }
  }
  return animations
}

// The page transitions native apps use. An arriving page turns in as one
// plane, every row at once; a leaving page's [data-feather] elements turn out
// one after another from the top (TurnstileFeather*). A tapped
// [data-continuum] label carries over to the next page's title (Continuum*),
// a page with [data-intro] layers opens with the 3D hub swing and layer slide,
// and a [data-drop-out] page drops its content away when going back.
export function featherPage(
  page: HTMLElement,
  frame: HTMLElement,
  mode: TurnstileMode,
  { source, label, continuumTarget }: FeatherOptions = {},
): Animation[] {
  page.getAnimations({ subtree: true }).forEach((a) => a.cancel())
  const outgoing = mode.endsWith('Out')

  const sheet = page.querySelector<HTMLElement>('[data-sheet]')
  if (sheet && (mode === 'forwardIn' || mode === 'backwardOut')) {
    return [slideSheet(sheet, mode === 'forwardIn' ? 'in' : 'out')]
  }

  const intro = mode === 'forwardIn' ? page.querySelectorAll<HTMLElement>('[data-intro]') : []
  if (intro.length) {
    // Layers slide in rigidly (rows don't feather), and nothing is clipped to
    // the page while it swings: on the phone the layers, the background's left
    // edge and the wrapped-around last section all show on the tilted plane.
    const token = String(++hubIntroCount)
    page.dataset.hubIntro = token
    const animations = [...hubSwing(page, frame), ...[...intro].map((el) => panoramaIntro(el, Number(el.dataset.intro)))]
    Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
      if (page.dataset.hubIntro === token) delete page.dataset.hubIntro
    })
    return animations
  }

  const title = continuumTarget ? page.querySelector<HTMLElement>('[data-continuum-target]') : null

  if (!outgoing) {
    const animations = nativePageTurn(page, frame, mode)
    if (title) animations.push(continuum(title, 'forwardShow'))
    if (label?.isConnected) animations.push(continuum(label, 'backwardShow'))
    return animations
  }

  const drop = mode === 'backwardOut' ? page.querySelector<HTMLElement>('[data-drop-out]') : null
  if (drop) {
    const animations = title ? [continuum(title, 'backwardHide')] : []
    for (const child of drop.children) {
      if (child instanceof HTMLElement && !(title && child.contains(title))) animations.push(...dropOut(child))
    }
    return animations
  }

  const rect = frame.getBoundingClientRect()
  const screen = { width: SCREEN_WIDTH, height: rect.height / (rect.width / SCREEN_WIDTH || 1) }
  let targets = featherTargets(page, rect, screen.height)
  if (!targets.length) return nativePageTurn(page, frame, mode)

  const animations: Animation[] = []
  if (title) {
    targets = targets.filter((t) => !t.el.contains(title) && !title.contains(t.el))
    animations.push(continuum(title, 'backwardHide'))
  }

  if (source) {
    const last = Math.max(0, ...targets.filter((t) => t.el !== source).map((t) => t.delay)) + SOURCE_EXTRA_DELAY
    if (label && source.contains(label)) {
      targets = targets.filter((t) => t.el !== source)
      animations.push(...fadeAround(label, source, last), continuum(label, 'forwardHide', last))
    } else {
      for (const t of targets) if (t.el === source) t.delay = last
    }
  }

  animations.push(...targets.map((t) => turnstileFeather(t.el, mode, { x: t.x, y: t.y, screen }, t.delay)))
  return animations
}
