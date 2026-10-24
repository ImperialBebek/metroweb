// Publishes docs/design/*.md at /design. At build time each page is parsed
// with marked into HTML chunks and demo slots (`<!-- demo: name -->`) and
// served as `virtual:design-docs`; design/index.html renders them.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Marked, type Token, type Tokens } from 'marked'
import type { Connect, Plugin } from 'vite'

const BASE = '/design'
const MODULE_ID = 'virtual:design-docs'
const RESOLVED_ID = '\0' + MODULE_ID
const PAGE_FILE = /^(?:(\d+)-([a-z0-9-]+)|README)\.md$/
const DEMO = /^<!--\s*demo:\s*([a-z0-9-]+)\s*-->\s*$/
// Rewritten to the HTML entry, in dev and preview as on Vercel (vercel.json).
const ROUTE = /^\/design(?:\/[a-z0-9-]+)?\/?$/
// Stands in for an image URL until the module code imports it.
const IMAGE_MARK = /\uE000(\d+)\uE000/

interface Source {
  file: string
  route: string
  number: number | null
  tokens: Token[]
  title: string
  anchors: Set<string>
  headings: { id: string; text: string }[]
}

type Chunk = { html: string } | { demo: string }

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }
const plainText = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITIES[e])

// GitHub's heading anchors, so links between the pages work on GitHub and here.
function slugger() {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-')
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count ? `${base}-${count}` : base
  }
}

const inline = new Marked()
const headingText = (heading: Tokens.Heading) => plainText(inline.parseInline(heading.text) as string)

function imageSize(file: string) {
  const b = readFileSync(file)
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) break
      const marker = b[i + 1]
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }
      }
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  return null
}

function readSources(dir: string): Source[] {
  const files = readdirSync(dir).filter((f) => PAGE_FILE.test(f))
  const sources = files.map((file) => {
    const [, number, name] = PAGE_FILE.exec(file)!
    const tokens = new Marked().lexer(readFileSync(join(dir, file), 'utf8'))
    const slug = slugger()
    const anchors = new Set<string>()
    const headings: Source['headings'] = []
    let title = file
    for (const t of tokens) {
      if (t.type !== 'heading') continue
      const text = headingText(t as Tokens.Heading)
      const id = slug(text)
      anchors.add(id)
      if ((t as Tokens.Heading).depth === 2) headings.push({ id, text })
      if ((t as Tokens.Heading).depth === 1 && title === file) title = text.replace(/^\d+\s*·\s*/, '')
    }
    const route = name ? `${BASE}/${name}` : BASE
    return { file, route, number: number ? Number(number) : null, tokens, title, anchors, headings }
  })
  return sources.sort((a, b) => (a.number ?? -1) - (b.number ?? -1))
}

