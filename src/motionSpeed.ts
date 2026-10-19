// A global playback-rate dial for watching the phone's motion in slow motion.
// Every Web Animation and CSS animation/transition is retimed through
// Animation.playbackRate; timers and frame loops that pace themselves against
// an animation scale their durations with motionMs().

const KEY = 'wp8.motionSpeed'

export const MOTION_SPEEDS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5, 2]

function stored(): number {
  try {
    const value = Number(sessionStorage.getItem(KEY))
    return MOTION_SPEEDS.includes(value) ? value : 1
  } catch {
    return 1
  }
}

let speed = stored()
let frame = 0
const listeners = new Set<() => void>()

export const getMotionSpeed = () => speed
export const motionMs = (ms: number) => ms / speed

// Web Animations are retimed as they are created, so a slowed one doesn't
// play its first frame at full speed.
const animate = Element.prototype.animate
Element.prototype.animate = function (this: Element, keyframes, options) {
  const animation = animate.call(this, keyframes, options)
  if (speed !== 1) animation.playbackRate = speed
  return animation
}

function retime() {
  for (const animation of document.getAnimations()) {
    const rate = Math.sign(animation.playbackRate) * speed
    if (animation.playbackRate !== rate) animation.playbackRate = rate
  }
}

// CSS animations and transitions start without a hook, so while slowed every
// frame picks up the new ones before they paint.
function watch() {
  cancelAnimationFrame(frame)
  if (speed === 1) return
  const tick = () => {
    retime()
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

export function setMotionSpeed(value: number) {
  if (value === speed) return
  speed = value
  try {
    sessionStorage.setItem(KEY, String(value))
  } catch {
    // Private browsing: the speed just won't survive a reload.
  }
  retime()
  watch()
  listeners.forEach((listener) => listener())
}

export function subscribeMotionSpeed(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

watch()
