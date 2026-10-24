import { useState } from 'react'
import {
  AccentPicker,
  ACCENTS,
  Button,
  ListItem,
  ListPicker,
  Paragraph,
  Pivot,
  SettingsPage,
  ToggleSwitch,
  useNavigation,
  type Background,
} from 'metroweb'
import { useSettings, type BrightnessLevel } from '../store'
import { ALL_ITEMS, APPLICATION_ITEMS, SYSTEM_ITEMS, type SettingsEntry } from './items'

let homePivotIndex = 0

export function SettingsHome() {
  const { settings } = useSettings()
  const { navigate } = useNavigation()
  const [selected, setSelected] = useState(homePivotIndex)

  const list = (entries: SettingsEntry[]) => (
    <div className="list">
      {entries.map((entry) => (
        <ListItem
          key={entry.route}
          title={entry.title}
          subtitle={entry.subtitle?.(settings)}
          onTap={() => navigate(entry.route)}
        />
      ))}
    </div>
  )

  return (
    <Pivot
      title="settings"
      selected={selected}
      onSelectedChange={(index) => {
        homePivotIndex = index
        setSelected(index)
      }}
      items={[
        { key: 'system', header: 'system', content: list(SYSTEM_ITEMS) },
        { key: 'applications', header: 'applications', content: list(APPLICATION_ITEMS) },
      ]}
    />
  )
}

export function ThemePage({ popupLayer }: { popupLayer: HTMLElement | null }) {
  const { settings, update } = useSettings()
  const [accentOpen, setAccentOpen] = useState(false)

  return (
    <SettingsPage title="theme">
      <ListPicker<Background>
        header="Background"
        value={settings.background}
        onChange={(background) => update({ background })}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      <ListPicker<number>
        header="Accent color"
        value={settings.accent}
        onChange={(accent) => update({ accent })}
        onOpenFullMode={() => setAccentOpen(true)}
        options={ACCENTS.map((a, i) => ({ value: i, label: a.name, swatch: a.color }))}
      />
      <Paragraph>
        Change your phone's background and <span className="accent-text">accent color</span> to match your mood
        today, this week, or all month.
      </Paragraph>
      {accentOpen && (
        <AccentPicker
          container={popupLayer}
          value={settings.accent}
          onPick={(accent) => update({ accent })}
          onClose={() => setAccentOpen(false)}
        />
      )}
    </SettingsPage>
  )
}

export function AirplanePage() {
  const { settings, update } = useSettings()
  const setAirplane = (on: boolean) => {
    if (on) {
      update({
        airplaneMode: true,
        radiosBeforeAirplane: { wifi: settings.wifi, bluetooth: settings.bluetooth, tapSend: settings.tapSend },
        wifi: false,
        bluetooth: false,
        tapSend: false,
      })
    } else {
      update({ airplaneMode: false, ...(settings.radiosBeforeAirplane ?? {}), radiosBeforeAirplane: null })
    }
  }
  return (
    <SettingsPage title="airplane mode">
      <Paragraph>
        This feature turns off cellular, Wi-Fi, Bluetooth, and NFC sharing. While in airplane mode, you can turn on
        Wi-Fi, Bluetooth, and NFC sharing separately.
      </Paragraph>
      <ToggleSwitch header="Status" checked={settings.airplaneMode} onChange={setAirplane} />
    </SettingsPage>
  )
}

export function WifiPage() {
  const { settings, update } = useSettings()
  return (
    <SettingsPage title="Wi-Fi">
      <ToggleSwitch header="Wi-Fi networking" checked={settings.wifi} onChange={(wifi) => update({ wifi })} />
      {settings.wifi && <Paragraph subtle>Searching...</Paragraph>}
    </SettingsPage>
  )
}

export function BluetoothPage() {
  const { settings, update } = useSettings()
  return (
    <SettingsPage title="Bluetooth">
      <Paragraph>
        While on this screen, your phone will search for Bluetooth devices and be discoverable.
      </Paragraph>
      <ToggleSwitch header="Status" checked={settings.bluetooth} onChange={(bluetooth) => update({ bluetooth })} />
      {settings.bluetooth && <Paragraph subtle>Searching...</Paragraph>}
    </SettingsPage>
  )
}

export function TapSendPage() {
  const { settings, update } = useSettings()
  return (
    <SettingsPage title="tap+send">
      <ToggleSwitch header="NFC sharing" checked={settings.tapSend} onChange={(tapSend) => update({ tapSend })} />
      <Paragraph>
        Share photos, websites, contacts, and more, or pair your phone by tapping to another NFC-capable device.
      </Paragraph>
    </SettingsPage>
  )
}

export function LocationPage() {
  const { settings, update } = useSettings()
  return (
    <SettingsPage title="location">
      <ToggleSwitch
        header="Location services"
        checked={settings.location}
        onChange={(location) => update({ location })}
      />
      <Paragraph>
        {settings.location
          ? "When Location services are on, your current location will be available to any apps you've allowed to access it."
          : "Applications can't access your current location."}
      </Paragraph>
      <Paragraph>
        <span className="accent-text">Privacy Statement</span>
      </Paragraph>
    </SettingsPage>
  )
}

export function BatteryPage() {
  const { settings, update } = useSettings()
  const { navigate } = useNavigation()
  return (
    <SettingsPage title="battery saver">
      <Paragraph>
        Your phone can turn off some services while in standby to help preserve battery life. When Battery Saver is
        turned on, you will still receive calls and texts, but apps run only when you open them and email must be
        synced manually.
      </Paragraph>
      <ToggleSwitch
        header="Battery Saver"
        checked={settings.batterySaver}
        onChange={(batterySaver) => update({ batterySaver })}
      />
      <Paragraph subtle>Remaining battery life: 86%</Paragraph>
      <Paragraph subtle>Estimated time remaining: 1 day 4 hours</Paragraph>
      <Button onTap={() => navigate('battery-advanced')}>advanced</Button>
    </SettingsPage>
  )
}

export function BrightnessPage() {
  const { settings, update } = useSettings()
  return (
    <SettingsPage title="brightness">
      <ToggleSwitch
        header="Automatically adjust"
        checked={settings.autoBrightness}
        onChange={(autoBrightness) => update({ autoBrightness })}
      />
      <ListPicker<BrightnessLevel>
        header="Level"
        disabled={settings.autoBrightness}
        value={settings.brightnessLevel}
        onChange={(brightnessLevel) => update({ brightnessLevel })}
        options={[
          { value: 'low', label: 'low' },
          { value: 'medium', label: 'medium' },
          { value: 'high', label: 'high' },
        ]}
      />
    </SettingsPage>
  )
}

export function AboutPage() {
  return (
    <SettingsPage title="about">
      <div className="info-lines">
        <div>Name: Windows Phone</div>
        <div>Model: Microsoft Virtual</div>
        <div>Software: Windows ® Phone 8.0</div>
        <div>OS version: 8.0.9903.10</div>
        <div>Screen resolution: 480x800</div>
      </div>
      <Button>more info</Button>
      <Button>reset your phone</Button>
      <Paragraph subtle>© 2012 Microsoft Corporation</Paragraph>
    </SettingsPage>
  )
}

export function PlaceholderPage({ route }: { route: string }) {
  const title =
    ALL_ITEMS.find((item) => item.route === route)?.title ?? (route === 'battery-advanced' ? 'advanced' : route)
  return (
    <SettingsPage title={title}>
      <Paragraph subtle>This page hasn't been recreated yet.</Paragraph>
    </SettingsPage>
  )
}
