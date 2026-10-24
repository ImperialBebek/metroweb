export type BinaryOp = '+' | '−' | '×' | '÷' | '^'
export type UnaryFn =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'ln'
  | 'log'
  | 'sqrt'
  | 'square'
  | 'reciprocal'
  | 'factorial'
  | 'percent'
  | 'negate'

export type Token = { kind: 'num'; value: number } | { kind: 'op'; op: BinaryOp } | { kind: 'open' } | { kind: 'close' }

export class CalcError extends Error {}

const PRECEDENCE: Record<BinaryOp, number> = { '+': 1, '−': 1, '×': 2, '÷': 2, '^': 3 }
const MAX_DIGITS = 16

function check(value: number): number {
  if (!Number.isFinite(value)) throw new CalcError('Overflow')
  // Hide floating-point noise such as 0.1 + 0.2 = 0.30000000000000004.
  return Object.is(value, -0) ? 0 : Number(value.toPrecision(15))
}

function binary(op: BinaryOp, a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      if (b === 0) throw new CalcError('Cannot divide by zero')
      return a / b
    case '^':
      return Math.pow(a, b)
  }
}

// Shunting-yard evaluation with the usual precedence; ^ is right-associative
// and unclosed brackets are closed at the end.
export function evaluate(tokens: Token[]): number {
  const values: number[] = []
  const ops: (BinaryOp | '(')[] = []
  const apply = () => {
    const op = ops.pop() as BinaryOp
    const b = values.pop()
    const a = values.pop()
    if (a === undefined || b === undefined) throw new CalcError('Invalid input')
    values.push(check(binary(op, a, b)))
  }
  for (const t of tokens) {
    if (t.kind === 'num') values.push(t.value)
    else if (t.kind === 'open') ops.push('(')
    else if (t.kind === 'close') {
      while (ops.length && ops[ops.length - 1] !== '(') apply()
      ops.pop()
    } else {
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top === '(') break
        const higher = PRECEDENCE[top] > PRECEDENCE[t.op] || (PRECEDENCE[top] === PRECEDENCE[t.op] && t.op !== '^')
        if (!higher) break
        apply()
      }
      ops.push(t.op)
    }
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') ops.pop()
    else apply()
  }
  if (values.length !== 1) throw new CalcError('Invalid input')
  return check(values[0])
}

function factorial(n: number): number {
  if (n < 0 || n > 170 || !Number.isInteger(n)) throw new CalcError('Invalid input')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

export function unary(fn: UnaryFn, x: number, degrees: boolean, percentBase?: number): number {
  const rad = degrees ? (x * Math.PI) / 180 : x
  // Snap results like sin(180°) that should be exactly zero.
  const trig = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v)
  switch (fn) {
    case 'sin':
      return check(trig(Math.sin(rad)))
    case 'cos':
      return check(trig(Math.cos(rad)))
    case 'tan':
      if (trig(Math.cos(rad)) === 0) throw new CalcError('Invalid input')
      return check(trig(Math.tan(rad)))
    case 'ln':
      if (x <= 0) throw new CalcError('Invalid input')
      return check(Math.log(x))
    case 'log':
      if (x <= 0) throw new CalcError('Invalid input')
      return check(Math.log10(x))
    case 'sqrt':
      if (x < 0) throw new CalcError('Invalid input')
      return check(Math.sqrt(x))
    case 'square':
      return check(x * x)
    case 'reciprocal':
      if (x === 0) throw new CalcError('Cannot divide by zero')
      return check(1 / x)
    case 'factorial':
      return check(factorial(x))
    case 'percent':
      return check(percentBase === undefined ? x / 100 : (percentBase * x) / 100)
    case 'negate':
      return -x
  }
}

export function format(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e16 || abs < 1e-9) {
    const [mantissa, exponent] = value.toExponential(9).split('e')
    return `${mantissa.replace(/\.?0+$/, '')}e${exponent}`
  }
  return String(Number(value.toPrecision(15)))
}

// Thousands separators for display; the raw entry string stays ungrouped.
export function group(text: string): string {
  if (text.includes('e')) return text
  const negative = text.startsWith('-')
  const [int, frac] = (negative ? text.slice(1) : text).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (negative ? '-' : '') + grouped + (frac !== undefined ? `.${frac}` : '')
}

export function tokensText(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.kind === 'num') return group(format(t.value))
      if (t.kind === 'op') return ` ${t.op} `
      return t.kind === 'open' ? '(' : ')'
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CalcState {
  tokens: Token[]
  // The number shown in the display, as typed.
  entry: string
  // The entry is an operand the expression hasn't consumed yet.
  pending: boolean
  // The next digit starts a new entry instead of appending.
  fresh: boolean
  error: string | null
  // The finished expression, shown above the result after "=".
  history: string
}

