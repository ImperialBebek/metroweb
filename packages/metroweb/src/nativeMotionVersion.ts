// Which Windows Phone release's native (UIX) page motion plays: the feathered
// turnstile, the whole-page turn, Start's feather and continuum. 8.1, decoded
// from 8.1's ANIMATIONS.UIX and startmenu's STYLES.UIX, is the default; 8.0
// stays for comparison.

export type NativeMotionVersion = '8.0' | '8.1'

export const NATIVE_MOTION_VERSIONS: readonly NativeMotionVersion[] = ['8.0', '8.1']

let version: NativeMotionVersion = '8.1'
const listeners = new Set<() => void>()

export const getNativeMotionVersion = () => version

export function setNativeMotionVersion(value: NativeMotionVersion) {
  if (value === version) return
  version = value
  listeners.forEach((listener) => listener())
}

export function subscribeNativeMotionVersion(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
