#!/usr/bin/env node
// check-metro looks through an app built on metroweb for the Metro rules a
// script can see: accent hexes, font weights, rounded corners, click handlers
// on divs, inline easing curves and more. `--help` lists every rule.
//
//   node check-metro.mjs [paths...] [--quiet] [--strict] [--json] [--ignore <pattern>]
//
// It has no dependencies. Stylesheets are read as text; TypeScript and
// JavaScript are parsed with the app's own `typescript` package, and skipped
// with a note when the app doesn't have one.
//
// A finding points at a rule; it isn't always a mistake. Mark a deliberate
// exception with a comment on its line or the line above, naming the rule and
// the reason:  /* metro-ignore accent-hex: the end call button is always red */
// `metro-ignore-file <rule>` anywhere in a file covers the whole file.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const RULES = {
  'accent-hex': {
    level: 'error',
    about: 'one of the 20 accent colours written as hex',
    fix: 'Use var(--wp-accent), with var(--wp-button-base-pressed-foreground) for text on it, so it follows the accent the user picks.',
  },
  'font-weight': {
    level: 'error',
    about: 'font-weight other than normal, and <b> or <strong>',
    fix: 'Choose the weight by family: var(--font-light), var(--font-semilight), var(--font-normal) or var(--font-semibold). Each family has one face, so the browser fakes any other weight.',
  },
  'border-radius': {
    level: 'error',
    about: 'rounded corners',
    fix: 'Keep corners square. Only rings and dots are round, with border-radius: 50%.',
  },
  'viewport-units': {
    level: 'error',
    about: 'vw, vh, dvh and the other viewport units',
    fix: 'Size things in px or %: the screen is 480 px wide and scaled as a whole, so viewport units do not match it. The page around a PhoneFrame can use them.',
  },
  'visibility-visible': {
    level: 'error',
    about: 'visibility: visible',
    fix: 'Use visibility: inherit to undo a hidden. Pages under the top one stay mounted under visibility: hidden, and visible shows this element through the page on top.',
  },
  'click-on-div': {
    level: 'error',
    about: 'onClick on a div, span, li or another element that is not a control',
    fix: 'Make it a <button> with useTilt(onTap): it tilts on press, ignores pans and works from the keyboard.',
  },
  'raw-color': {
    level: 'warning',
    about: 'colours that are not theme variables: hex, rgb(), hsl() and named colours',
    fix: 'Use a --wp-* theme variable, or color-mix() with one, so it follows the theme. A screen that is always dark can set the --wp-* variables on its root.',
  },
  'font-family': {
    level: 'warning',
    about: 'a font-family other than the four Metro families',
    fix: 'Use var(--font-light), var(--font-semilight), var(--font-normal) or var(--font-semibold).',
  },
  'font-size': {
    level: 'warning',
    about: 'font sizes written as numbers',
    fix: "Use a size from the type ramp, var(--size-small) to var(--size-extra-extra-large) in metroweb's tokens.css.",
  },
  shadow: {
    level: 'warning',
    about: 'shadows with a blur, and blur() filters',
    fix: 'Keep it flat: set things apart with space and type size.',
  },
  gradient: {
    level: 'warning',
    about: 'gradients',
    fix: 'Keep it flat: paint with solid theme colours.',
  },
  'animated-property': {
    level: 'warning',
    about: 'transitions, keyframes and animate() calls on anything but transform, translate and opacity',
    fix: 'Animate transform, translate and opacity only.',
  },
  easing: {
    level: 'warning',
    about: 'easing curves written inline: ease, ease-out, cubic-bezier() and linear()',
    fix: 'Take the curve from metroweb: EXPO_OUT_6 for what arrives and EXPO_IN_6 for what leaves, in element.animate() or passed to CSS in a custom property.',
  },
  'reduced-motion': {
    level: 'warning',
    about: 'a file that animates and never checks for reduced motion',
    fix: 'Skip the motion when prefersReducedMotion() is true, or add a @media (prefers-reduced-motion: reduce) block.',
  },
  'click-navigate': {
    level: 'warning',
    about: 'navigate() or back() in an onClick handler',
    fix: 'Navigate from onTap (useTilt, ListItem, Button): onClick loses the tilt and fires at the end of a pan. Keep onClick for the keyboard: if (e.detail === 0) onTap().',
  },
  'raw-input': {
    level: 'warning',
    about: '<input>, <textarea> and <select>',
    fix: "Use TextBox from metroweb, or ToggleSwitch, ListPicker and DatePicker for choices; they carry the phone's states.",
  },
  'native-dialog': {
    level: 'warning',
    about: '<dialog>, alert(), confirm() and prompt()',
    fix: 'Use MessageBox from metroweb.',
  },
  'popup-layer': {
    level: 'warning',
    about: 'createPortal() into document.body or an element looked up in the document',
    fix: 'Render popups into usePopupLayer(), or use FullScreenPopup, so they sit over the page and Back closes them.',
  },
  'back-button': {
    level: 'warning',
    about: 'buttons labelled back or close',
    fix: 'Leave closing to Back, as the phone does: register a handler with useNavigation().registerBackHandler for anything Back should close, and put cancel in the app bar of a form.',
  },
  'date-format': {
    level: 'warning',
    about: 'toLocaleTimeString(), and dates or times formatted without explicit options',
    fix: "Use formatTimeOfDay and formatShortDate from metroweb: the phone's en-US formats, the same in every browser.",
  },
  'ui-text': {
    level: 'warning',
    about: 'exclamation marks and "please" in UI text',
    fix: 'Write UI text without exclamation marks or "please", as the phone does.',
  },
  lowercase: {
    level: 'warning',
    about: 'capitals in titles, pivot headers, list items, buttons and app bar labels',
    fix: "Write these in lower case, except names such as Wi-Fi, Bluetooth and OneNote; mark a name the check doesn't know with metro-ignore. CSS adds the capitals where the phone shows them.",
  },
}

