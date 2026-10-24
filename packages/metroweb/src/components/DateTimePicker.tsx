import { useState, type ReactNode } from 'react'
import { formatShortDate, formatTimeOfDay } from '../format.ts'
import { AppBar } from './AppBar.tsx'
import { LoopingSelector } from './LoopingSelector.tsx'
import { FullScreenPopup } from './popup.tsx'
import { usePopupClose } from './popupLayer.ts'
import { useTilt } from './useTilt.ts'

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const FIRST_YEAR = 1900
const YEARS = 201

const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate()


// The toolkit DatePicker/TimePicker field: a text-box-styled button showing the value.
function Field({ header, text, onOpen }: { header?: string; text: string; onOpen: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <div className="dt-field">
      {header && <div className="dt-header">{header}</div>}
      <button
        type="button"
        ref={ref}
        {...handlers}
        className="dt-box"
        aria-label={header ? `${header}: ${text}` : text}
        onClick={(e) => {
          if (e.detail === 0) onOpen()
        }}
      >
        {text}
      </button>
    </div>
  )
}

function Item({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <>
      <span className="ls-primary">{primary}</span>
      {secondary && <span className="ls-secondary">{secondary}</span>}
    </>
  )
}

function PickerPage({ title, onDone, children }: { title: string; onDone: () => void; children: ReactNode }) {
  const close = usePopupClose()
  return (
    <div className="app-page">
      <div className="dt-page-title">{title}</div>
      <div className="dt-columns">{children}</div>
      <AppBar
        buttons={[
          {
            icon: 'check',
            label: 'done',
            onTap: () => {
              onDone()
              close()
            },
          },
          { icon: 'close', label: 'cancel', onTap: close },
        ]}
      />
    </div>
  )
}

export function TimePicker({
  header,
  hour,
  minute,
  onChange,
}: {
  header?: string
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Field header={header} text={formatTimeOfDay(hour, minute)} onOpen={() => setOpen(true)} />
      {open && (
        <FullScreenPopup label="Choose time" onClosed={() => setOpen(false)}>
          <TimeColumns hour={hour} minute={minute} onDone={onChange} />
        </FullScreenPopup>
      )}
    </>
  )
}

function TimeColumns({
  hour,
  minute,
  onDone,
}: {
  hour: number
  minute: number
  onDone: (hour: number, minute: number) => void
}) {
  const [h, setH] = useState(hour)
  const [m, setM] = useState(minute)
  const [column, setColumn] = useState(-1)
  const pm = h >= 12
  return (
    <PickerPage title="choose time" onDone={() => onDone(h, m)}>
      <LoopingSelector
        label="Hour"
        count={12}
        value={(h % 12 || 12) - 1}
        onChange={(i) => setH(((i + 1) % 12) + (pm ? 12 : 0))}
        renderItem={(i) => <Item primary={String(i + 1)} />}
        active={column === 0}
        onActivate={() => setColumn(0)}
      />
      <LoopingSelector
        label="Minute"
        count={60}
        value={m}
        onChange={setM}
        renderItem={(i) => <Item primary={String(i).padStart(2, '0')} />}
        active={column === 1}
        onActivate={() => setColumn(1)}
      />
      <LoopingSelector
        label="AM or PM"
        count={2}
        loop={false}
        value={pm ? 1 : 0}
        onChange={(i) => setH((h % 12) + (i === 1 ? 12 : 0))}
        renderItem={(i) => <Item primary={i === 0 ? 'AM' : 'PM'} />}
        active={column === 2}
        onActivate={() => setColumn(2)}
      />
    </PickerPage>
  )
}

export function DatePicker({
  header,
  value,
  onChange,
}: {
  header?: string
  value: Date
  onChange: (date: Date) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Field header={header} text={formatShortDate(value)} onOpen={() => setOpen(true)} />
      {open && (
        <FullScreenPopup label="Choose date" onClosed={() => setOpen(false)}>
          <DateColumns value={value} onDone={onChange} />
        </FullScreenPopup>
      )}
    </>
  )
}

function DateColumns({ value, onDone }: { value: Date; onDone: (date: Date) => void }) {
  const [year, setYear] = useState(value.getFullYear())
  const [month, setMonth] = useState(value.getMonth())
  const [day, setDay] = useState(value.getDate())
  const [column, setColumn] = useState(-1)
  const days = daysIn(year, month)
  const shownDay = Math.min(day, days)
  return (
    <PickerPage
      title="choose date"
      onDone={() => {
        // Keep the time of day of the original value.
        const next = new Date(value)
        next.setFullYear(year, month, shownDay)
        onDone(next)
      }}
    >
      <LoopingSelector
        label="Month"
        count={12}
        value={month}
        onChange={setMonth}
        renderItem={(i) => <Item primary={String(i + 1)} secondary={MONTHS[i]} />}
        active={column === 0}
        onActivate={() => setColumn(0)}
      />
      <LoopingSelector
        label="Day"
        count={days}
        value={shownDay - 1}
        onChange={(i) => setDay(i + 1)}
        renderItem={(i) => (
          <Item primary={String(i + 1)} secondary={WEEKDAYS[new Date(year, month, i + 1).getDay()]} />
        )}
        active={column === 1}
        onActivate={() => setColumn(1)}
      />
      <LoopingSelector
        label="Year"
        count={YEARS}
        loop={false}
        value={year - FIRST_YEAR}
        onChange={(i) => setYear(FIRST_YEAR + i)}
        renderItem={(i) => <Item primary={String(FIRST_YEAR + i)} />}
        active={column === 2}
        onActivate={() => setColumn(2)}
      />
    </PickerPage>
  )
}
