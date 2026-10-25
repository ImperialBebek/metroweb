// Silverlight's ExponentialEase, sampled into a CSS linear() easing so the curve
// matches the Windows Phone Toolkit storyboards exactly.
function sampled(curve: (t: number) => number, steps = 32): string {
  const points: string[] = []
  for (let i = 0; i <= steps; i++) points.push(curve(i / steps).toFixed(4))
  return `linear(${points.join(', ')})`
}

function exponential(exponent: number, mode: 'in' | 'out'): string {
  const easeIn = (t: number) => (Math.exp(exponent * t) - 1) / (Math.exp(exponent) - 1)
  return sampled(mode === 'in' ? easeIn : (t) => 1 - easeIn(1 - t))
}


export const EXPO_OUT_2 = exponential(2, 'out')
export const EXPO_IN_2 = exponential(2, 'in')
export const EXPO_OUT_5 = exponential(5, 'out')
export const EXPO_IN_5 = exponential(5, 'in')
export const EXPO_OUT_6 = exponential(6, 'out')
export const EXPO_IN_6 = exponential(6, 'in')
export const EXPO_OUT_15 = exponential(15, 'out')

// One turnstile spin, hinged on the left: going forward, the right side comes
// in from behind the screen and leaves toward the viewer; going back it
// reverses. CSS rotateY is the opposite sign of the Toolkit's PlaneProjection
// RotationY and UIX's Rotation: positive angles push the right side away from
// the viewer.
export type TurnstileMode = 'forwardIn' | 'forwardOut' | 'backwardIn' | 'backwardOut'

export type TurnstileTiming = Record<TurnstileMode, { from: number; to: number; duration: number; easing: string }>

// Durations are the Toolkit TurnstileTransition's (350ms in, 250ms out).
export const TOOLKIT_TURNSTILE: TurnstileTiming = {
  forwardIn: { from: 75, to: 0, duration: 350, easing: EXPO_OUT_6 },
  forwardOut: { from: 0, to: -80, duration: 250, easing: EXPO_IN_6 },
  backwardIn: { from: -80, to: 0, duration: 350, easing: EXPO_OUT_6 },
  backwardOut: { from: 0, to: 75, duration: 250, easing: EXPO_IN_6 },
}

// Decoded from TurnstileFeather* wrapping Turnstile* in uixmobile's
// ANIMATIONS.UIX: Log/Exp weight 150 (ln 150 ≈ 5.01), TimeScale 0.8 on
// outgoing feathers (167ms × 0.8 = 134ms) and 0.48 on backwardIn
// (350ms × 0.48 = 168ms).
export const NATIVE_TURNSTILE: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 350, easing: EXPO_OUT_5 },
  forwardOut: { from: 0, to: -50, duration: 134, easing: EXPO_IN_5 },
  backwardIn: { from: -50, to: 0, duration: 168, easing: EXPO_OUT_5 },
  backwardOut: { from: 0, to: 80, duration: 134, easing: EXPO_IN_5 },
}

// Decoded from TileNavigate* and ApplicationNavigate* in startmenu's
// STYLES.UIX: forwardOut 0° → -50° over 167ms (Exp weight 100, ln 100 ≈ 4.61),
// backwardIn -80° → 0° over 250ms (Log weight 10, ln 10 ≈ 2.30).
export const START_TURNSTILE: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 350, easing: EXPO_OUT_5 },
  forwardOut: { from: 0, to: -50, duration: 167, easing: EXPO_IN_5 },
  backwardIn: { from: -80, to: 0, duration: 250, easing: EXPO_OUT_2 },
  backwardOut: { from: 0, to: 50, duration: 133, easing: EXPO_IN_5 },
}

// IntroAnimationCameraEye = Vec3(0, 0, -1000) in uixmobile's CONSTANTS.UIX.
export const NATIVE_PERSPECTIVE = 1000

const NATIVE_PAGE_TURNSTILE: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 350, easing: EXPO_OUT_5 },
  forwardOut: { from: 0, to: -50, duration: 167, easing: EXPO_IN_5 },
  backwardIn: { from: -50, to: 0, duration: 350, easing: EXPO_OUT_5 },
  backwardOut: { from: 0, to: 80, duration: 167, easing: EXPO_IN_5 },
}

export function turnstile(element: HTMLElement, mode: TurnstileMode, timing = TOOLKIT_TURNSTILE): Animation {
  const { from, to, duration, easing } = timing[mode]
  const outgoing = mode.endsWith('Out')
  // Perspective comes from the page stack (centred on the screen, like the
  // PlaneProjection camera); the hinge is the page's left edge.
  return element.animate(
    [
      { transform: `rotateY(${from}deg)`, opacity: 1 },
      { transform: `rotateY(${to}deg)`, opacity: 1, offset: 0.999 },
      { transform: `rotateY(${to}deg)`, opacity: outgoing ? 0 : 1 },
    ],
    { duration, easing, fill: 'both' },
  )
}

