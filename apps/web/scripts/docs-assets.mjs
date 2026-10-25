// Regenerates the pictures in docs/design/assets (screenshots, measurement
// diagrams, motion strips) and the footage comparison in docs/evidence/private/footage.
//
//   npm run docs:assets            everything
//   npm run docs:assets -- strips  one group: shots | diagrams | strips | footage
//
// Needs a Playwright Chromium (npx playwright-core install chromium-headless-shell),
// or CHROMIUM_PATH pointing at one. The footage comparison also needs the WP8
// Games hub frames (WP8_FOOTAGE_FRAMES, see docs/evidence/footage/README.md).
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(app, '../..')
const OUT = {
  shots: join(repo, 'docs/design/assets/screenshots'),
  diagrams: join(repo, 'docs/design/assets/diagrams'),
  strips: join(repo, 'docs/design/assets/strips'),
  footage: join(repo, 'docs/evidence/private/footage'),
}
const FOOTAGE_FRAMES = process.env.WP8_FOOTAGE_FRAMES ?? '/tmp/wp8-vid/g1'
// A WVGA phone: 32px tray + 768px page, plus the 64px software nav bar.
const VIEWPORT = { width: 480, height: 864 }
const FIXED_TIME = new Date('2026-10-19T09:41:00')
// Animations are filmed at a tenth of their speed so each screenshot lands
// within a few ms of animation time.
const RATE = 0.1
const ACTIVE = '.page-host[data-active="true"] '

const groups = process.argv.slice(2)
const wanted = (group) => groups.length === 0 || groups.includes(group)
const warnings = []
const warn = (message) => {
  warnings.push(message)
  console.warn('  ! ' + message)
}

const server = await createServer({ root: app, logLevel: 'error', server: { port: 5199 } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH && { executablePath: process.env.CHROMIUM_PATH }),
  args: ['--autoplay-policy=no-user-gesture-required'],
})

async function open({ settings = {}, motion = false } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: motion ? 'no-preference' : 'reduce',
  })
  await context.addInitScript((settings) => {
    if (sessionStorage.getItem('docs-seeded')) return
    sessionStorage.setItem('docs-seeded', '1')
    localStorage.clear()
    localStorage.setItem('wp8-settings', JSON.stringify(settings))
  }, settings)
  const page = await context.newPage()
  page.on('pageerror', (e) => warn(`page error: ${e.message}`))
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  return page
}

const settle = (page, ms = 600) => page.waitForTimeout(ms)
const tap = async (page, selector) => {
  try {
    await page.locator(selector).first().click({ timeout: 5000 })
  } catch {
    throw new Error('could not tap ' + selector)
  }
  await settle(page)
}
const fromAppList = async (page, title) => {
  await tap(page, '.start-arrow')
  await tap(page, `.applist-item:has-text("${title}")`)
}
// Queues an album through the app's own player module (the dev server hands
// out the same module instance the app uses).
const queueMusic = (page) =>
  page.evaluate(async () => {
    const music = await import('/src/data/music.ts')
    const player = await import('/src/data/player.ts')
    const album = music.ALBUMS.find((a) => a.id.includes('nocturne')) ?? music.ALBUMS[0]
    player.playTracks(music.TRACKS.filter((t) => t.album === album.id))
    player.pause()
  })

async function shot(page, name, dir = OUT.shots) {
  await page.locator('.screen').screenshot({ path: join(dir, name + '.png') })
  console.log('  ' + name)
}

async function attempt(name, fn) {
  try {
    await fn()
  } catch (e) {
    warn(`${name}: ${e.message.split('\n')[0]}`)
  }
}

// ---------- measurement overlays ----------

// [x, y, w, h] of the first match, in screen (logical) px.
const rect = (page, selector) =>
  page.evaluate((selector) => {
    const el = document.querySelector(selector)
    const screen = document.querySelector('.screen')
    if (!el || !screen) throw new Error('no element ' + selector)
    const r = el.getBoundingClientRect()
    const s = screen.getBoundingClientRect()
    return [r.left - s.left, r.top - s.top, r.width, r.height].map((v) => Math.round(v * 10) / 10)
  }, selector)

const fmt = (n) => String(Math.round(n * 1000) / 1000)

