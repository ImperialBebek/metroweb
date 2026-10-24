// Original alarm tones, synthesised with WebAudio so no audio files ship.
type Voice = OscillatorType

interface Pattern {
  // Seconds between repeats when looping.
  cycle: number
  play: (ac: AudioContext, out: AudioNode, t: number) => void
}

function tone(
  ac: AudioContext,
  out: AudioNode,
  t: number,
  { freq, dur, type = 'sine', gain = 0.3, attack = 0.005 }: { freq: number; dur: number; type?: Voice; gain?: number; attack?: number },
) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env).connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function bell(ac: AudioContext, out: AudioNode, t: number, freq: number) {
  tone(ac, out, t, { freq, dur: 1.4, gain: 0.25 })
  // An inharmonic partial gives the tone its struck-metal colour.
  tone(ac, out, t, { freq: freq * 2.76, dur: 0.5, gain: 0.06 })
}

const PATTERNS: Record<string, Pattern> = {
  Beep: {
    cycle: 1.2,
    play: (ac, out, t) => {
      for (let i = 0; i < 4; i++) tone(ac, out, t + i * 0.14, { freq: 1046, dur: 0.08, type: 'square', gain: 0.08 })
    },
  },
  Chimes: {
    cycle: 2.6,
    play: (ac, out, t) => {
      const notes = [659.3, 830.6, 987.8, 1318.5]
      notes.forEach((f, i) => bell(ac, out, t + i * 0.28, f))
    },
  },
  Pulse: {
    cycle: 1.6,
    play: (ac, out, t) => {
      for (let i = 0; i < 3; i++) {
        tone(ac, out, t + i * 0.22, { freq: 523.3, dur: 0.18, type: 'triangle', gain: 0.35, attack: 0.02 })
        tone(ac, out, t + i * 0.22, { freq: 784, dur: 0.18, type: 'triangle', gain: 0.15, attack: 0.02 })
      }
    },
  },
  Sunrise: {
    cycle: 3.2,
    play: (ac, out, t) => {
      const notes = [392, 493.9, 587.3, 784]
      notes.forEach((f, i) => tone(ac, out, t + i * 0.4, { freq: f, dur: 1.8, gain: 0.18, attack: 0.35 }))
    },
  },
}

let context: AudioContext | null = null

// Browsers only start audio after a user gesture; calling this from one unlocks
// later playback. Returns null when WebAudio is unavailable.
export function audioContext(): AudioContext | null {
  try {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      context = new Ctor()
    }
    if (context.state === 'suspended') context.resume().catch(() => {})
    return context
  } catch {
    return null
  }
}

// Starts the sound and returns a function that stops it.
export function playSound(name: string, loop: boolean): () => void {
  const ac = audioContext()
  if (!ac) return () => {}
  const pattern = PATTERNS[name] ?? PATTERNS.Beep
  const master = ac.createGain()
  master.connect(ac.destination)
  const start = ac.currentTime + 0.05
  let timer = 0
  if (loop) {
    // Alarms start quietly and swell, like the phone's ringing.
    master.gain.setValueAtTime(0.4, start)
    master.gain.linearRampToValueAtTime(1, start + 20)
    let next = start
    const schedule = () => {
      while (next < ac.currentTime + 0.6) {
        pattern.play(ac, master, next)
        next += pattern.cycle
      }
    }
    schedule()
    timer = window.setInterval(schedule, 200)
  } else {
    pattern.play(ac, master, start)
  }
  return () => {
    window.clearInterval(timer)
    const t = ac.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setTargetAtTime(0, t, 0.03)
    window.setTimeout(() => master.disconnect(), 300)
  }
}