const ACCENTS = new Map(
  Object.entries({
    a4c400: 'Lime', '60a917': 'Green', '008a00': 'Emerald', '00aba9': 'Teal', '1ba1e2': 'Cyan',
    '0050ef': 'Cobalt', '6a00ff': 'Indigo', aa00ff: 'Violet', f472d0: 'Pink', d80073: 'Magenta',
    a20025: 'Crimson', e51400: 'Red', fa6800: 'Orange', f0a30a: 'Amber', e3c800: 'Yellow',
    '825a2c': 'Brown', '6d8764': 'Olive', '647687': 'Steel', '76608a': 'Mauve', '87794e': 'Taupe',
  }),
)

const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
  burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
  darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
  ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
  lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
  mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
  mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
  orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru
  pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/),
)

const GLOBAL_VALUES = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])
const MOVING = new Set(['transform', 'translate', 'rotate', 'scale', 'opacity'])
// Set next to a transform in keyframes: they place it, and move nothing themselves.
const TRANSFORM_SETUP = new Set(['transform-origin', 'transform-box', 'transform-style', 'perspective', 'perspective-origin', 'backface-visibility', 'will-change'])
const COLOR_PROPERTY =
  /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|text-decoration(?:-color)?|text-emphasis(?:-color)?|column-rule(?:-color)?|box-shadow|text-shadow|filter|scrollbar-color|-webkit-text-fill-color|-webkit-text-stroke(?:-color)?)$/
const NUMBER = String.raw`(?:\d+\.?\d*|\.\d+)`
const VIEWPORT_UNIT = new RegExp(String.raw`(?<![\w.#-])-?${NUMBER}(?:vw|vh|vi|vb|vmin|vmax|[dsl]v(?:w|h|i|b|min|max))\b`, 'gi')
const INLINE_EASING = /cubic-bezier\([^)]*\)|(?<![\w-])linear\(|(?<![\w-])ease(?:-in-out|-in|-out)?(?![\w-])/i
const TIME = new RegExp(String.raw`^-?${NUMBER}m?s$`, 'i')
const NOT_A_PROPERTY = /^(?:ease(?:-in-out|-in|-out)?|linear|step-start|step-end|allow-discrete|normal|(?:cubic-bezier|steps|linear|var)\(.*)$/i
// Elements that aren't controls, so a click handler on one has no tilt, no
// keyboard access and no role.
const NOT_CONTROLS = new Set(
  'div span p li ul ol dl dt dd section article header footer main aside nav figure figcaption img picture h1 h2 h3 h4 h5 h6 table thead tbody tr td th svg g path circle rect canvas video'.split(' '),
)
const FIELD_TYPES_LEFT_ALONE = new Set(['hidden', 'file', 'range', 'color'])
const UI_TEXT_PROPS = new Set(['caption', 'message', 'header', 'title', 'subtitle', 'label', 'placeholder'])
const LOWERCASE_PROPS = { Pivot: ['title'], Panorama: ['title'], SettingsPage: ['app', 'title'], ListItem: ['title'] }
const BACK_LABEL = /^(?:back|go back|close|close page|[×✕✖←])$/i
// metroweb's motion helpers start Web Animations, like element.animate().
const MOTION_HELPERS = new Set(['turnstile', 'turnstileFeather', 'nativePageTurn', 'swivel', 'continuum', 'scrimFade', 'slideSheet', 'dropOut', 'hubSwing', 'panoramaIntro', 'featherPage'])
const STYLESHEETS = new Set(['.css', '.scss', '.less', '.pcss'])
const SCRIPTS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const SKIPPED_FOLDERS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage'])

// ---- Command line ----

const options = { json: false, quiet: false, strict: false, ignore: [], paths: [] }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--json') options.json = true
  else if (arg === '--quiet') options.quiet = true
  else if (arg === '--strict') options.strict = true
  else if (arg === '--ignore' || arg.startsWith('--ignore=')) {
    const pattern = arg === '--ignore' ? argv[++i] : arg.slice('--ignore='.length)
    if (!pattern) fail('--ignore needs a pattern.')
    options.ignore.push(pattern)
  } else if (arg === '-h' || arg === '--help') {
    console.log(help())
    process.exit(0)
  } else if (arg.startsWith('-')) fail(`Unknown option ${arg}.`)
  else options.paths.push(arg)
}
if (!options.paths.length) options.paths.push(existsSync('src') ? 'src' : '.')

function fail(message) {
  console.error(`check-metro: ${message} Run it with --help for the options.`)
  process.exit(2)
}

function help() {
  const width = Math.max(...Object.keys(RULES).map((id) => id.length))
  const rules = Object.entries(RULES).map(([id, rule]) => `  ${rule.level.padEnd(8)}${id.padEnd(width + 2)}${rule.about}`)
  return `Usage: node check-metro.mjs [paths...] [options]

Checks the stylesheets, TypeScript and JavaScript under each path (by default
src, or the current folder) for the Metro rules a script can see.

Options:
  --quiet           Report errors only.
  --strict          Exit with 1 on warnings as well as errors.
  --json            Print the findings as JSON.
  --ignore <pat>    Skip paths that contain <pat>, or match it as a glob with
                    * and **. Repeatable.
  -h, --help        Print this.

Errors are rules the phone never breaks; warnings point at code to review.
Mark a deliberate exception on its line or the line above:
  /* metro-ignore <rule>: <why> */

Rules:
${rules.join('\n')}`
}

// ---- Files ----

const ignored = options.ignore.map((pattern) => {
  if (!/[*?]/.test(pattern)) return (path) => path.includes(pattern)
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\/?/g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\0/g, '.*')
  const regex = new RegExp(`(?:^|/)${source}$`)
  return (path) => regex.test(path)
})
const display = (file) => relative(process.cwd(), file).split(sep).join('/') || file

