import { getNativeMotionVersion } from './nativeMotionVersion.ts'

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

// UIX's CenterPointPercent: `x` is a fraction of the screen's width from its
// left edge, `z` is px behind the screen (UIX's sign; CSS's is the opposite).
export interface TurnstileHinge {
  x: number
  z: number
}

export type TurnstileTiming = Record<
  TurnstileMode,
  { from: number; to: number; duration: number; easing: string; hinge?: TurnstileHinge }
>

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

// 8.1's ANIMATIONS.UIX keeps the angles and weights but shortens Turnstile* to
// 300ms in and 128ms out, adds TimeScale 0.6 on TurnstileFeatherForwardIn
// (180ms; 0.8 and 0.48 stay: 102ms out, 144ms back in), and hinges at
// CenterPointPercent (+0.1, 0, 100) on ForwardOut and BackwardIn and
// (-0.1, 0, 100) on ForwardIn and BackwardOut. WinRT's turnstile hinges 100px
// behind the plane, so z is read as px.
const HINGE_81_LEFT: TurnstileHinge = { x: -0.1, z: 100 }
const HINGE_81_RIGHT: TurnstileHinge = { x: 0.1, z: 100 }

export const NATIVE_TURNSTILE_81: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 180, easing: EXPO_OUT_5, hinge: HINGE_81_LEFT },
  forwardOut: { from: 0, to: -50, duration: 102, easing: EXPO_IN_5, hinge: HINGE_81_RIGHT },
  backwardIn: { from: -50, to: 0, duration: 144, easing: EXPO_OUT_5, hinge: HINGE_81_RIGHT },
  backwardOut: { from: 0, to: 80, duration: 102, easing: EXPO_IN_5, hinge: HINGE_81_LEFT },
}

const NATIVE_PAGE_TURNSTILE_81: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 300, easing: EXPO_OUT_5, hinge: HINGE_81_LEFT },
  forwardOut: { from: 0, to: -50, duration: 128, easing: EXPO_IN_5, hinge: HINGE_81_RIGHT },
  backwardIn: { from: -50, to: 0, duration: 300, easing: EXPO_OUT_5, hinge: HINGE_81_RIGHT },
  backwardOut: { from: 0, to: 80, duration: 128, easing: EXPO_IN_5, hinge: HINGE_81_LEFT },
}

const is81 = () => getNativeMotionVersion() === '8.1'

// Decoded from TileNavigate* and ApplicationNavigate* in startmenu's
// STYLES.UIX: forwardOut 0° → -50° over 167ms (Exp weight 100, ln 100 ≈ 4.61),
// backwardIn -80° → 0° over 250ms (Log weight 10, ln 10 ≈ 2.30).
export const START_TURNSTILE: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 350, easing: EXPO_OUT_5 },
  forwardOut: { from: 0, to: -50, duration: 167, easing: EXPO_IN_5 },
  backwardIn: { from: -80, to: 0, duration: 250, easing: EXPO_OUT_2 },
  backwardOut: { from: 0, to: 50, duration: 133, easing: EXPO_IN_5 },
}

// 8.1's STYLES.UIX: every turn is Log/Exp weight 150 and carries its own
// CenterPointPercent, which overrides TileCenterPointPercent the way
// EnterRearrangeClick's (0.5, 0.5, 0) scales a tile about its own centre.
// NavigateAwayForward 0° → 50° over 128ms at (-0.1, 0, 50); NavigateToBackTile
// 50° → 0° over 300ms at (0.1, 0, 100); NavigateToForward -80° → 0° over
// 300ms at (-0.1, 0, 100); NavigateAwayBack 0° → -80° over 128ms at (0.1, 0, 100).
export const START_TURNSTILE_81: TurnstileTiming = {
  forwardIn: { from: 80, to: 0, duration: 300, easing: EXPO_OUT_5, hinge: { x: -0.1, z: 100 } },
  forwardOut: { from: 0, to: -50, duration: 128, easing: EXPO_IN_5, hinge: { x: -0.1, z: 50 } },
  backwardIn: { from: -50, to: 0, duration: 300, easing: EXPO_OUT_5, hinge: HINGE_81_RIGHT },
  backwardOut: { from: 0, to: 80, duration: 128, easing: EXPO_IN_5, hinge: HINGE_81_RIGHT },
}

export const startTurnstile = () => (is81() ? START_TURNSTILE_81 : START_TURNSTILE)

// IntroAnimationCameraEye = Vec3(0, 0, -1000) in StartAssets480x800's CONSTANTS.UIX, the camera Start
// attaches while its tiles turn back in. App page turns set no camera in the markup, so for
// them this is an estimate; 8.1 footage fits 1250-1290 px.
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
  const { from, to, duration, easing, hinge } = (is81() ? NATIVE_PAGE_TURNSTILE_81 : NATIVE_PAGE_TURNSTILE)[mode]
  const outgoing = mode.endsWith('Out')
  const origin = `${(hinge?.x ?? -0.1) * 100}% 50% ${-(hinge?.z ?? 0)}px`
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
// `hingeX` (px from the screen's left edge) and `hingeZ` (px behind it)
// override the timing's hinge.
export interface FeatherPlacement {
  x: number
  y: number
  screen: { width: number; height: number }
  hingeX?: number
  hingeZ?: number
}

