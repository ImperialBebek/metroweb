import { useRef, useState, type ComponentType } from 'react'
import {
  AccentPicker,
  ACCENTS,
  AppBar,
  Button,
  ListItem,
  ListPicker,
  MessageBox,
  Panorama,
  Paragraph,
  Pivot,
  SettingsPage,
  TimePicker,
  ToggleSwitch,
  usePopupLayer,
  type Background,
} from 'metroweb'
import { ALBUMS, ARTIST_BY_ID } from '../data/music'
import { playerStore, setVolume } from '../data/player'
import { APPLICATION_ITEMS, SYSTEM_ITEMS, type SettingsEntry } from '../pages/items'
import type { SettingsState } from '../store'
import { VolumeBand, type VolumeBandHandle } from '../VolumeBand'
import { DemoFrame } from './DemoFrame'
import { useDesignTheme } from './designTheme'

const nothing = () => {}

function PivotDemo() {
  const { background, accent } = useDesignTheme()
  // Only the list subtitles read these.
  const settings: SettingsState = {
    background,
    accent,
    airplaneMode: false,
    wifi: true,
    bluetooth: false,
    tapSend: true,
    location: true,
    batterySaver: false,
    kidsCorner: false,
    autoBrightness: true,
    brightnessLevel: 'medium',
    radiosBeforeAirplane: null,
  }
  const list = (entries: SettingsEntry[]) => (
    <div className="list">
      {entries.map((entry) => (
        <ListItem key={entry.route} title={entry.title} subtitle={entry.subtitle?.(settings)} onTap={nothing} />
      ))}
    </div>
  )
  return (
    <Pivot
      title="settings"
      items={[
        { key: 'system', header: 'system', content: list(SYSTEM_ITEMS) },
        { key: 'applications', header: 'applications', content: list(APPLICATION_ITEMS) },
      ]}
    />
  )
}

function PanoramaDemo() {
  const artist = (id: string) => ARTIST_BY_ID.get(id)?.name
  const newest = [...ALBUMS].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo).slice(0, 4)
  return (
    <Panorama
      title="music+videos"
      background={ARTIST_BY_ID.get('grieg')?.image}
      sections={[
        {
          key: 'collection',
          header: 'collection',
          content: ['music', 'videos', 'podcasts', 'radio'].map((name) => (
            <ListItem key={name} title={name} onTap={nothing} />
          )),
        },
        {
          key: 'history',
          header: 'history',
          content: ALBUMS.slice(0, 4).map((album) => (
            <ListItem key={album.id} title={album.title} subtitle={artist(album.artist)} onTap={nothing} />
          )),
        },
        {
          key: 'new',
          header: 'new',
          content: newest.map((album) => (
            <ListItem key={album.id} title={album.title} subtitle={artist(album.artist)} onTap={nothing} />
          )),
        },
      ]}
    />
  )
}

function ToggleDemo() {
  const [wifi, setWifi] = useState(true)
  return (
    <SettingsPage title="Wi-Fi">
      <ToggleSwitch header="Wi-Fi networking" checked={wifi} onChange={setWifi} />
      {wifi && <Paragraph subtle>Searching...</Paragraph>}
    </SettingsPage>
  )
}

// The Settings theme page, driving the theme of these pages.
function ThemeDemo() {
  const { background, accent, update } = useDesignTheme()
  const layer = usePopupLayer()
  const [accentOpen, setAccentOpen] = useState(false)
  return (
    <SettingsPage title="theme">
      <ListPicker<Background>
        header="Background"
        value={background}
        onChange={(value) => update({ background: value })}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      <ListPicker<number>
        header="Accent color"
        value={accent}
        onChange={(value) => update({ accent: value })}
        onOpenFullMode={() => setAccentOpen(true)}
        options={ACCENTS.map((a, i) => ({ value: i, label: a.name, swatch: a.color }))}
      />
      <Paragraph>
        Change your phone's background and <span className="accent-text">accent color</span> to match your mood
        today, this week, or all month.
      </Paragraph>
      {accentOpen && (
        <AccentPicker
          container={layer}
          value={accent}
          onPick={(value) => update({ accent: value })}
          onClose={() => setAccentOpen(false)}
        />
      )}
    </SettingsPage>
  )
}