function buildModule(dir: string, warn: (message: string) => void) {
  const sources = readSources(dir)
  const byFile = new Map(sources.map((s) => [s.file, s]))
  const images: string[] = []
  let page = sources[0]
  let slug = slugger()

  // Links to other pages become /design routes; links into the repository
  // (src/, scripts/, docs/evidence/) aren't published, so only their text stays.
  const resolveLink = (href: string): string | null => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href
    const hashAt = href.indexOf('#')
    const path = hashAt < 0 ? href : href.slice(0, hashAt)
    const hash = hashAt < 0 ? '' : href.slice(hashAt + 1)
    const target = path === '' ? page : byFile.get(path)
    if (!target) {
      if (!path.startsWith('../')) warn(`${page.file}: link to ${href} doesn't resolve`)
      return null
    }
    if (hash && !target.anchors.has(hash)) warn(`${page.file}: ${target.file} has no #${hash}`)
    return (path === '' ? '' : target.route) + (hash ? `#${hash}` : '')
  }

  const image = (href: string, alt: string) => {
    const file = join(dir, href)
    if (!href.startsWith('assets/') || !existsSync(file)) {
      warn(`${page.file}: image ${href} isn't in docs/design/assets`)
      return null
    }
    const size = imageSize(file)
    const kind = href.startsWith('assets/strips/')
      ? 'strip'
      : size && size.width > size.height
        ? 'wide'
        : href.startsWith('assets/diagrams/')
          ? 'diagram'
          : 'shot'
    // Imported by absolute path: the docs sit outside the app's Vite root.
    const url = file
    if (!images.includes(url)) images.push(url)
    const mark = `\uE000${images.indexOf(url)}\uE000`
    const dims = size ? ` width="${size.width}" height="${size.height}"` : ''
    return { kind, mark, img: `<img src="${mark}" alt="${escapeAttr(alt)}"${dims} loading="lazy" decoding="async">` }
  }

  const marked = new Marked({
    renderer: {
      heading(token) {
        const { tokens, depth } = token
        return `<h${depth} id="${slug(headingText(token))}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens)
        const target = resolveLink(href)
        if (target === null) return text
        const external = /^https?:/.test(target) ? ' rel="noreferrer"' : ''
        return `<a href="${escapeAttr(target)}"${external}>${text}</a>`
      },
      image({ href, text }) {
        return image(href, text)?.img ?? ''
      },
      // A paragraph of nothing but pictures becomes a row of captioned figures.
      paragraph({ tokens }) {
        const pictures = tokens.filter((t): t is Tokens.Image => t.type === 'image')
        if (!pictures.length || !tokens.every((t) => t.type === 'image' || (t.type === 'text' && !t.text.trim()))) return false
        const figures = pictures.map((p) => {
          const picture = image(p.href, p.text)
          if (!picture) return ''
          // Motion strips carry their caption in the picture.
          if (picture.kind === 'strip') {
            return `<figure class="doc-figure doc-figure-strip"><div class="doc-strip" tabindex="0" role="region" aria-label="Motion strip">${picture.img}</div></figure>`
          }
          const caption = `<figcaption aria-hidden="true">${escapeAttr(p.text)}</figcaption>`
          const link = `<a class="doc-figure-link" href="${picture.mark}">${picture.img}</a>`
          return `<figure class="doc-figure doc-figure-${picture.kind}">${link}${caption}</figure>`
        })
        return `<div class="doc-figures">${figures.join('')}</div>\n`
      },
      html({ text }) {
        return /^\s*<!--/.test(text) ? '' : text
      },
    },
  })

  const pages = sources.map((source) => {
    page = source
    slug = slugger()
    const chunks: Chunk[] = []
    let group: Token[] = []
    const title = source.tokens.find((t) => t.type === 'heading' && (t as Tokens.Heading).depth === 1)
    // The header block: the first blockquote above the first section.
    const meta = source.tokens.find((t, i) => {
      const section = source.tokens.findIndex((s) => s.type === 'heading' && (s as Tokens.Heading).depth > 1)
      return t.type === 'blockquote' && (section < 0 || i < section)
    })
    const flush = () => {
      if (!group.length) return
      let html = marked.parser(group) as string
      html = html.replace(/<table>/g, '<div class="doc-table"><table>').replace(/<\/table>/g, '</table></div>')
      // Each line of the header block (Status, Code, Sources) keeps its own line.
      if (meta && group.includes(meta)) {
        html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/, (_, body: string) =>
          `<blockquote class="doc-meta">${body.replace(/\n(?!<\/?p>|$)/g, '<br>\n')}</blockquote>`,
        )
      }
      chunks.push({ html })
      group = []
    }
    for (const token of source.tokens) {
      if (token === title) {
        // The layout draws the title; its anchor still counts for duplicates.
        slug(headingText(token as Tokens.Heading))
        continue
      }
      const demo = token.type === 'html' ? DEMO.exec((token as Tokens.HTML).text.trim()) : null
      if (demo) {
        flush()
        chunks.push({ demo: demo[1] })
        continue
      }
      group.push(token)
    }
    flush()
    return { source, chunks }
  })

  const js = (html: string) =>
    html
      .split(IMAGE_MARK)
      .map((part, i) => (i % 2 ? `__img${part}` : JSON.stringify(part)))
      .join(' + ')
  const imports = images.map((path, i) => `import __img${i} from ${JSON.stringify(path)}`).join('\n')
  const entries = pages.map(({ source, chunks }) => {
    const body = chunks.map((c) => ('demo' in c ? `{ demo: ${JSON.stringify(c.demo)} }` : `{ html: ${js(c.html)} }`))
    return `  {
    route: ${JSON.stringify(source.route)},
    file: ${JSON.stringify(source.file)},
    number: ${JSON.stringify(source.number)},
    title: ${JSON.stringify(source.title)},
    headings: ${JSON.stringify(source.headings)},
    chunks: [
      ${body.join(',\n      ')}
    ],
  }`
  })
  return { code: `${imports}\n\nexport const pages = [\n${entries.join(',\n')}\n]\n`, files: sources.map((s) => join(dir, s.file)) }
}

// `dir` is the docs/design folder.
export function designDocs({ dir }: { dir: string }): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = (req.url ?? '').split(/[?#]/)[0]
    if (req.method === 'GET' && ROUTE.test(path)) req.url = `${BASE}/index.html`
    next()
  }
  return {
    name: 'design-docs',
    resolveId: {
      filter: { id: /^virtual:design-docs$/ },
      handler: () => RESOLVED_ID,
    },
    load: {
      filter: { id: /^\0virtual:design-docs$/ },
      handler() {
        const { code, files } = buildModule(dir, (message) => this.warn(message))
        files.forEach((file) => this.addWatchFile(file))
        return code
      },
    },
    hotUpdate({ file }) {
      if (this.environment.name !== 'client' || !file.startsWith(dir) || !file.endsWith('.md')) return
      const mod = this.environment.moduleGraph.getModuleById(RESOLVED_ID)
      if (!mod) return
      this.environment.moduleGraph.invalidateModule(mod)
      this.environment.hot.send({ type: 'full-reload' })
      return []
    },
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}
