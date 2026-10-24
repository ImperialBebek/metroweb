import { useState } from 'react'
import { AccentPicker, ACCENTS, ListPicker, SettingsPage, usePopupLayer, type Background } from 'metroweb'

export function Settings({
  background,
  accent,
  onBackground,
  onAccent,
}: {
  background: Background
  accent: number
  onBackground: (background: Background) => void
  onAccent: (accent: number) => void
}) {
  const layer = usePopupLayer()
  const [picking, setPicking] = useState(false)
  return (
    <SettingsPage app="to-do" title="settings">
      <ListPicker<Background>
        header="Background"
        value={background}
        onChange={onBackground}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      {/* Twenty accents are too many to expand in place, so the picker opens the full-mode grid. */}
      <ListPicker<number>
        header="Accent color"
        value={accent}
        onChange={onAccent}
        onOpenFullMode={() => setPicking(true)}
        options={ACCENTS.map((a, i) => ({ value: i, label: a.name, swatch: a.color }))}
      />
      {picking && <AccentPicker container={layer} value={accent} onPick={onAccent} onClose={() => setPicking(false)} />}
    </SettingsPage>
  )
}
