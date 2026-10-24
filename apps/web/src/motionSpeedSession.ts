// Keeps the motion speed dial's setting for the tab's session, so a reload
// stays in slow motion. Imported first by both entry points, before anything
// animates.
import { getMotionSpeed, MOTION_SPEEDS, setMotionSpeed, subscribeMotionSpeed } from 'metroweb'

const KEY = 'wp8.motionSpeed'

try {
  const value = Number(sessionStorage.getItem(KEY))
  if (MOTION_SPEEDS.includes(value)) setMotionSpeed(value)
} catch {
  // Storage is blocked: start at full speed.
}

subscribeMotionSpeed(() => {
  try {
    sessionStorage.setItem(KEY, String(getMotionSpeed()))
  } catch {
    // Private browsing: the speed just won't survive a reload.
  }
})
