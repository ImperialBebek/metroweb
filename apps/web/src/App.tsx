import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AlarmRinger } from './apps/alarms/AlarmRinger'
import { PlaceholderApp } from './apps/PlaceholderApp'
import { APP_COMPONENTS } from './apps/registry'
import { SettingsApp } from './apps/SettingsApp'
import { NavigationBar, PhIcon, PopupLayerContext, themeVariables, useModalOpen, type StackHandle } from 'metroweb'
import { APP_BY_ID } from './start/apps'
import { StartScreen, type StartHandle } from './start/StartScreen'
import { useSettings, type SettingsState } from './store'
import { MotionSpeedControl } from './MotionSpeedControl'
import { playerStore, setVolume } from './data/player'
import { VolumeBand, VolumeKeys, type VolumeBandHandle } from './VolumeBand'

const SCREEN_WIDTH = 480

// The space the host device keeps for its own status bar and home indicator
// (an iOS home screen web app draws the page under both).
function safeInsets() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 }
  probe.remove()
  return insets
}

// Launched from the home screen, where the device's own status bar is
// always showing, so the phone's system tray is left out.
const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

// index.html asks iOS for an opaque status bar: with a translucent one, iOS
// (26) makes a home screen app's page a status bar shorter than the display
// and leaves a black band below it that the page can't draw into.
const visibleHeight = () => Math.max(window.innerHeight, document.documentElement.clientHeight)