function collect(path, files, explicit) {
  let stat
  try {
    stat = statSync(path)
  } catch {
    fail(`${path} doesn't exist.`)
  }
  if (ignored.some((test) => test(display(path)))) return
  if (stat.isDirectory()) {
    for (const name of readdirSync(path).sort()) {
      if (name.startsWith('.') || SKIPPED_FOLDERS.has(name)) continue
      collect(join(path, name), files, false)
    }
    return
  }
  const ext = extname(path)
  const generated = /\.d\.[mc]?ts$|\.min\./.test(path)
  if (STYLESHEETS.has(ext) || (SCRIPTS.has(ext) && (explicit || !generated))) files.push(path)
}

const files = []
for (const path of options.paths) collect(resolve(path), files, true)

function loadTypeScript() {
  const from = [process.cwd(), ...options.paths.map((p) => (existsSync(p) && statSync(p).isDirectory() ? p : dirname(p)))]
  for (const dir of from) {
    try {
      return createRequire(join(resolve(dir), 'noop.js'))('typescript')
    } catch {
      // Try the next place.
    }
  }
  return null
}
const scripts = files.filter((f) => SCRIPTS.has(extname(f)))
const ts = scripts.length ? loadTypeScript() : null

// ---- Findings ----

const findings = []
const seen = new Set()

function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
  return starts
}

function position(starts, index) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= index) lo = mid
    else hi = mid - 1
  }
  return { line: lo + 1, column: index - starts[lo] + 1 }
}

// metro-ignore covers its own line and the next; -next-line only the next;
// -file the whole file. With no rule names it covers every rule.
function ignoresIn(text) {
  const lines = new Map()
  const whole = new Set()
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/metro-ignore(-next-line|-file)?\b(.*)/g)) {
      const rules = []
      for (const token of m[2].trim().split(/[\s,]+/)) {
        const id = token.replace(/[^a-z-]+$/, '')
        if (!RULES[id]) break
        rules.push(id)
      }
      const names = rules.length ? rules : ['*']
      const add = (n) => {
        const set = lines.get(n) ?? new Set()
        names.forEach((r) => set.add(r))
        lines.set(n, set)
      }
      if (m[1] === '-file') names.forEach((r) => whole.add(r))
      else if (m[1] === '-next-line') add(i + 2)
      else {
        add(i + 1)
        add(i + 2)
      }
    }
  })
  return (rule, line) => whole.has('*') || whole.has(rule) || Boolean(lines.get(line)?.has('*') || lines.get(line)?.has(rule))
}

function reporter(file, text) {
  const starts = lineStarts(text)
  const isIgnored = ignoresIn(text)
  return (rule, index, message) => {
    const key = `${file}\0${rule}\0${index}`
    if (seen.has(key)) return
    seen.add(key)
    const { line, column } = position(starts, index)
    if (isIgnored(rule, line)) return
    findings.push({ file: display(file), line, column, severity: RULES[rule].level, rule, message, fix: RULES[rule].fix })
  }
}