export const INITIAL: CalcState = { tokens: [], entry: '0', pending: false, fresh: true, error: null, history: '' }

export type CalcAction =
  | { type: 'digit'; digit: string }
  | { type: 'op'; op: BinaryOp }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'equals' }
  | { type: 'unary'; fn: UnaryFn; degrees: boolean }
  | { type: 'value'; value: number }
  | { type: 'backspace' }
  | { type: 'clear' }

const last = (tokens: Token[]) => tokens[tokens.length - 1]
const num = (entry: string): Token => ({ kind: 'num', value: Number(entry) })
const openCount = (tokens: Token[]) =>
  tokens.reduce((n, t) => n + (t.kind === 'open' ? 1 : t.kind === 'close' ? -1 : 0), 0)

function step(state: CalcState, action: CalcAction): CalcState {
  const { tokens, entry, pending } = state
  const tail = last(tokens)
  switch (action.type) {
    case 'digit': {
      const d = action.digit
      if (state.fresh) return { ...state, entry: d === '.' ? '0.' : d, pending: true, fresh: false, history: '' }
      if (d === '.' && entry.includes('.')) return state
      if (entry.replace(/[-.]/g, '').length >= MAX_DIGITS) return state
      const next = entry === '0' && d !== '.' ? d : entry === '-0' && d !== '.' ? `-${d}` : entry + d
      return { ...state, entry: next, pending: true }
    }
    case 'op': {
      let next = tokens
      if (pending || tokens.length === 0) next = [...tokens, num(entry)]
      else if (tail?.kind === 'op') next = tokens.slice(0, -1)
      else if (tail?.kind === 'open') return state
      return { ...state, tokens: [...next, { kind: 'op', op: action.op }], pending: false, fresh: true, history: '' }
    }
    case 'open': {
      const prefix: Token[] = pending || tail?.kind === 'close' ? [...(pending ? [num(entry)] : []), { kind: 'op', op: '×' }] : []
      return { ...state, tokens: [...tokens, ...prefix, { kind: 'open' }], pending: false, fresh: true, history: '' }
    }
    case 'close': {
      if (openCount(tokens) === 0 || !(pending || tail?.kind === 'close')) return state
      const next: Token[] = [...tokens, ...(pending ? [num(entry)] : []), { kind: 'close' }]
      return { ...state, tokens: next, entry: format(evaluateSubexpression(next)), pending: false, fresh: true }
    }
    case 'equals': {
      if (tokens.length === 0 && !pending) return state
      const needsOperand = pending || tokens.length === 0 || tail?.kind === 'op' || tail?.kind === 'open'
      const full: Token[] = [...tokens, ...(needsOperand ? [num(entry)] : [])]
      for (let i = openCount(full); i > 0; i--) full.push({ kind: 'close' })
      const result = evaluate(full)
      return { tokens: [], entry: format(result), pending: false, fresh: true, error: null, history: `${tokensText(full)} =` }
    }
    case 'unary': {
      let base: number | undefined
      if (action.fn === 'percent' && tail?.kind === 'op' && (tail.op === '+' || tail.op === '−')) {
        base = evaluate(tokens.slice(0, -1))
      }
      if (action.fn === 'negate') {
        if (Number(entry) === 0) return state
        return { ...state, entry: entry.startsWith('-') ? entry.slice(1) : `-${entry}`, pending: true }
      }
      const value = unary(action.fn, Number(entry), action.degrees, base)
      return { ...state, entry: format(value), pending: true, fresh: true, history: '' }
    }
    case 'value':
      return { ...state, entry: format(action.value), pending: true, fresh: true, history: '' }
    case 'backspace': {
      if (state.fresh || !pending) return state
      const next = entry.slice(0, -1)
      return { ...state, entry: next === '' || next === '-' ? '0' : next }
    }
    case 'clear':
      return INITIAL
  }
}

// The value of the bracket just closed, shown in the display like the phone does.
function evaluateSubexpression(tokens: Token[]): number {
  let depth = 0
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.kind === 'close') depth++
    if (t.kind === 'open' && --depth === 0) return evaluate(tokens.slice(i + 1, -1))
  }
  return evaluate(tokens)
}

export function reduce(state: CalcState, action: CalcAction): CalcState {
  // Any key after an error starts over (Back/C included).
  const base = state.error ? INITIAL : state
  if (state.error && (action.type === 'clear' || action.type === 'backspace')) return INITIAL
  try {
    return step(base, action)
  } catch (e) {
    if (e instanceof CalcError) return { ...INITIAL, error: e.message }
    throw e
  }
}
