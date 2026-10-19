import { useState } from 'react'
import { Paragraph, SettingsPage } from '../../components/controls'
import { ListPicker } from '../../components/ListPicker'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import { TextBox } from '../../components/TextBox'

type CallerId = 'everyone' | 'contacts' | 'nobody'

const CALLER_ID: { value: CallerId; label: string }[] = [
  { value: 'everyone', label: 'everyone' },
  { value: 'contacts', label: 'my contacts' },
  { value: 'nobody', label: 'no one' },
]

// Looks like the phone's call settings; nothing here reaches a network.
export function CallSettingsPage() {
  const [voicemail, setVoicemail] = useState('(425) 555-0100')
  const [callerId, setCallerId] = useState<CallerId>('everyone')
  const [waiting, setWaiting] = useState(true)
  const [forwarding, setForwarding] = useState(false)
  const [assist, setAssist] = useState(true)
  return (
    <SettingsPage app="phone" title="call settings">
      <TextBox header="voicemail number" type="tel" inputMode="tel" value={voicemail} onChange={setVoicemail} />
      <ListPicker header="show my caller ID to" options={CALLER_ID} value={callerId} onChange={setCallerId} />
      <ToggleSwitch header="call waiting" checked={waiting} onChange={setWaiting} />
      <ToggleSwitch header="call forwarding" checked={forwarding} onChange={setForwarding} />
      <ToggleSwitch header="international assist" checked={assist} onChange={setAssist} />
      <Paragraph subtle>These settings are for show and reset when you leave Phone.</Paragraph>
    </SettingsPage>
  )
}