// ---- CSS ----

function splitTop(text, separator) {
  const parts = []
  let depth = 0
  let last = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (depth === 0 && (separator === ' ' ? /\s/.test(c) : c === separator)) {
      parts.push(text.slice(last, i))
      last = i + 1
    }
  }
  parts.push(text.slice(last))
  return parts.map((p) => p.trim()).filter(Boolean)
}

function closingParen(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return i
  }
  return text.length - 1
}

// Blanks out url(...), and color-mix(...) with a theme variable in it, keeping
// the offsets, so colours inside them aren't reported as raw.
function maskAllowed(value) {
  let out = value
  for (const m of value.matchAll(/\b(url|color-mix)\(/gi)) {
    const end = closingParen(value, m.index + m[0].length - 1)
    const inner = value.slice(m.index, end + 1)
    if (m[1].toLowerCase() === 'url' || /var\(/i.test(inner)) out = out.slice(0, m.index) + ' '.repeat(inner.length) + out.slice(end + 1)
  }
  return out
}

function blurOf(shadows) {
  for (const shadow of splitTop(shadows, ',')) {
    const lengths = splitTop(shadow, ' ').filter((t) => new RegExp(`^-?${NUMBER}(?:px|em|rem)?$`, 'i').test(t))
    if (lengths.length >= 3 && parseFloat(lengths[2]) > 0) return lengths[2]
  }
  return null
}

function transitionProperties(value) {
  const properties = []
  for (const one of splitTop(value, ',')) {
    const tokens = splitTop(one, ' ')
    const property = tokens.find((t) => !TIME.test(t) && !NOT_A_PROPERTY.test(t))
    if (property) properties.push(property.toLowerCase())
    else if (!tokens.some((t) => /^var\(/i.test(t))) properties.push('all')
  }
  return properties
}

// The checks on one declaration, shared by stylesheets and inline styles.
// `at` is the index of the declaration; `valueAt` the index of its value.
function declarationChecker(report, onMotion) {
  function colors(property, value, valueAt) {
    for (const m of value.matchAll(/#([0-9a-f]{6})(?:[0-9a-f]{2})?(?![\w-])/gi)) {
      const name = ACCENTS.get(m[1].toLowerCase())
      if (name) report('accent-hex', valueAt + m.index, `${m[0]} is the ${name} accent`)
    }
    // Setting the theme variables themselves is how a screen forces a theme.
    if (property.startsWith('--wp-')) return
    const masked = maskAllowed(value)
    for (const m of masked.matchAll(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi)) {
      if (m[0].length >= 7 && ACCENTS.has(m[0].slice(1, 7).toLowerCase())) continue
      report('raw-color', valueAt + m.index, `${m[0]} in ${property}`)
    }
    for (const m of masked.matchAll(/(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi)) {
      report('raw-color', valueAt + m.index, `${m[1]}() in ${property}`)
    }
    if (COLOR_PROPERTY.test(property) || property.startsWith('--')) {
      for (const m of masked.matchAll(/(?<![\w#.-])[a-z]+(?![\w(-])/gi)) {
        if (NAMED_COLORS.has(m[0].toLowerCase())) report('raw-color', valueAt + m.index, `${m[0]} in ${property}`)
      }
    }
  }

  // Each property a set of keyframes animates is reported once, not once per frame.
  const keyframed = new Set()

  return function declaration(rawProperty, rawValue, at, valueAt, keyframes = null) {
    const property = rawProperty.trim().toLowerCase()
    const value = String(rawValue).replace(/\s*!important\s*$/i, '').trim()
    const lower = value.toLowerCase()
    if (!value) return
    colors(property, value, valueAt)
    const onlyVar = /^var\(.*\)$/.test(lower)

    if (property === 'font-weight' && !GLOBAL_VALUES.has(lower) && !onlyVar && lower !== 'normal' && lower !== '400') {
      report('font-weight', at, `font-weight: ${value}`)
    }
    if (property === 'font' && !GLOBAL_VALUES.has(lower) && !onlyVar) {
      const tokens = splitTop(lower, ' ')
      if (tokens.some((t) => /^(?:bold|bolder|lighter|[1-9]00)$/.test(t) && t !== '400')) report('font-weight', at, `font: ${value}`)
      if (!/var\(--font-/.test(lower)) report('font-family', at, `font: ${value}`)
      if (tokens.some((t) => new RegExp(`^${NUMBER}(?:px|pt|em|rem)(?:/.*)?$`).test(t))) report('font-size', at, `font: ${value}`)
    }
    if (property === 'font-family' && !GLOBAL_VALUES.has(lower) && !/^var\(--font-[a-z]+\)$/.test(lower)) {
      report('font-family', at, `font-family: ${value}`)
    }
    if (property === 'font-size' && !GLOBAL_VALUES.has(lower) && !/var\(--size-/.test(lower) && !/^(?:0|0px|100%|1em)$/.test(lower)) {
      report('font-size', at, `font-size: ${value}`)
    }
    if (/^border(?:-[a-z]+)*-radius$/.test(property)) {
      const round = lower
        .split(/[\s/]+/)
        .filter(Boolean)
        .some((t) => !/^(?:0+(?:\.0*)?(?:[a-z]+|%)?|50%|100%|var\(.*\)|inherit|initial|unset|revert|revert-layer)$/.test(t))
      if (round) report('border-radius', at, `${property}: ${value}`)
    }
    const viewport = new RegExp(VIEWPORT_UNIT.source, 'gi').exec(value)
    if (viewport) report('viewport-units', valueAt + viewport.index, `${viewport[0].trim()} in ${property}`)
    if (property === 'visibility' && lower === 'visible') report('visibility-visible', at, 'visibility: visible')
    if (property === 'box-shadow' || property === 'text-shadow') {
      const blur = blurOf(lower)
      if (blur) report('shadow', at, `${property} with a ${blur} blur`)
    }
    if (property === 'filter' || property === 'backdrop-filter' || property === '-webkit-backdrop-filter') {
      for (const m of lower.matchAll(/drop-shadow\(/g)) {
        const blur = blurOf(lower.slice(m.index + m[0].length, closingParen(lower, m.index + m[0].length - 1)))
        if (blur) report('shadow', valueAt + m.index, `drop-shadow() with a ${blur} blur`)
      }
      const blur = /(?<![\w-])blur\(/.exec(lower)
      if (blur) report('shadow', valueAt + blur.index, `blur() in ${property}`)
    }
    const gradient = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.exec(value)
    if (gradient && !/^(?:-webkit-)?mask/.test(property)) report('gradient', valueAt + gradient.index, `${gradient[0].slice(0, -1)}() in ${property}`)

    if (property === 'transition' || property === 'transition-property') {
      const list = property === 'transition' ? transitionProperties(value) : splitTop(lower, ',')
      const others = list.filter((p) => p !== 'none' && !MOVING.has(p) && !p.startsWith('--') && !GLOBAL_VALUES.has(p))
      if (others.length) report('animated-property', at, `transition on ${others.join(', ')}`)
    }
    if (keyframes !== null && !MOVING.has(property) && !TRANSFORM_SETUP.has(property) && !['offset', 'animation-timing-function', 'animation-composition'].includes(property) && !property.startsWith('--')) {
      if (!keyframed.has(`${keyframes}\0${property}`)) report('animated-property', at, `@keyframes animate ${property}`)
      keyframed.add(`${keyframes}\0${property}`)
    }
    if (/^(?:transition|animation)(?:-timing-function)?$/.test(property)) {
      const curve = INLINE_EASING.exec(value)
      if (curve) report('easing', valueAt + curve.index, curve[0].toLowerCase() === 'linear(' ? 'an inline linear() curve' : curve[0])
    }
    if (/^(?:transition|transition-property|animation|animation-name)$/.test(property) && !/^(?:none|initial|inherit|unset|revert)$/.test(lower)) {
      onMotion(at)
    }
  }
}

// Declarations in a stylesheet, with offsets into the original text. Comments
// must already be blanked out.
function declarations(source) {
  const found = []
  const preludes = []
  let start = 0
  let quote = null
  let depth = 0
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && (c === '{' || c === ';' || c === '}')) {
      const segment = source.slice(start, i)
      if (c === '{') preludes.push(segment.trim().toLowerCase())
      else {
        const m = /^(\s*)(--[\w-]+|-?[a-zA-Z][\w-]*)(\s*:\s*)([\s\S]*?)\s*$/.exec(segment)
        const descriptors = preludes.some((p) => /^@(?:font-face|property|counter-style|font-feature-values|page)\b/.test(p))
        if (m && !descriptors) {
          const at = start + m[1].length
          found.push({
            property: m[2],
            value: m[4],
            at,
            valueAt: at + m[2].length + m[3].length,
            keyframes: preludes.find((p) => /^@(?:-webkit-)?keyframes\b/.test(p)) ?? null,
          })
        }
        if (c === '}') preludes.pop()
      }
      start = i + 1
    }
  }
  return found
}

const blank = (text) => text.replace(/[^\n]/g, ' ')

function checkStylesheet(file, text) {
  const report = reporter(file, text)
  let source = text.replace(/\/\*[\s\S]*?\*\//g, blank)
  if (/\.(?:scss|less)$/.test(file)) source = source.replace(/(^|[^:])(\/\/[^\n]*)/g, (_, before, comment) => before + blank(comment))
  let firstMotion = null
  const declaration = declarationChecker(report, (at) => (firstMotion ??= at))
  for (const d of declarations(source)) declaration(d.property, d.value, d.at, d.valueAt, d.keyframes)
  if (firstMotion !== null && !/prefers-reduced-motion/i.test(source)) {
    report('reduced-motion', firstMotion, 'animates with no prefers-reduced-motion block in the file')
  }
}

// ---- TypeScript and JavaScript ----

const kebab = (name) =>
  name.startsWith('--') ? name : name.replace(/^(Webkit|Moz|ms|O)(?=[A-Z])/, (m) => `-${m.toLowerCase()}`).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const clip = (text) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 60 ? `${t.slice(0, 57)}...` : t
}

// Names keep their capitals. Words with a capital or digit after the first
// letter (OneNote, Wi-Fi, 4G) are taken as names; these are the common others.
// Days and months aren't: the phone writes them in lower case in headers.
const NAMES = /\b(?:Bluetooth|Internet Explorer|Data Sense|Microsoft|Windows(?: Phone)?|Xbox|Office|Outlook|Skype|Bing|Cortana|Facebook|Twitter|Nokia|Lumia|I)\b/g

// The first word that reads as Title Case (or the whole text, if it is all
// capitals), leaving names out.
function capitalised(original) {
  const text = original.replace(NAMES, ' ')
  const letters = text.replace(/[^\p{L}]/gu, '')
  if (letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return text
  for (const word of text.split(/\s+/)) {
    const w = word.replace(/^[^\p{L}]+/u, '')
    if (/^\p{Lu}/u.test(w) && !/[\p{Lu}\p{N}]/u.test(w.slice(1))) return w
  }
  return null
}

function checkScript(file, text) {
  const report = reporter(file, text)
  const ext = extname(file)
  const kind =
    ext === '.tsx' ? ts.ScriptKind.TSX : ext === '.jsx' ? ts.ScriptKind.JSX : ['.ts', '.mts', '.cts'].includes(ext) ? ts.ScriptKind.TS : ts.ScriptKind.JSX
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  let firstMotion = null
  const motion = (at) => (firstMotion ??= at)
  const declaration = declarationChecker(report, motion)
  const start = (node) => node.getStart(sf)
  const code = (node) => node.getText(sf)

  const propName = (name) => (name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) ? name.text : null)

  // The string values an expression can take, where they are literals.
  function literals(node) {
    if (!node) return []
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [{ text: node.text, at: start(node) + 1 }]
    if (ts.isNumericLiteral(node)) return [{ text: node.text, at: start(node) }]
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
      return [{ text: `-${node.operand.text}`, at: start(node) }]
    }
    if (ts.isTemplateExpression(node)) {
      return [{ text: node.head.text + node.templateSpans.map((s) => `var(--js)${s.literal.text}`).join(''), at: start(node) + 1 }]
    }
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node))) {
      return literals(node.expression)
    }
    if (ts.isJsxExpression(node)) return literals(node.expression)
    if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)]
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      return [...literals(node.left), ...literals(node.right)]
    }
    return []
  }

  function accentHexes(value, at) {
    for (const m of value.matchAll(/#([0-9a-f]{6})(?:[0-9a-f]{2})?(?![\w-])/gi)) {
      const name = ACCENTS.get(m[1].toLowerCase())
      if (name) report('accent-hex', at + m.index, `${m[0]} is the ${name} accent`)
    }
  }

  function uiText(value, at) {
    const bang = /[\p{L}\p{N}]!/u.exec(value)
    if (bang) report('ui-text', at + bang.index + 1, `"!" in "${clip(value)}"`)
    const please = /\bplease\b/i.exec(value)
    if (please) report('ui-text', at + please.index, `"please" in "${clip(value)}"`)
  }

  function lowercase(value, at, where) {
    if (capitalised(value)) report('lowercase', at, `${where} "${clip(value)}"`)
  }

  function styleObject(object) {
    for (const p of object.properties) {
      if (!ts.isPropertyAssignment(p)) continue
      const name = propName(p.name)
      if (name) for (const v of literals(p.initializer)) declaration(kebab(name), v.text, start(p), v.at)
    }
  }

  function element(node) {
    const tag = code(node.tagName)
    const attributes = new Map()
    for (const a of node.attributes.properties) if (ts.isJsxAttribute(a)) attributes.set(code(a.name), a)
    const values = (name) => literals(attributes.get(name)?.initializer)
    const at = start(node)
    const intrinsic = /^[a-z]/.test(tag)

    const onClick = attributes.get('onClick')?.initializer
    if (onClick && intrinsic && NOT_CONTROLS.has(tag)) report('click-on-div', at, `onClick on a <${tag}>`)
    if (onClick) {
      const handler = code(onClick)
      if ((/\b(?:navigate|back)\s*\(/.test(handler) || /^\{\s*(?:navigate|back)\s*\}$/.test(handler)) && !/\bdetail\b/.test(handler)) {
        report('click-navigate', start(onClick), 'navigation in onClick')
      }
    }
    if (intrinsic && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
      const type = values('type')[0]?.text
      if (!FIELD_TYPES_LEFT_ALONE.has(type)) report('raw-input', at, `<${tag}${type ? ` type="${type}"` : ''}>`)
    }
    if (tag === 'dialog') report('native-dialog', at, '<dialog>')
    if (tag === 'b' || tag === 'strong') report('font-weight', at, `<${tag}>`)
    if (intrinsic) {
      for (const name of ['fill', 'stroke', 'color', 'stopColor', 'floodColor', 'lightingColor']) {
        for (const v of values(name)) declaration(kebab(name), v.text, v.at, v.at)
      }
    }
    const style = attributes.get('style')?.initializer
    if (style && ts.isJsxExpression(style) && style.expression && ts.isObjectLiteralExpression(style.expression)) styleObject(style.expression)

    for (const [name, attribute] of attributes) {
      if (UI_TEXT_PROPS.has(name)) for (const v of literals(attribute.initializer)) uiText(v.text, v.at)
      if (['aria-label', 'label', 'title'].includes(name)) {
        for (const v of literals(attribute.initializer)) if (BACK_LABEL.test(v.text.trim())) report('back-button', v.at, `a control labelled "${v.text.trim()}"`)
      }
    }
    for (const name of LOWERCASE_PROPS[tag] ?? []) for (const v of values(name)) lowercase(v.text, v.at, `${tag} ${name}`)
  }

  function jsxText(node) {
    if (node.containsOnlyTriviaWhiteSpaces) return
    const at = node.pos + (node.text.length - node.text.trimStart().length)
    const value = node.text.trim()
    uiText(value, at)
    const parent = ts.isJsxElement(node.parent) ? code(node.parent.openingElement.tagName) : ''
    if (parent === 'Button') lowercase(value, at, 'Button')
    // Only a whole label: the × in {speed}× is a multiplier, not a close button.
    const whole = ts.isJsxElement(node.parent) && node.parent.children.every((c) => c === node || (ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces))
    if ((parent === 'Button' || parent === 'button') && whole && BACK_LABEL.test(value)) report('back-button', at, `a button labelled "${value}"`)
  }

  // Pivot items and panorama sections have header and content; app bar
  // buttons, menu items and message box buttons have a label and no value.
  function object(node) {
    const props = new Map()
    for (const p of node.properties) {
      const name = propName(p.name)
      if (name) props.set(name, p)
    }
    const values = (name) => {
      const p = props.get(name)
      return p && ts.isPropertyAssignment(p) ? literals(p.initializer) : []
    }
    if (props.has('header') && props.has('content')) {
      for (const v of values('header')) {
        lowercase(v.text, v.at, 'header')
        uiText(v.text, v.at)
      }
    }
    if (props.has('label') && !props.has('value') && (props.has('onTap') || props.has('icon') || props.size === 1)) {
      for (const v of values('label')) {
        lowercase(v.text, v.at, 'label')
        uiText(v.text, v.at)
        if (BACK_LABEL.test(v.text.trim())) report('back-button', v.at, `a button labelled "${v.text.trim()}"`)
      }
    }
  }

  function keyframes(node) {
    if (!node) return
    const frames = ts.isArrayLiteralExpression(node) ? node.elements.filter(ts.isObjectLiteralExpression) : ts.isObjectLiteralExpression(node) ? [node] : []
    const reported = new Set()
    for (const frame of frames) {
      for (const p of frame.properties) {
        const name = propName(p.name)
        if (!name) continue
        const property = kebab(name)
        if (!MOVING.has(property) && !TRANSFORM_SETUP.has(property) && !['offset', 'easing', 'composite'].includes(property) && !reported.has(property)) {
          reported.add(property)
          report('animated-property', start(p), `animate() on ${property}`)
        }
        if (ts.isPropertyAssignment(p)) {
          for (const v of literals(p.initializer)) {
            if (property === 'easing') easingLiteral(v)
            else declaration(property, v.text, start(p), v.at)
          }
        }
      }
    }
  }

  function easingLiteral(v) {
    const curve = INLINE_EASING.exec(v.text)
    if (curve) report('easing', v.at + curve.index, curve[0].toLowerCase() === 'linear(' ? 'an inline linear() curve' : curve[0])
  }

  function call(node) {
    const callee = node.expression
    const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : ''
    const target = ts.isPropertyAccessExpression(callee) ? code(callee.expression) : ''
    const at = start(node)
    const [first, second] = node.arguments
    if (name === 'toLocaleTimeString') report('date-format', at, 'toLocaleTimeString()')
    if (name === 'toLocaleDateString' && (!second || /\b(?:hour|minute|timeStyle)\b/.test(code(second)))) {
      report('date-format', at, second ? 'toLocaleDateString() with a time' : 'toLocaleDateString() without options')
    }
    if (target === 'Intl' && name === 'DateTimeFormat') dateTimeFormat(node)
    if (/^(?:alert|confirm|prompt)$/.test(name) && (ts.isIdentifier(callee) || /^(?:window|globalThis|self)$/.test(target))) {
      report('native-dialog', at, `${name}()`)
    }
    if (name === 'createPortal' && second && /^document\.(?:body|getElementById|querySelector)/.test(code(second))) {
      report('popup-layer', at, `createPortal() into ${clip(code(second))}`)
    }
    if (name === 'animate' && ts.isPropertyAccessExpression(callee)) {
      motion(at)
      keyframes(first)
      if (second && ts.isObjectLiteralExpression(second)) {
        for (const p of second.properties) {
          if (propName(p.name) === 'easing' && ts.isPropertyAssignment(p)) literals(p.initializer).forEach(easingLiteral)
        }
      }
    }
    if (MOTION_HELPERS.has(name)) motion(at)
    if (target === 'Object' && name === 'assign' && first && /\.style$/.test(code(first))) {
      node.arguments.slice(1).filter(ts.isObjectLiteralExpression).forEach(styleObject)
    }
    if (name === 'setProperty' && /\.style$/.test(target) && first) {
      const property = literals(first)[0]
      if (property) for (const v of literals(second)) declaration(property.text, v.text, at, v.at)
    }
  }

  function dateTimeFormat(node) {
    const options = node.arguments?.[1]
    if (!options || /\b(?:hour|minute|timeStyle)\b/.test(code(options))) report('date-format', start(node), 'Intl.DateTimeFormat')
  }

  function assignment(node) {
    if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken || !ts.isPropertyAccessExpression(node.left)) return
    const owner = node.left.expression
    if (!ts.isPropertyAccessExpression(owner) || owner.name.text !== 'style') return
    const name = node.left.name.text
    for (const v of literals(node.right)) {
      if (name === 'cssText') {
        for (const d of declarations(`x{${v.text}}`)) declaration(d.property, d.value, v.at - 2 + d.at, v.at - 2 + d.valueAt)
      } else declaration(kebab(name), v.text, start(node), v.at)
    }
  }

  const cssPropertiesType = (type) => Boolean(type && /\bCSSProperties\b/.test(code(type)))

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      accentHexes(node.text, start(node) + 1)
    } else if (ts.isJsxText(node)) {
      accentHexes(node.text, node.pos)
      jsxText(node)
    } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) element(node)
    else if (ts.isObjectLiteralExpression(node)) object(node)
    else if (ts.isCallExpression(node)) call(node)
    else if (ts.isNewExpression(node) && code(node.expression) === 'Intl.DateTimeFormat') dateTimeFormat(node)
    else if (ts.isBinaryExpression(node)) assignment(node)
    else if (ts.isVariableDeclaration(node) && cssPropertiesType(node.type) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      styleObject(node.initializer)
    } else if ((ts.isAsExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node))) && cssPropertiesType(node.type) && ts.isObjectLiteralExpression(node.expression)) {
      styleObject(node.expression)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  if (firstMotion !== null && !/reduced-?motion/i.test(text)) report('reduced-motion', firstMotion, 'animates and never checks prefersReducedMotion()')
}

// ---- Run ----

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  if (STYLESHEETS.has(extname(file))) checkStylesheet(file, text)
  else if (ts) checkScript(file, text)
}

