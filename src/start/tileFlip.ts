import { flushSync } from 'react-dom'

// Native live tile flips, decoded from the shell's compiled UIX markup
// (ShellControls.dll: FlipTile.uix FlipShows/FlipHides, FlipGrid.uix cell
// flips). Each flip is two tracks that play together: the outgoing face's
// (hide) and the incoming face's (show). At `swap` the outgoing face's opacity
// drops to 0 and the incoming one's rises to 1, with both edge-on, so a single
// element can play the hide track up to `swap` and the show track after it.

type Curve = (t: number) => number

// Iris interpolations as uixrender computes them: Exp eases in, Log eases out.
// SCurve's exact shape wasn't decoded; this is Exp mirrored about the midpoint.
const exp =
  (w: number): Curve =>
  (t) =>
    (w ** t - 1) / (w - 1)
const log =
  (w: number): Curve =>
  (t) =>
    1 - exp(w)(1 - t)
const sCurve =
  (w: number): Curve =>
  (t) =>
    t < 0.5 ? exp(w)(2 * t) / 2 : 1 - exp(w)(2 - 2 * t) / 2

// [time (ms), angle (deg), curve of the segment arriving at this key]
type Key = [number, number, Curve?]

interface FlipMotion {
  hide: Key[]
  show: Key[]
  swap: number
}

// The markup times halved by the TimeScale 0.5 that wraps the tile flips.
// The shell picks one of the three at random for each flip.
const TILE_FLIPS: FlipMotion[] = [
  {
    hide: [[0, 0], [250, 90, exp(10)]],
    show: [[0, -90], [250, -90], [750, 0, log(150)]],
    swap: 250,
  },
  {
    hide: [[0, 0], [183, 215, log(10)]],
    show: [[0, -180], [183, 35, log(10)], [417, -6, sCurve(10)], [625, 0, sCurve(10)]],
    swap: 40,
  },
  {
    hide: [[0, 0], [125, -30, sCurve(10)], [292, 200, sCurve(10)]],
    show: [[0, -210], [125, -210], [292, 20, sCurve(10)], [458, 0, sCurve(10)]],
    swap: 209,
  },
]

// FlipGrid cells (TimeScale 1). Horizontal cells turn about the X axis; vertical
// ones play the same motion about the Y axis.
const CELL_FLIP: FlipMotion = {
  hide: [[0, 0], [137, 90, log(1.99)]],
  show: [[0, -180], [1000, 0, log(150)]],
  swap: 120,
}

function angleAt(track: Key[], time: number): number {
  let [prevTime, prevAngle] = track[0]
  if (time <= prevTime) return prevAngle
  for (const [keyTime, angle, curve = (t: number) => t] of track.slice(1)) {
    if (time <= keyTime) return prevAngle + (angle - prevAngle) * curve((time - prevTime) / (keyTime - prevTime))
    prevTime = keyTime
    prevAngle = angle
  }
  return prevAngle
}

// Samples a track into dense linear keyframes, since the Iris curves have no
// CSS equivalent and a segment can be cut off at the swap.
function play(el: HTMLElement, track: Key[], from: number, to: number, transform: (angle: number) => string, fill: FillMode) {
  const steps = Math.max(2, Math.ceil((to - from) / 8))
  const frames = Array.from({ length: steps + 1 }, (_, i) => ({
    transform: transform(angleAt(track, from + ((to - from) * i) / steps)),
  }))
  return el.animate(frames, { duration: to - from, fill })
}

async function flip(el: HTMLElement, motion: FlipMotion, transform: (angle: number) => string, swap: () => void) {
  const end = motion.show[motion.show.length - 1][0]
  const away = play(el, motion.hide, 0, motion.swap, transform, 'forwards')
  try {
    await away.finished
  } catch {
    return
  }
  flushSync(swap)
  play(el, motion.show, motion.swap, end, transform, 'none')
  away.cancel()
}

export function flipTile(el: HTMLElement, swap: () => void) {
  const motion = TILE_FLIPS[Math.floor(Math.random() * TILE_FLIPS.length)]
  return flip(el, motion, (angle) => `perspective(800px) rotateX(${angle}deg)`, swap)
}

export function flipCell(el: HTMLElement, swap: () => void) {
  const transform =
    Math.random() < 0.5
      ? (angle: number) => `perspective(300px) rotateX(${angle}deg)`
      : (angle: number) => `perspective(300px) rotateY(${-angle}deg)`
  return flip(el, CELL_FLIP, transform, swap)
}