export function turnstileFeather(
  element: HTMLElement,
  mode: TurnstileMode,
  { x, y, screen, hingeX, hingeZ }: FeatherPlacement,
  delay: number,
  timing = is81() ? NATIVE_TURNSTILE_81 : NATIVE_TURNSTILE,
): Animation {
  const { from, to, duration, easing, hinge } = timing[mode]
  const outgoing = mode.endsWith('Out')
  const cameraX = screen.width / 2
  const pivotX = cameraX - (hingeX ?? screen.width * (hinge?.x ?? -0.1))
  const depth = hingeZ ?? hinge?.z ?? 0
  const transformOrigin = `${cameraX - x}px ${screen.height / 2 - y}px`
  const at = (angle: number) =>
    `perspective(${NATIVE_PERSPECTIVE}px) translate3d(${-pivotX}px, 0, ${-depth}px) rotateY(${angle}deg) translate3d(${pivotX}px, 0, ${depth}px)`
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

// The markup's values: TurnstileFeatherPixelDelay = TurnstileFeatherMaximumDelay
// (0.3s) / ResolutionHeight (800), and no feather clamps to the maximum.
export const featherDelay = (y: number) =>
  is81() ? (Math.max(y, 0) * 300) / 800 : Math.min(Math.max(y, 0) * FEATHER_PIXEL_DELAY, FEATHER_MAX_DELAY)

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

type Curve = (t: number) => number
// Iris interpolations with weight w (see tileFlip.ts): Exp eases in, Log out,
// SCurve is Exp then Log at double speed.
const uixExp =
  (w: number): Curve =>
  (t) =>
    (w ** t - 1) / (w - 1)
const uixLog =
  (w: number): Curve =>
  (t) =>
    1 - uixExp(w)(1 - t)
const uixSCurve =
  (w: number): Curve =>
  (t) =>
    t < 0.5 ? uixExp(w)(2 * t) / 2 : 1 - uixExp(w)(2 - 2 * t) / 2
const linearCurve: Curve = (t) => t

// [time (ms), value, curve of the segment arriving at this key]
type Track = [number, number, Curve?][]

function sampleTrack(track: Track, ms: number): number {
  if (ms <= track[0][0]) return track[0][1]
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, curve = linearCurve] = track[i]
    const [t0, v0] = track[i - 1]
    if (ms <= t1) return v0 + (v1 - v0) * curve((ms - t0) / (t1 - t0))
  }
  return track[track.length - 1][1]
}

// 8.1's ContinuumActive* in ANIMATIONS.UIX, offsets from UIXMobileAssets480x800.
// Rotations are about X, in CSS's sign (the markup's is the opposite, as for
// rotateY), so the leaving label tips toward the viewer as it grows. The scale
// on forwardShow is kind 7 (EaseIn 10, 0.5), whose formula isn't decoded; WinRT's
// ContinuumNavigationTransitionInfo uses PowerEase 2 EaseOut there.
interface Continuum81 {
  duration: number
  origin: string
  y: Track
  rotate: Track
  scale: Track
  opacity: Track
}

const CONTINUUM_81: Record<ContinuumPhase, Continuum81> = {
  forwardHide: {
    duration: 120,
    origin: '0% 100%',
    y: [[0, 0], [120, 200, uixExp(150)]],
    rotate: [[0, 0], [120, -80, uixExp(60)]],
    scale: [[0, 1], [120, 1.5, uixExp(150)]],
    opacity: [[0, 1], [100, 1], [120, 0]],
  },
  forwardShow: {
    duration: 350,
    origin: '0% 100%',
    y: [[0, 200], [100, -40, uixLog(60)], [350, 0, uixSCurve(7.5)]],
    rotate: [[0, 50], [350, 0, uixLog(10)]],
    scale: [[0, 1.5], [350, 1, (t) => 1 - (1 - t) ** 2]],
    opacity: [[0, 0], [167, 1, uixLog(10)]],
  },
  backwardHide: {
    duration: 300,
    origin: '50% 50%',
    y: [[0, 0]],
    rotate: [[0, 0]],
    scale: [[0, 1], [300, 0.85, uixExp(10)]],
    opacity: [[0, 1], [300, 0, uixLog(50)]],
  },
  backwardShow: {
    duration: 200,
    origin: '50% 50%',
    y: [[0, -20], [200, 0, uixLog(10)]],
    rotate: [[0, 90], [200, 0, uixLog(10)]],
    scale: [[0, 1]],
    opacity: [[0, 1]],
  },
}

// Sampled every 8ms, since each property has its own curve. `rotate` has no
// perspective of its own, so the turn about X reads as a vertical squash.
function continuum81(element: HTMLElement, phase: ContinuumPhase, delay: number): Animation {
  const { duration, origin, y, rotate, scale, opacity } = CONTINUUM_81[phase]
  const frames: Keyframe[] = []
  const steps = Math.ceil(duration / 8)
  for (let i = 0; i <= steps; i++) {
    const ms = (duration * i) / steps
    frames.push({
      offset: i / steps,
      translate: `0px ${sampleTrack(y, ms).toFixed(2)}px`,
      rotate: `x ${sampleTrack(rotate, ms).toFixed(2)}deg`,
      scale: sampleTrack(scale, ms).toFixed(4),
      opacity: sampleTrack(opacity, ms).toFixed(4),
      transformOrigin: origin,
    })
  }
  return element.animate(frames, { duration, delay, fill: phase.endsWith('Hide') ? 'forwards' : 'both' })
}

export function continuum(element: HTMLElement, phase: ContinuumPhase, delay = 0): Animation {
  if (is81()) return continuum81(element, phase, delay)
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
