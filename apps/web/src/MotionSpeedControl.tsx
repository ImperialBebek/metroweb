import { useSyncExternalStore, type CSSProperties } from 'react'
import { getMotionSpeed, MOTION_SPEEDS, setMotionSpeed, subscribeMotionSpeed } from 'metroweb'

const PRESETS = [0.1, 0.25, 0.5, 1, 2]

// Sits on the desk beside the phone, so it is only shown when there is room.
export function MotionSpeedControl() {
  const speed = useSyncExternalStore(subscribeMotionSpeed, getMotionSpeed)
  const index = MOTION_SPEEDS.indexOf(speed)
  const fill = `${(index / (MOTION_SPEEDS.length - 1)) * 100}%`
  return (
    <aside className="speed-control" aria-label="Animation speed">
      <div className="speed-control-head">
        <span className="speed-control-title">animation speed</span>
        <output className="speed-control-value">{speed}×</output>
      </div>
      <input
        type="range"
        className="speed-control-slider"
        min={0}
        max={MOTION_SPEEDS.length - 1}
        step={1}
        value={index}
        style={{ '--fill': fill } as CSSProperties}
        aria-label="Animation speed"
        aria-valuetext={`${speed} times`}
        onChange={(e) => setMotionSpeed(MOTION_SPEEDS[Number(e.target.value)])}
      />
      <div className="speed-control-presets">
        {PRESETS.map((preset) => (
          <button key={preset} type="button" aria-pressed={preset === speed} onClick={() => setMotionSpeed(preset)}>
            {preset}×
          </button>
        ))}
      </div>
    </aside>
  )
}