function TimePickerDemo() {
  const [time, setTime] = useState({ hour: 7, minute: 30 })
  return (
    <SettingsPage app="alarms" title="new alarm">
      <TimePicker header="Time" hour={time.hour} minute={time.minute} onChange={(hour, minute) => setTime({ hour, minute })} />
    </SettingsPage>
  )
}

function AppBarDemo() {
  return (
    <div className="app-page">
      <div className="app-page-body">
        <SettingsPage app="messaging" title="conversations">
          <Paragraph subtle>no conversations</Paragraph>
        </SettingsPage>
      </div>
      <AppBar
        buttons={[
          { icon: 'add', label: 'new', onTap: nothing },
          { icon: 'select', label: 'select', onTap: nothing },
        ]}
        menu={[{ label: 'settings', onTap: nothing }]}
      />
    </div>
  )
}

function MessageBoxDemo() {
  const [open, setOpen] = useState(false)
  return (
    <SettingsPage app="messaging" title="conversations">
      <Button onTap={() => setOpen(true)}>delete thread</Button>
      {open && (
        <MessageBox
          caption="Delete thread?"
          message="All the messages in this thread will be deleted from your phone."
          buttons={[{ label: 'delete' }, { label: 'cancel' }]}
          onDismissed={() => setOpen(false)}
        />
      )}
    </SettingsPage>
  )
}

function VolumeDemo() {
  const band = useRef<VolumeBandHandle>(null)
  const step = (by: 1 | -1) => {
    setVolume(playerStore.get().volume + by)
    band.current?.show()
  }
  // The band hangs from the top of the screen, so it sits outside the page's pivot.
  return (
    <>
      <SettingsPage title="ringtones+sounds">
        <Paragraph subtle>Stand-ins for the volume keys on the side of the phone:</Paragraph>
        <Button onTap={() => step(1)}>volume up</Button>
        <Button onTap={() => step(-1)}>volume down</Button>
      </SettingsPage>
      <VolumeBand handle={band} />
    </>
  )
}

interface DemoSpec {
  Page: ComponentType
  height: number
  nav?: boolean
  caption: string
}

// Keyed by the name in the docs' <!-- demo: name --> comments.
const DEMOS: Record<string, DemoSpec> = {
  pivot: { Page: PivotDemo, height: 560, caption: 'Swipe the items, tap a header, or use the arrow keys on the selected header.' },
  panorama: { Page: PanoramaDemo, height: 620, caption: 'Swipe sideways. After the last section the panorama wraps to the first.' },
  'toggle-switch': { Page: ToggleDemo, height: 330, caption: 'Tap the switch, or drag its thumb.' },
  'list-picker': {
    Page: ThemeDemo,
    height: 600,
    nav: true,
    caption: 'Background expands in place; Accent color opens the full-mode picker. Both restyle these pages.',
  },
  'time-picker': { Page: TimePickerDemo, height: 600, nav: true, caption: 'Tap the time to open the picker. Back or Esc closes it without saving.' },
  'app-bar': { Page: AppBarDemo, height: 420, nav: true, caption: 'Tap the ellipsis to show the labels and the menu. Back or Esc closes it.' },
  'message-box': {
    Page: MessageBoxDemo,
    height: 420,
    nav: true,
    caption: 'Back or Esc dismisses the box the way its last button would.',
  },
  'volume-band': {
    Page: VolumeDemo,
    height: 420,
    caption: 'The band hides 3 seconds after the last press. It sets the same volume as the phone.',
  },
}

export function Demo({ name }: { name: string }) {
  const demo = DEMOS[name]
  if (!demo) {
    if (import.meta.env.DEV) console.warn(`design docs: no demo named "${name}"`)
    return null
  }  const { Page, ...frame } = demo
  return (
    <DemoFrame {...frame}>
      <Page />
    </DemoFrame>
  )
}
