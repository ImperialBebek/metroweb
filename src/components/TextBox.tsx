import { useId, type InputHTMLAttributes, type Ref, type TextareaHTMLAttributes } from 'react'

type Own = {
  header?: string
  value: string
  onChange: (value: string) => void
  // Goes on the field wrapper, so a page can place the box in its own layout.
  className?: string
}

type SingleLineProps = Own & {
  multiline?: false
  // Enter leaves the box, which closes a phone's keyboard.
  blurOnEnter?: boolean
  ref?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, keyof Own>

type MultiLineProps = Own & {
  multiline: true
  ref?: Ref<HTMLTextAreaElement>
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof Own>

export type TextBoxProps = SingleLineProps | MultiLineProps

// PhoneTextBox from System.Windows.xaml, with the subtle header the phone's forms put above it.
export function TextBox(props: TextBoxProps) {
  const generated = useId()
  const id = props.id ?? generated
  return (
    <div className={props.className ? `textbox-field ${props.className}` : 'textbox-field'}>
      {props.header && (
        <label className="textbox-header" htmlFor={id}>
          {props.header}
        </label>
      )}
      {props.multiline ? <MultiLine {...props} id={id} /> : <SingleLine {...props} id={id} />}
    </div>
  )
}

function SingleLine({
  header: _header,
  className: _className,
  multiline: _multiline,
  blurOnEnter,
  value,
  onChange,
  onKeyDown,
  ...rest
}: SingleLineProps) {
  return (
    <input
      autoComplete="off"
      spellCheck={false}
      {...rest}
      className="textbox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (blurOnEnter && e.key === 'Enter' && !e.defaultPrevented) e.currentTarget.blur()
      }}
    />
  )
}

function MultiLine({ header: _header, className: _className, multiline: _multiline, value, onChange, ...rest }: MultiLineProps) {
  return <textarea {...rest} className="textbox" data-multiline value={value} onChange={(e) => onChange(e.target.value)} />
}