// Whole-page native turnstile (Turnstile* in ANIMATIONS.UIX): the page turns
// around CenterPointPercent = (-0.1, 0, 0) through the stack's 1000px camera.
export function nativePageTurn(page: HTMLElement, stack: HTMLElement, mode: TurnstileMode): Animation[] {
  const { from, to, duration, easing } = NATIVE_PAGE_TURNSTILE[mode]
  const outgoing = mode.endsWith('Out')
  const origin = '-10% 50%'
  return [
    stack.animate([{ perspective: `${NATIVE_PERSPECTIVE}px` }, { perspective: `${NATIVE_PERSPECTIVE}px` }], {
      duration,
      fill: 'both',
    }),
    page.animate(
      [
        { transform: `rotateY(${from}deg)`, transformOrigin: origin, opacity: 1 },
        { transform: `rotateY(${to}deg)`, transformOrigin: origin, opacity: 1, offset: 0.999 },
        { transform: `rotateY(${to}deg)`, transformOrigin: origin, opacity: outgoing ? 0 : 1 },
      ],
      { duration, easing, fill: 'both' },
    ),
  ]
}

// Toolkit SwivelTransition (FullScreenIn / FullScreenOut), used by full-mode pickers.
export function swivel(element: HTMLElement, direction: 'in' | 'out'): Animation {
  const frames =
    direction === 'in'
      ? [
          { transform: 'perspective(1000px) rotateX(-45deg)', opacity: 0 },
          { transform: 'perspective(1000px) rotateX(-45deg)', opacity: 1, offset: 0.01 },
          { transform: 'perspective(1000px) rotateX(0deg)', opacity: 1 },
        ]
      : [
          { transform: 'perspective(1000px) rotateX(0deg)', opacity: 1 },
          { transform: 'perspective(1000px) rotateX(45deg)', opacity: 1, offset: 0.99 },
          { transform: 'perspective(1000px) rotateX(45deg)', opacity: 0 },
        ]
  return element.animate(frames, {
    duration: direction === 'in' ? 350 : 250,
    easing: direction === 'in' ? EXPO_OUT_6 : EXPO_IN_6,
    fill: 'both',
  })
}

// The dimmed screen behind a message box: in 200 ms, out 250 ms (Estimated).
export function scrimFade(element: HTMLElement, direction: 'in' | 'out'): Animation {
  return direction === 'in'
    ? element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
    : element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' })
}

// TurnstileFeather: each element swings on a shared vertical hinge left of the
// screen (CenterPointPercent = -0.1 = -48px in ANIMATIONS.UIX;
// TileCenterPointPercent = -0.3 = -144px on Start in STYLES.UIX), seen through
// one camera at the screen's centre (240, 400, 1000), so rows above the centre
// slope down toward the right when behind the screen and up toward the right
// when in front of it, as on the phone. `x` and `y` are the element's top-left
// corner and `screen` the screen's size, all in 480-wide screen px.
export interface FeatherPlacement {
  x: number
  y: number
  screen: { width: number; height: number }
  hingeX?: number
}

export function turnstileFeather(
  element: HTMLElement,
  mode: TurnstileMode,
  { x, y, screen, hingeX = -screen.width * 0.1 }: FeatherPlacement,
  delay: number,
  timing = NATIVE_TURNSTILE,
): Animation {
  const { from, to, duration, easing } = timing[mode]
  const outgoing = mode.endsWith('Out')
  const cameraX = screen.width / 2
  const pivotX = cameraX - hingeX
  const transformOrigin = `${cameraX - x}px ${screen.height / 2 - y}px`
  const at = (angle: number) =>
    `perspective(${NATIVE_PERSPECTIVE}px) translateX(${-pivotX}px) rotateY(${angle}deg) translateX(${pivotX}px)`
  const frames = outgoing
    ? [
        { transform: at(from), transformOrigin, opacity: 1 },
        { transform: at(to), transformOrigin, opacity: 1, offset: 0.999 },
        { transform: at(to), transformOrigin, opacity: 0 },
      ]
    : [
        { transform: at(from), transformOrigin, opacity: 0 },
        { transform: at(from), transformOrigin, opacity: 1, offset: 0.001 },
        { transform: at(to), transformOrigin, opacity: 1 },
      ]
  return element.animate(
    frames,
    // Outgoing elements hold their rest pose (and any tilt) until their turn;
    // incoming ones must stay hidden at the start pose while they wait.
    { duration, easing, delay, fill: outgoing ? 'forwards' : 'both' },
  )
}
// Native (UIX) page motion. The phone's UI framework names these
// (TurnstileFeather*, Continuum*, PanoIntroAnimation and their offsets), but
// the values are compiled into UIX bytecode that hasn't been decoded, so the
// numbers below are fitted to footage or matched by eye.

