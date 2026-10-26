// Keeps the motion speed dial's setting, and which release's native motion
// plays, for the tab's session, so a reload stays in slow motion. Imported
// first by both entry points, before anything animates.
import {
  getMotionSpeed,
  getNativeMotionVersion,
  MOTION_SPEEDS,
  NATIVE_MOTION_VERSIONS,
  setMotionSpeed,
  setNativeMotionVersion,
  subscribeMotionSpeed,
  subscribeNativeMotionVersion,
  type NativeMotionVersion,
} from 'metroweb'

const KEY = 'wp8.motionSpeed'
const VERSION_KEY = 'wp8.nativeMotion'

try {
  const value = Number(sessionStorage.getItem(KEY))
  if (MOTION_SPEEDS.includes(value)) setMotionSpeed(value)
  const version = sessionStorage.getItem(VERSION_KEY) as NativeMotionVersion
  if (NATIVE_MOTION_VERSIONS.includes(version)) setNativeMotionVersion(version)
} catch {
  // Storage is blocked: start at full speed, on the default release.
}

function save(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Private browsing: the setting just won't survive a reload.
  }
}

subscribeMotionSpeed(() => save(KEY, String(getMotionSpeed())))
subscribeNativeMotionVersion(() => save(VERSION_KEY, getNativeMotionVersion()))
