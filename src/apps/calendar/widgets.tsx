import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../components/modal'
import { usePopupLayer } from '../../components/popupLayer'
import { useTilt } from '../../components/useTilt'
import { PhIcon } from '../../icons/PhIcon'
import { useNavigation } from '../../navigation'

// PhoneTextBox: filled while idle, white with an accent border while editing.
export function TextBox({
  header,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  header: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  return (
    <label className="calendar-field">
      <span className="calendar-field-header">{header}</span>
      {multiline ? (
        <textarea
          className="calendar-textbox"
          data-multiline
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="calendar-textbox"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      )}
    </label>
  )
}

export function CheckBox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onToggle)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      ref={ref}
      {...handlers}
      className="calendar-check"
      onClick={(e) => {
        if (e.detail === 0) onToggle()
      }}
    >
      <span className="calendar-check-box" aria-hidden>
        {checked && (
          <PhIcon name="check-bold" size={20} />
        )}
      </span>
    </button>
  )
}

function MessageButton({ children, onTap }: { children: ReactNode; onTap: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onTap)
  return (
    <button
      type="button"
      ref={ref}
      {...handlers}
      className="calendar-msgbox-button"
      onClick={(e) => {
        if (e.detail === 0) onTap()
      }}
    >
      {children}
    </button>
  )
}

// The shell's MessageBox: a panel across the top of a dimmed screen. Back cancels.
export function MessageBox({
  title,
  message,
  confirm,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirm: string
  onConfirm: () => void
  onClose: () => void
}) {
  const layer = usePopupLayer()
  const { registerBackHandler } = useNavigation()
  const onCloseRef = useRef(onClose)
  const panel = useRef<HTMLDivElement>(null)
  // Set once a button is pressed, so a confirm action that calls back() reaches the page.
  const done = useRef(false)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(
    () =>
      registerBackHandler(() => {
        if (done.current) return false
        done.current = true
        onCloseRef.current()
        return true
      }),
    [registerBackHandler],
  )
  useModal(panel)
  if (!layer) return null
  return createPortal(
    <div className="calendar-msgbox-scrim">
      <div className="calendar-msgbox" ref={panel} role="alertdialog" aria-modal aria-label={title}>
        <div className="calendar-msgbox-title">{title}</div>
        <div className="calendar-msgbox-text">{message}</div>
        <div className="calendar-msgbox-buttons">
          <MessageButton
            onTap={() => {
              if (done.current) return
              done.current = true
              onClose()
              onConfirm()
            }}
          >
            {confirm}
          </MessageButton>
          <MessageButton
            onTap={() => {
              if (done.current) return
              done.current = true
              onClose()
            }}
          >
            cancel
          </MessageButton>
        </div>
      </div>
    </div>,
    layer,
  )
}
