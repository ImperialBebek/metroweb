import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { AppBar } from '../../components/AppBar'
import { persistentStore, useStore } from '../../data/persist'
import { PageStack } from '../../navigation'
import type { AppProps } from '../types'
import './calculator.css'
import { group, INITIAL, reduce, tokensText, type BinaryOp, type CalcAction, type UnaryFn } from './engine'

interface CalculatorPrefs {
  scientific: boolean
  degrees: boolean
  memory: number | null
}

const prefsStore = persistentStore<CalculatorPrefs>('calculator', () => ({ scientific: false, degrees: true, memory: null }))

type Kind = 'digit' | 'op' | 'fn' | 'equals'

interface Key {
  label: string
  name?: string
  kind: Kind
  wide?: boolean
  press: () => void
}

export function CalculatorApp({ onExit, handle }: AppProps) {
  return <PageStack enter initialRoute="main" onExit={onExit} handle={handle} render={() => <Calculator />} />
}

function Calculator() {
  const prefs = useStore(prefsStore)
  const [state, dispatch] = useReducer(reduce, INITIAL)
  const setPrefs = (patch: Partial<CalculatorPrefs>) => prefsStore.set((p) => ({ ...p, ...patch }))
  const fn = (name: UnaryFn) => () => dispatch({ type: 'unary', fn: name, degrees: prefs.degrees })
  const op = (name: BinaryOp) => () => dispatch({ type: 'op', op: name })
  const digit = (d: string): Key => ({ label: d, kind: 'digit', press: () => dispatch({ type: 'digit', digit: d }) })
  const current = () => (state.error ? 0 : Number(state.entry))

  const standard: Key[] = [
    { label: 'C', name: 'Clear', kind: 'fn', press: () => dispatch({ type: 'clear' }) },
    { label: '⌫', name: 'Backspace', kind: 'fn', press: () => dispatch({ type: 'backspace' }) },
    { label: '±', name: 'Change sign', kind: 'fn', press: fn('negate') },
    { label: '÷', name: 'Divide', kind: 'op', press: op('÷') },
    digit('7'),
    digit('8'),
    digit('9'),
    { label: '×', name: 'Multiply', kind: 'op', press: op('×') },
    digit('4'),
    digit('5'),
    digit('6'),
    { label: '−', name: 'Minus', kind: 'op', press: op('−') },
    digit('1'),
    digit('2'),
    digit('3'),
    { label: '+', name: 'Plus', kind: 'op', press: op('+') },
    { ...digit('0'), wide: true },
    { label: '.', name: 'Decimal point', kind: 'digit', press: () => dispatch({ type: 'digit', digit: '.' }) },
    { label: '=', name: 'Equals', kind: 'equals', press: () => dispatch({ type: 'equals' }) },
  ]

  const scientific: Key[] = [
    { label: prefs.degrees ? 'deg' : 'rad', name: 'Angle unit', kind: 'fn', press: () => setPrefs({ degrees: !prefs.degrees }) },
    { label: 'sin', kind: 'fn', press: fn('sin') },
    { label: 'cos', kind: 'fn', press: fn('cos') },
    { label: 'tan', kind: 'fn', press: fn('tan') },
    { label: 'π', name: 'Pi', kind: 'fn', press: () => dispatch({ type: 'value', value: Math.PI }) },
    { label: 'x²', name: 'Square', kind: 'fn', press: fn('square') },
    { label: 'xʸ', name: 'Power', kind: 'fn', press: op('^') },
    { label: '√', name: 'Square root', kind: 'fn', press: fn('sqrt') },
    { label: '1/x', name: 'Reciprocal', kind: 'fn', press: fn('reciprocal') },
    { label: 'e', kind: 'fn', press: () => dispatch({ type: 'value', value: Math.E }) },
    { label: 'ln', kind: 'fn', press: fn('ln') },
    { label: 'log', kind: 'fn', press: fn('log') },
    { label: 'n!', name: 'Factorial', kind: 'fn', press: fn('factorial') },
    { label: '%', name: 'Percent', kind: 'fn', press: fn('percent') },
    { label: '(', name: 'Open bracket', kind: 'fn', press: () => dispatch({ type: 'open' }) },
    { label: 'MC', name: 'Memory clear', kind: 'fn', press: () => setPrefs({ memory: null }) },
    {
      label: 'MR',
      name: 'Memory recall',
      kind: 'fn',
      press: () => prefs.memory !== null && dispatch({ type: 'value', value: prefs.memory }),
    },
    { label: 'M+', name: 'Memory add', kind: 'fn', press: () => setPrefs({ memory: (prefs.memory ?? 0) + current() }) },
    { label: 'M−', name: 'Memory subtract', kind: 'fn', press: () => setPrefs({ memory: (prefs.memory ?? 0) - current() }) },
    { label: ')', name: 'Close bracket', kind: 'fn', press: () => dispatch({ type: 'close' }) },
  ]

  // Keyboard input. Listening in the capture phase lets Backspace delete a
  // digit before the shell treats it as the Back button.
  const degreesRef = useRef(prefs.degrees)
  useLayoutEffect(() => {
    degreesRef.current = prefs.degrees
  }, [prefs.degrees])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const send = (action: CalcAction) => dispatch(action)
      const ops: Record<string, BinaryOp> = { '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', '^': '^' }
      if (/^[0-9]$/.test(e.key) || e.key === '.' || e.key === ',') send({ type: 'digit', digit: e.key === ',' ? '.' : e.key })
      else if (ops[e.key]) send({ type: 'op', op: ops[e.key] })
      else if (e.key === '(') send({ type: 'open' })
      else if (e.key === ')') send({ type: 'close' })
      else if (e.key === '%') send({ type: 'unary', fn: 'percent', degrees: degreesRef.current })
      else if (e.key === 'Enter' || e.key === '=') send({ type: 'equals' })
      else if (e.key === 'Backspace') send({ type: 'backspace' })
      else if (e.key === 'Delete') send({ type: 'clear' })
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const shown = state.error ?? group(state.entry)
  const line = state.tokens.length ? tokensText(state.tokens) : state.history
  // Shrink long numbers so they always fit on one line.
  const fontSize = state.error ? 40 : Math.max(36, Math.min(100, 920 / Math.max(shown.length, 1)))

  return (
    <div className="app-page calculator" data-scientific={prefs.scientific || undefined}>
      <div className="calculator-display" aria-live="polite">
        {prefs.memory !== null && <span className="calculator-memory">M</span>}
        <div className="calculator-expression">{line.length > 40 ? `…${line.slice(-40)}` : line || '\u00a0'}</div>
        <div className="calculator-value" style={{ fontSize }}>
          {shown}
        </div>
      </div>
      {prefs.scientific && (
        <div className="calculator-keys calculator-keys-sci">
          {scientific.map((key) => (
            <CalcKey key={key.label + (key.name ?? '')} k={key} />
          ))}
        </div>
      )}
      <div className="calculator-keys">
        {standard.map((key) => (
          <CalcKey key={key.label} k={key} />
        ))}
      </div>
      <AppBar
        minimized
        menu={[
          { label: prefs.scientific ? 'standard' : 'scientific', onTap: () => setPrefs({ scientific: !prefs.scientific }) },
        ]}
      />
    </div>
  )
}

function CalcKey({ k }: { k: Key }) {
  return (
    <button
      type="button"
      className="calculator-key"
      data-kind={k.kind}
      data-wide={k.wide || undefined}
      aria-label={k.name ?? k.label}
      onClick={k.press}
    >
      {k.label}
    </button>
  )
}
