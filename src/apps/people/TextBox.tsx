import { useId, type InputHTMLAttributes } from 'react'
import './people.css'

type TextBoxProps = {
  header?: string
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

// PhoneTextBox: a filled box at rest, and the edit background with an accent border while focused.
export function TextBox({ header, value, onChange, ...rest }: TextBoxProps) {
  const id = useId()
  return (
    <div className="people-field">
      {header && (
        <label className="people-field-header" htmlFor={id}>
          {header}
        </label>
      )}
      <input
        id={id}
        className="people-textbox"
        autoComplete="off"
        spellCheck={false}
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