// marks: { box: [x,y,w,h], label, color?, at?: 'above'|'below'|'inside', dx?, dy? }
//      | { line: [x1,y1,x2,y2], label, color? }
async function annotate(page, marks) {
  await page.evaluate((marks) => {
    const screen = document.querySelector('.screen')
    const layer = document.createElement('div')
    layer.dataset.docsOverlay = ''
    layer.style.cssText =
      'position:absolute;inset:0;z-index:1000;pointer-events:none;font:700 11px/1.25 ui-monospace,Menlo,monospace'
    const chip = (text, color, x, y) => {
      const el = document.createElement('div')
      el.textContent = text
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;padding:1px 4px;background:rgba(0,0,0,.82);color:${color};white-space:nowrap`
      layer.appendChild(el)
      const w = el.offsetWidth
      if (x + w > 476) el.style.left = `${Math.max(4, 476 - w)}px`
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '480')
    svg.setAttribute('height', String(screen.offsetHeight))
    svg.style.cssText = 'position:absolute;inset:0;overflow:visible'
    layer.appendChild(svg)
    const line = (x1, y1, x2, y2, color, dash = '') => {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      Object.entries({ x1, y1, x2, y2, stroke: color, 'stroke-width': 1.5, 'stroke-dasharray': dash }).forEach(([k, v]) =>
        l.setAttribute(k, String(v)),
      )
      svg.appendChild(l)
    }
    for (const m of marks) {
      const color = m.color ?? '#00e5ff'
      if (m.box) {
        const [x, y, w, h] = m.box
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        Object.entries({ x: x + 0.75, y: y + 0.75, width: w - 1.5, height: h - 1.5, fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }).forEach(([k, v]) =>
          r.setAttribute(k, String(v)),
        )
        svg.appendChild(r)
        const at = m.at ?? 'inside'
        const dx = m.dx ?? 0
        const dy = m.dy ?? 0
        chip(m.label, color, x + 2 + dx, (at === 'above' ? y - 17 : at === 'below' ? y + h + 2 : y + 3) + dy)
      } else {
        const [x1, y1, x2, y2] = m.line
        line(x1, y1, x2, y2, color)
        const vertical = x1 === x2
        const tick = (x, y) => (vertical ? line(x - 5, y, x + 5, y, color) : line(x, y - 5, x, y + 5, color))
        tick(x1, y1)
        tick(x2, y2)
        chip(m.label, color, vertical ? x1 + 6 : (x1 + x2) / 2 - 10, vertical ? (y1 + y2) / 2 - 8 : y1 + 4)
      }
    }
    screen.appendChild(layer)
  }, marks)
}
const clearOverlay = (page) => page.evaluate(() => document.querySelector('[data-docs-overlay]')?.remove())

async function diagram(page, name, marks) {
  await annotate(page, marks)
  await shot(page, name, OUT.diagrams)
  await clearOverlay(page)
}

// ---------- motion strips ----------

async function film(page, { action, times, clip, startWhen }) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE })
  await action()
  if (startWhen) await startWhen()
  const t0 = Date.now()
  const frames = []
  for (const t of times) {
    const wait = t0 + t / RATE - Date.now()
    if (wait > 0) await page.waitForTimeout(wait)
    const at = Math.round((Date.now() - t0) * RATE)
    const buffer = await page.screenshot({ clip: clip ?? { x: 0, y: 0, ...VIEWPORT }, type: 'jpeg', quality: 85 })
    frames.push({ t: at, src: 'data:image/jpeg;base64,' + buffer.toString('base64') })
  }
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  await cdp.detach()
  await page.waitForTimeout(1200)
  return frames
}

const every = (step, count) => Array.from({ length: count }, (_, i) => i * step)

async function compose(file, title, rows, width = 150) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html =
    `<body style="margin:0;background:#111;color:#ddd;font:12px/1.35 system-ui,sans-serif">` +
    `<div id="sheet" style="display:inline-block;padding:10px">` +
    `<div style="font-weight:600;margin-bottom:8px">${esc(title)}</div>` +
    rows
      .map(
        (row) =>
          (row.label ? `<div style="margin:0 0 4px;color:#aaa">${esc(row.label)}</div>` : '') +
          `<div style="display:flex;gap:4px;margin-bottom:10px">` +
          row.frames
            .map(
              (f) =>
                `<figure style="margin:0"><img src="${f.src}" width="${width}" style="display:block;outline:1px solid #333">` +
                `<figcaption style="margin-top:2px;font-variant-numeric:tabular-nums">${f.t} ms</figcaption></figure>`,
            )
            .join('') +
          `</div>`,
      )
      .join('') +
    `</div></body>`
  const page = await browser.newPage({ viewport: { width: 2600, height: 400 } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.locator('#sheet').screenshot({ path: file, type: 'jpeg', quality: 82 })
  await page.close()
  console.log('  ' + file.replace(repo + '/', ''))
}

// Frames of a Start tile mid-flip; the shell starts flips on its own timers.
async function filmTileFlip(page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE })
  const handle = await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.tile .tile-clip')].find((el) => {
        const r = el.getBoundingClientRect()
        return r.bottom < innerHeight - 64 && el.getAnimations().length > 0
      }),
    null,
    { timeout: 30000, polling: 20 },
  )
  const box = await handle.evaluate((el) => {
    const r = el.closest('.tile').getBoundingClientRect()
    return { x: Math.max(0, r.left - 24), y: Math.max(0, r.top - 24), width: Math.min(480, r.width + 48), height: r.height + 48 }
  })
  const t0 = Date.now()
  const frames = []
  for (const t of every(50, 16)) {
    const wait = t0 + t / RATE - Date.now()
    if (wait > 0) await page.waitForTimeout(wait)
    const at = Math.round((Date.now() - t0) * RATE)
    const buffer = await page.screenshot({ clip: box, type: 'jpeg', quality: 85 })
    frames.push({ t: at, src: 'data:image/jpeg;base64,' + buffer.toString('base64') })
  }
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  await cdp.detach()
  return frames
}

// Hub intro offsets, from the first frame the hub shows in the footage.
const HUB_TIMES = [0, 67, 133, 200, 267, 333, 400, 500, 600, 767, 1000, 1333]
let hubFrames = null
async function filmHubIntro() {
  if (hubFrames) return hubFrames
  const page = await open({ motion: true })
  await queueMusic(page)
  hubFrames = await film(page, {
    action: async () => {
      await page.locator('.start-arrow').click()
      await page.waitForTimeout(3000)
      await page.locator('.applist-item:has-text("Music+Videos")').click()
    },
    startWhen: () => page.waitForSelector('.app-host .pano', { timeout: 30000, state: 'attached' }),
    times: HUB_TIMES,
  })
  await page.context().close()
  return hubFrames
}

for (const dir of Object.values(OUT)) mkdirSync(dir, { recursive: true })

// ---------- screenshots and diagrams ----------

if (wanted('shots') || wanted('diagrams')) {
  console.log('screenshots and diagrams')
  const page = await open()
  await queueMusic(page)
  await settle(page)
  if (wanted('shots')) await shot(page, 'start-dark')
  if (wanted('diagrams')) {
    const tray = await rect(page, '.system-tray')
    const start = await rect(page, '.start')
    const nav = await rect(page, '.nav-bar')
    await diagram(page, 'canvas', [
      { box: tray, label: `system tray · 480 × ${fmt(tray[3])}`, color: '#ffd400', at: 'inside', dx: 130, dy: 5 },
      { box: start, label: `page area · 480 × ${fmt(start[3])}`, at: 'inside' },
      { box: nav, label: `navigation bar · 480 × ${fmt(nav[3])}`, color: '#ff4fd8', at: 'above' },
      { line: [0, start[1] + start[3] / 2, 480, start[1] + start[3] / 2], label: '480 logical px', color: '#ffd400' },
    ])
    const phone = await rect(page, '.tile[data-app="phone"]')
    const people = await rect(page, '.tile[data-app="people"]')
    const calendar = await rect(page, '.tile[data-app="calendar"]')
    const title = await rect(page, '.tile[data-app="phone"] .tile-title')
    await diagram(page, 'tiles', [
      { line: [0, phone[1] + 40, phone[0], phone[1] + 40], label: fmt(phone[0]), color: '#ffd400' },
      { line: [phone[0] + phone[2], phone[1] + 100, people[0], phone[1] + 100], label: fmt(people[0] - phone[0] - phone[2]), color: '#ffd400' },
      { line: [phone[0] + 60, start[1], phone[0] + 60, phone[1]], label: fmt(phone[1] - start[1]), color: '#ffd400' },
      { box: phone, label: `medium ${fmt(phone[2])} × ${fmt(phone[3])}`, at: 'inside' },
      { box: title, label: `title: ${fmt(title[0] - phone[0])} in, ${fmt(phone[1] + phone[3] - title[1] - title[3])} up`, color: '#ff4fd8', at: 'above' },
      { box: calendar, label: `wide ${fmt(calendar[2])} × ${fmt(calendar[3])}`, at: 'inside' },
    ])
  }

  if (wanted('shots')) {
    await page.locator('.start-arrow').click()
    await settle(page)
    await shot(page, 'app-list')
    await page.locator('.nav-bar [aria-label="Back"]').click()
    await settle(page)
    // Tapping the arrow scrolled it into view.
    await page.evaluate(() => document.querySelector('.start-pane')?.scrollTo(0, 0))
    await settle(page, 200)
    await page.keyboard.press('+')
    await settle(page, 300)
    await shot(page, 'volume-band')
    await page.waitForTimeout(3500)
    await attempt('tilt', async () => {
      // Press near a tile's corner and hold; the screen sits at the page's top left.
      const phone = await rect(page, '.tile[data-app="phone"]')
      await page.mouse.move(phone[0] + 18, phone[1] + 18)
      await page.mouse.down()
      await page.waitForTimeout(100)
      const clip = { x: phone[0] - 12, y: phone[1] - 12, width: phone[2] * 2 + 36, height: phone[3] + 24 }
      try {
        await page.screenshot({ path: join(OUT.shots, 'tilt.png'), clip })
      } catch (e) {
        throw new Error(`${e.message.split('\n')[0]} (tile ${JSON.stringify(phone)}, clip ${JSON.stringify(clip)})`)
      }
      console.log('  tilt')
      await page.mouse.move(phone[0] + 200, phone[1] + 300)
      await page.mouse.up()
      await settle(page)
    })
  }

  await tap(page, '.tile[data-app="settings"]')
  if (wanted('shots')) await shot(page, 'settings-pivot')
  if (wanted('diagrams')) {
    const t = await rect(page, ACTIVE + '.pivot-title')
    const header = await rect(page, ACTIVE + '.pivot-header[data-selected="true"]')
    const headers = await rect(page, ACTIVE + '.pivot-headers')
    const other = await rect(page, ACTIVE + '.pivot-header[data-selected="false"]')
    const row = ACTIVE + '.pivot-item[data-visible="true"] .list-item:has(.list-item-subtitle)'
    const item = await rect(page, row)
    const itemTitle = await rect(page, row + ' .list-item-title')
    const sub = await rect(page, row + ' .list-item-subtitle')
    const pivotItem = await rect(page, ACTIVE + '.pivot-item[data-visible="true"]')
    await diagram(page, 'pivot', [
      { box: t, label: `title · SemiBold 22.667 · ${fmt(t[0])} in`, color: '#ffd400', at: 'below' },
      { box: header, label: `header · SemiLight 72`, at: 'below' },
      { box: other, label: 'unselected · opacity 0.4', color: '#ff4fd8', at: 'below' },
      { line: [300, headers[1] + headers[3], 300, pivotItem[1]], label: fmt(pivotItem[1] - headers[1] - headers[3]), color: '#7cff6b' },
      { line: [0, itemTitle[1] + 20, itemTitle[0], itemTitle[1] + 20], label: fmt(itemTitle[0]), color: '#7cff6b' },
      { box: item, label: `list item · ExtraLarge 42.667 + Normal 20 subtle · ${fmt(item[3])} tall`, at: 'below' },
      { box: sub, label: 'subtitle · Normal 20 · subtle', color: '#ff4fd8', at: 'inside', dx: 200 },
    ])
  }
  if (wanted('shots')) {
    await tap(page, ACTIVE + '.list-item:has-text("Wi-Fi")')
    await shot(page, 'settings-wifi')
    await page.locator('.nav-bar [aria-label="Back"]').click()
    await settle(page)
    await tap(page, ACTIVE + '.list-item:has-text("theme")')
    await shot(page, 'settings-theme')
    await attempt('accent picker', async () => {
      await tap(page, ACTIVE + '.picker-box >> nth=1')
      await shot(page, 'accent-picker')
    })
  }
  await page.locator('.nav-bar [aria-label="Start"]').click()
  await settle(page, 1000)

  await fromAppList(page, 'alarms')
  await tap(page, ACTIVE + '.appbar-ellipsis')
  if (wanted('shots')) await shot(page, 'app-bar-expanded')
  if (wanted('diagrams')) {
    const bar = await rect(page, ACTIVE + '.appbar')
    const button = await rect(page, ACTIVE + '.appbar-button')
    const ring = await rect(page, ACTIVE + '.appbar-button svg')
    const dots = await rect(page, ACTIVE + '.appbar-ellipsis')
    await diagram(page, 'app-bar', [
      { box: bar, label: `app bar · chrome · ${fmt(bar[3])} expanded, 72 collapsed`, color: '#ffd400', at: 'above' },
      { box: button, label: `slot ${fmt(button[2])}`, color: '#7cff6b', at: 'below' },
      { box: ring, label: `${fmt(ring[2])} ring`, at: 'above' },
      { box: dots, label: `ellipsis ${fmt(dots[2])} × ${fmt(dots[3])}`, color: '#ff4fd8', at: 'below' },
    ])
  }
  await page.keyboard.press('Escape')
  await settle(page)
  if (wanted('shots')) {
    await attempt('time picker', async () => {
      await tap(page, ACTIVE + '.appbar-button[aria-label="new"]')
      await tap(page, ACTIVE + '.dt-box >> nth=0')
      await shot(page, 'time-picker')
    })
  }
  await page.locator('.nav-bar [aria-label="Start"]').click()
  await settle(page, 1000)

  await fromAppList(page, 'Music+Videos')
  await settle(page, 600)
  if (wanted('shots')) await shot(page, 'music-hub')
  if (wanted('diagrams')) {
    const section = await rect(page, ACTIVE + '.pano-section:not([aria-hidden="true"])')
    const title = await rect(page, ACTIVE + '.pano-title > span')
    const header = await rect(page, ACTIVE + '.pano-section:not([aria-hidden="true"]) .pano-header')
    const pano = await rect(page, ACTIVE + '.pano')
    await diagram(page, 'panorama', [
      { box: title, label: 'title · Light 133.333 · parallax 0.5', color: '#ffd400', at: 'inside', dy: title[3] - 22 },
      { line: [380, pano[1], 380, section[1]], label: fmt(section[1] - pano[1]), color: '#7cff6b' },
      { box: section, label: `section · ${fmt(section[2])} wide`, at: 'inside', dy: section[3] - 22 },
      { box: header, label: 'section header · SemiLight 53.333', color: '#ff4fd8', at: 'below' },
      { line: [section[0] + section[2], section[1] + 300, 480, section[1] + 300], label: fmt(480 - section[0] - section[2]), color: '#ffd400' },
    ])
  }
  if (wanted('shots')) {
    await attempt('now playing', async () => {
      const pano = await rect(page, ACTIVE + '.pano')
      const y = pano[1] + 500
      await page.mouse.move(420, y)
      await page.mouse.down()
      for (let x = 420; x >= 120; x -= 20) await page.mouse.move(x, y)
      await page.mouse.up()
      await settle(page, 900)
      await tap(page, ACTIVE + '.music-history-tile')
      await settle(page, 400)
      await shot(page, 'now-playing')
    })
  }
  await page.locator('.nav-bar [aria-label="Start"]').click()
  await settle(page, 1000)

  if (wanted('shots')) {
    await attempt('message box', async () => {
      await fromAppList(page, 'messaging')
      await tap(page, ACTIVE + '.messaging-thread')
      await tap(page, ACTIVE + '.appbar-ellipsis')
      await tap(page, ACTIVE + '.appbar-menu-item:has-text("delete thread")')
      await shot(page, 'message-box')
    })
  }
  await page.context().close()

  if (wanted('shots')) {
    const light = await open({ settings: { background: 'light', accent: 5 } })
    await shot(light, 'start-light')
    await tap(light, '.tile[data-app="settings"]')
    await shot(light, 'settings-pivot-light')
    await light.context().close()
  }
}

// ---------- motion strips ----------

if (wanted('strips')) {
  console.log('motion strips')
  let page = await open({ motion: true })
  const launch = await film(page, {
    action: () => page.locator('.tile[data-app="settings"]').click(),
    times: every(90, 15),
  })
  await compose(join(OUT.strips, 'launch.jpg'), 'Start → Settings: tiles feather out (tapped tile last), the app turns in as one page', [{ frames: launch }])

  const pivot = await film(page, {
    // The next header is clipped off the right edge, so it can't take a real click.
    action: () => page.locator(ACTIVE + '.pivot-header:has-text("applications")').first().dispatchEvent('click'),
    times: every(30, 12),
  })
  await compose(join(OUT.strips, 'pivot-swipe.jpg'), 'Pivot: tap the next header, items slide in with a 32 px-per-row cascade', [{ frames: pivot }])
  await page.locator(ACTIVE + '.pivot-header:has-text("system")').first().dispatchEvent('click')
  await settle(page, 1200)

  const drill = await film(page, {
    action: () => page.locator(ACTIVE + '.list-item:has-text("theme")').first().click(),
    times: every(80, 15),
  })
  await compose(join(OUT.strips, 'drill-in.jpg'), 'Drill in (forward): rows feather out top to bottom, tapped row last; the next page turns in as one plane', [{ frames: drill }])

  const back = await film(page, {
    action: () => page.locator('.nav-bar [aria-label="Back"]').click(),
    times: every(80, 14),
  })
  await compose(join(OUT.strips, 'back.jpg'), 'Back (backward): rows feather out, the previous page turns back in as one plane', [{ frames: back }])
  await page.context().close()

  await attempt('tile flip', async () => {
    page = await open({ motion: true })
    const flip = await filmTileFlip(page)
    await compose(join(OUT.strips, 'tile-flip.jpg'), 'Live tile flip (one of three decoded variants, picked at random)', [{ frames: flip }], 200)
    await page.context().close()
  })

  const hub = await filmHubIntro()
  await compose(join(OUT.strips, 'hub-intro.jpg'), 'Hub intro: the page swings in from edge-on while its layers slide in from the right', [{ frames: hub }])
}

// ---------- footage comparison (evidence only, not published) ----------

if (wanted('footage')) {
  console.log('footage comparison')
  if (!existsSync(FOOTAGE_FRAMES)) {
    warn(`footage frames not found at ${FOOTAGE_FRAMES}; skipped`)
  } else {
    // f_098665.png = the frame at 98.665 s; 98.665 s is the first frame the hub shows.
    const FIRST = 98665
    const files = readdirSync(FOOTAGE_FRAMES)
      .map((f) => ({ f, ms: Number(/^f_(\d+)\.png$/.exec(f)?.[1]) }))
      .filter((x) => Number.isFinite(x.ms))
    const footage = HUB_TIMES.map((t) => {
      const best = files.reduce((a, b) => (Math.abs(b.ms - FIRST - t) < Math.abs(a.ms - FIRST - t) ? b : a))
      return { t: best.ms - FIRST, src: 'data:image/png;base64,' + readFileSync(join(FOOTAGE_FRAMES, best.f)).toString('base64') }
    })
    const hub = await filmHubIntro()
    await compose(join(OUT.footage, 'hub-intro-compare.jpg'), 'Games hub intro, WP8 footage (YouTube 38SziMGTUiw, 98.665 s on) vs the recreation (Music+Videos hub)', [
      { label: 'WP8 footage, 30 fps (times from the first frame the hub shows)', frames: footage },
      { label: 'Recreation (times from the hub page mounting)', frames: hub },
    ])
  }
}

await browser.close()
await server.close()
if (warnings.length) {
  console.warn(`\n${warnings.length} warning(s):\n` + warnings.map((w) => '  - ' + w).join('\n'))
  process.exitCode = 1
}
