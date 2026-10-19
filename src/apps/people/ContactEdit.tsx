import { useState } from 'react'
import { AppBar } from '../../components/AppBar'
import { DatePicker } from '../../components/DateTimePicker'
import { ListPicker } from '../../components/ListPicker'
import { formatNumber } from '../../data/calls'
import { contactsStore, type ContactGroup } from '../../data/contacts'
import { newId } from '../../data/persist'
import { useNavigation } from '../../navigation'
import { ContactPicture } from './ContactPicture'
import { TextBox } from './TextBox'
import { useTap } from './useTap'
import { isoDate, parseIsoDate } from './util'
import './people.css'

type TextField = 'first' | 'last' | 'mobile' | 'work' | 'email' | 'company'

function AddLink({ children, onTap }: { children: string; onTap: () => void }) {
  const tap = useTap<HTMLButtonElement>(onTap)
  return (
    <button type="button" className="people-add-link" {...tap}>
      {children}
    </button>
  )
}

const GROUP_OPTIONS: { value: '' | ContactGroup; label: string }[] = [
  { value: '', label: 'none' },
  { value: 'family', label: 'family' },
  { value: 'work', label: 'work' },
]

// New and edit contact. `number` prefills the mobile field (from the Phone keypad or history).
export function ContactEditPage({ id, number = '' }: { id?: string; number?: string }) {
  const { back } = useNavigation()
  const [existing] = useState(() => (id ? contactsStore.get().find((c) => c.id === id) : undefined))
  const [fields, setFields] = useState<Record<TextField, string>>(() => ({
    first: existing?.first ?? '',
    last: existing?.last ?? '',
    mobile: existing?.mobile ?? number,
    work: existing?.work ?? '',
    email: existing?.email ?? '',
    company: existing?.company ?? '',
  }))
  const [birthday, setBirthday] = useState(existing?.birthday ?? '')
  const [group, setGroup] = useState<'' | ContactGroup>(existing?.group ?? '')
  const field = (key: TextField) => ({
    value: fields[key],
    onChange: (value: string) => setFields((f) => ({ ...f, [key]: value })),
  })

  const canSave = (['first', 'last', 'mobile', 'work', 'email'] as const).some((k) => fields[k].trim())
  const save = () => {
    const opt = (v: string) => v.trim() || undefined
    const phone = (v: string) => {
      const t = v.trim()
      return /^\d+$/.test(t) ? formatNumber(t) : t || undefined
    }
    const values = {
      first: fields.first.trim(),
      last: fields.last.trim(),
      mobile: phone(fields.mobile),
      work: phone(fields.work),
      email: opt(fields.email),
      company: opt(fields.company),
      birthday: birthday || undefined,
      group: group || undefined,
    }
    if (existing) contactsStore.set((cs) => cs.map((c) => (c.id === existing.id ? { ...c, ...values } : c)))
    else contactsStore.set((cs) => [...cs, { id: newId(), ...values }])
    back()
  }

  return (
    <div className="app-page people-page">
      <div className="people-small-title">{existing ? 'edit contact' : 'new contact'}</div>
      <div className="people-scroll people-edit">
        <div className="people-edit-pic">
          <ContactPicture contact={{ id: existing?.id ?? 'new', first: fields.first, last: fields.last }} size={99} />
        </div>
        <TextBox header="first name" {...field('first')} autoCapitalize="words" />
        <TextBox header="last name" {...field('last')} autoCapitalize="words" />
        <TextBox header="mobile phone" type="tel" inputMode="tel" {...field('mobile')} />
        <TextBox header="work phone" type="tel" inputMode="tel" {...field('work')} />
        <TextBox header="email" type="email" inputMode="email" {...field('email')} />
        <TextBox header="company" {...field('company')} />
        {birthday ? (
          <>
            <DatePicker header="birthday" value={parseIsoDate(birthday)} onChange={(d) => setBirthday(isoDate(d))} />
            <AddLink onTap={() => setBirthday('')}>remove birthday</AddLink>
          </>
        ) : (
          <AddLink onTap={() => setBirthday('1990-01-01')}>+ birthday</AddLink>
        )}
        <ListPicker header="group" options={GROUP_OPTIONS} value={group} onChange={setGroup} />
      </div>
      <AppBar
        buttons={[
          { icon: 'save', label: 'save', onTap: save, disabled: !canSave },
          { icon: 'close', label: 'cancel', onTap: back },
        ]}
      />
    </div>
  )
}