// TurnstileFeatherPixelDelay / TurnstileFeatherMaximumDelay: elements lower on
// the screen leave later (~41ms per 114px list row in 240fps WP8.1 footage).
export const FEATHER_PIXEL_DELAY = 0.36 // ms per px
export const FEATHER_MAX_DELAY = 220

// Messaging's conversation going back: instead of turning, its content drops
// and fades (fitted to 240fps WP8.1 footage: ~185px over 150ms, gone in the
// last 40ms).
export function dropOut(element: HTMLElement): Animation[] {
  return [
    element.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(185px)' }], {
      duration: 150,
      easing: EXPO_IN_2,
      fill: 'forwards',
    }),
    element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 40, delay: 110, fill: 'both' }),
  ]
}

// Vertical sheet transition used by the Phone dialer keypad (400ms up, 270ms down).
export function slideSheet(element: HTMLElement, direction: 'in' | 'out'): Animation {
  const frames =
    direction === 'in'
      ? [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }]
      : [{ transform: 'translateY(0%)' }, { transform: 'translateY(100%)' }]
  return element.animate(frames, {
    duration: direction === 'in' ? 400 : 270,
    easing: EXPO_OUT_6,
    fill: 'both',
  })
}

export type ContinuumPhase = 'forwardHide' | 'forwardShow' | 'backwardHide' | 'backwardShow'

// Continuum*XOffset / Continuum*YOffset: the tapped item's label drops away
// down and to the right, and the next page's title rises into place.
const CONTINUUM: Record<ContinuumPhase, { x: number; y: number; duration: number }> = {
  forwardHide: { x: 90, y: 70, duration: 200 },
  forwardShow: { x: 0, y: 80, duration: 350 },
  backwardHide: { x: 0, y: 80, duration: 200 },
  backwardShow: { x: 90, y: 70, duration: 350 },
}

export function continuum(element: HTMLElement, phase: ContinuumPhase, delay = 0): Animation {
  const { x, y, duration } = CONTINUUM[phase]
  const away = { translate: `${x}px ${y}px`, opacity: 0 }
  const home = { translate: '0px 0px', opacity: 1 }
  const hiding = phase.endsWith('Hide')
  return element.animate(hiding ? [home, away] : [away, home], {
    duration,
    delay,
    easing: hiding ? EXPO_IN_6 : EXPO_OUT_6,
    fill: hiding ? 'forwards' : 'both',
  })
}

// PanoIntroAnimation, fitted to WP8 (Games) and WP8.1 (Office) footage of a hub
// opening: the whole page swings in from edge-on around a hinge left of the
// screen, with a weaker perspective than page turnstiles, while its layers
// slide in from far right (Panorama*IntroSlideInXOffset), starting with the
// swing and settling well after it.
const HUB_PERSPECTIVE = 1670
const HUB_HINGE_X = -230
const HUB_SWING = { from: 90, delay: 35, duration: 460 }
export const PANORAMA_INTRO_DURATION = 950

export function hubSwing(page: HTMLElement, stack: HTMLElement): Animation[] {
  const origin = `${HUB_HINGE_X}px 50%`
  const total = HUB_SWING.delay + HUB_SWING.duration
  return [
    stack.animate([{ perspective: `${HUB_PERSPECTIVE}px` }, { perspective: `${HUB_PERSPECTIVE}px` }], {
      duration: total,
      fill: 'both',
    }),
    page.animate(
      [
        { transform: `rotateY(${HUB_SWING.from}deg)`, transformOrigin: origin },
        { transform: 'rotateY(0deg)', transformOrigin: origin },
      ],
      { duration: HUB_SWING.duration, delay: HUB_SWING.delay, easing: EXPO_OUT_2, fill: 'both' },
    ),
  ]
}

// Animates `translate` so it composes with the panorama's own parallax transforms.
export function panoramaIntro(element: HTMLElement, offset: number): Animation {
  return element.animate([{ translate: `${offset}px 0px` }, { translate: '0px 0px' }], {
    duration: PANORAMA_INTRO_DURATION,
    delay: HUB_SWING.delay,
    easing: EXPO_OUT_5,
    fill: 'both',
  })
}
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