const shown = options.quiet ? findings.filter((f) => f.severity === 'error') : findings
shown.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column)
const errors = findings.filter((f) => f.severity === 'error').length
const warnings = findings.length - errors

if (options.json) console.log(JSON.stringify(shown, null, 2))
else {
  const width = Math.max(0, ...shown.map((f) => f.rule.length))
  for (const f of shown) console.log(`${f.file}:${f.line}:${f.column}  ${f.severity.padEnd(7)}  ${f.rule.padEnd(width)}  ${f.message}`)
  const fired = [...new Set(shown.map((f) => f.rule))]
  if (fired.length) {
    console.log('\nHow to fix:')
    for (const id of fired) console.log(`  ${id.padEnd(width)}  ${RULES[id].fix}`)
    console.log('')
  }
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  const checked = `${count(files.length - (ts ? 0 : scripts.length), 'file')} checked`
  const fileCount = new Set(shown.map((f) => f.file)).size
  if (!shown.length) console.log(`No problems found (${checked}).`)
  else if (options.quiet) console.log(`${count(errors, 'error')} in ${count(fileCount, 'file')} (${checked}).`)
  else console.log(`${count(errors, 'error')} and ${count(warnings, 'warning')} in ${count(fileCount, 'file')} (${checked}).`)
}
if (scripts.length && !ts) {
  console.error(
    `check-metro: TypeScript isn't installed here, so it skipped ${scripts.length} script ${scripts.length === 1 ? 'file' : 'files'}. Install it (npm install -D typescript) or run from the app's root.`,
  )
}
process.exit(errors || (options.strict && warnings) ? 1 : 0)