// Phones narrower than the 480px logical width get the whole UI scaled down,
// as WP8 itself scales 480-wide layouts to the panel; the logical height
// grows or shrinks with the viewport, less the device's safe areas.
function useViewport() {
  const compute = () => {
    const scale = Math.min(window.innerWidth / SCREEN_WIDTH, 1)
    const insets = safeInsets()
    const full = visibleHeight()
    return { scale, insets, full, height: (full - insets.top - insets.bottom) / scale }
  }
  const [viewport, setViewport] = useState(compute)
  useEffect(() => {
    const update = () => setViewport(compute())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])
  return viewport
}
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(timer)
  }, [])
  return `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
}

function SystemTray({ settings, onTap }: { settings: SettingsState; onTap: () => void }) {
  const time = useClock()
  return (
    // metro-ignore click-on-div: a tap on the tray drops the volume band, as on the phone; the tray has no tilt
    <div className="system-tray" aria-hidden onClick={onTap}>
      <div className="tray-left">
        {settings.airplaneMode ? (
          <PhIcon name="airplane" size={20} />
        ) : (
          <PhIcon name="cell-signal-full" size={20} />
        )}
        {settings.wifi && <PhIcon name="wifi-high" size={20} />}
        {settings.bluetooth && <PhIcon name="bluetooth" size={18} />}
      </div>
      <div className="tray-right">
        <PhIcon name={settings.batterySaver ? 'battery-medium' : 'battery-full'} size={28} />
        <span className="tray-time">{time}</span>
      </div>
    </div>
  )
}

export default function App() {
  const { settings } = useSettings()
  const viewport = useViewport()
  const covered = useModalOpen()
  const [popupLayer, setPopupLayer] = useState<HTMLDivElement | null>(null)
  const [running, setRunning] = useState<{ id: string; key: number } | null>(null)
  const startScreen = useRef<StartHandle>(null)
  const app = useRef<StackHandle>(null)
  const busy = useRef(false)
  const returning = useRef(false)
  const launches = useRef(0)
  const [startPane, setStartPane] = useState<0 | 1>(0)
  const backRef = useRef<() => void>(() => {})
  const volumeBand = useRef<VolumeBandHandle>(null)
  const stepVolume = (step: 1 | -1) => {
    setVolume(playerStore.get().volume + step)
    volumeBand.current?.show()
  }
  const stepVolumeRef = useRef(stepVolume)

  const launch = (id: string, source: HTMLElement) => {
    if (busy.current || running) return
    busy.current = true
    startScreen.current?.featherOut(source).then(() => {
      busy.current = false
      setRunning({ id, key: ++launches.current })
    })
  }

  const exitApp = () => {
    returning.current = true
    setRunning(null)
  }

  // Feather the Start screen back in on the same frame the app unmounts, while
  // its tiles are still held invisible by the outgoing animation.
  useLayoutEffect(() => {
    if (running || !returning.current) return
    returning.current = false
    busy.current = true
    startScreen.current?.featherIn().then(() => {
      busy.current = false
    })
  }, [running])

  const back = () => {
    if (busy.current) return
    if (running) app.current?.back()
    else startScreen.current?.back()
  }
  const start = () => {
    if (busy.current) return
    if (running) {
      startScreen.current?.showTiles()
      app.current?.exit()
    } else startScreen.current?.home()
  }

  // Browser Back (and the Android back gesture) acts as the phone's Back
  // button. While anything is open, one extra history entry sits on top so
  // Back stays inside the app; it is removed again on returning to Start.
  const atRoot = !running && startPane === 0
  const atRootRef = useRef(atRoot)
  const guard = useRef(false)
  const ignorePop = useRef(false)
  useLayoutEffect(() => {
    atRootRef.current = atRoot
    backRef.current = back
    stepVolumeRef.current = stepVolume
  })
  useEffect(() => {
    if (!atRoot && !guard.current) {
      window.history.pushState({ wp: 'open' }, '')
      guard.current = true
    } else if (atRoot && guard.current) {
      guard.current = false
      ignorePop.current = true
      window.history.back()
    }
  }, [atRoot])
  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false
        return
      }
      guard.current = false
      if (atRootRef.current) return
      backRef.current()
      window.history.pushState({ wp: 'open' }, '')
      guard.current = true
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      const typing =
        t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)
      if (e.key === 'Escape' || (e.key === 'Backspace' && !typing)) {
        e.preventDefault()
        backRef.current()
      } else if (e.key === 'AudioVolumeUp' || (!typing && (e.key === '+' || e.key === '='))) {
        e.preventDefault()
        stepVolumeRef.current(1)
      } else if (e.key === 'AudioVolumeDown' || (!typing && (e.key === '-' || e.key === '_'))) {
        e.preventDefault()
        stepVolumeRef.current(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const theme = themeVariables(settings.background, settings.accent) as CSSProperties
  useEffect(() => {
    const background = settings.background === 'dark' ? '#000000' : '#ffffff'
    document.documentElement.style.background = background
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
  }, [settings.background])

  const runningApp = running ? APP_BY_ID.get(running.id) : undefined
  const AppComponent = running ? APP_COMPONENTS[running.id] : undefined

  return (
    <div className="desk" style={{ ...theme, height: viewport.full }}>
      <div className="column" style={{ width: SCREEN_WIDTH * viewport.scale }}>
        <div
          className="screen"
          style={{
            ...theme,
            top: viewport.insets.top,
            ...(standalone && { '--tray-height': '0px' }),
            width: SCREEN_WIDTH,
            height: viewport.height,
            transform: `scale(${viewport.scale})`,
          }}
          data-theme={settings.background}
        >
          {!standalone && <SystemTray settings={settings} onTap={() => volumeBand.current?.show()} />}
          <StartScreen active={!running} covered={covered} onLaunch={launch} onPaneChange={setStartPane} handle={startScreen} />
          <PopupLayerContext.Provider value={popupLayer}>
            {running && runningApp && (
              <div className="app-host" key={running.key} inert={covered}>
                {running.id === 'settings' ? (
                  <SettingsApp popupLayer={popupLayer} onExit={exitApp} handle={app} />
                ) : AppComponent ? (
                  <AppComponent onExit={exitApp} handle={app} />
                ) : (
                  <PlaceholderApp app={runningApp} onExit={exitApp} handle={app} />
                )}
              </div>
            )}
          </PopupLayerContext.Provider>
          <div className="popup-layer" ref={setPopupLayer} />
          <AlarmRinger />
          <VolumeBand handle={volumeBand} />
          <NavigationBar onBack={back} onStart={start} />
        </div>
      </div>
      {/* Solid black behind any status bar the host draws over the page, and
          behind its home indicator, extending the nav bar. Tapping the status
          bar stands in for tapping the phone's tray.
          metro-ignore click-on-div: like the tray, it isn't a control */}
      <div className="safe-area" style={{ top: 0, height: viewport.insets.top }} onClick={() => volumeBand.current?.show()} />
      <div className="safe-area" style={{ bottom: 0, height: viewport.insets.bottom }} />
      <MotionSpeedControl />
      <VolumeKeys onStep={stepVolume} />
    </div>
  )
}
