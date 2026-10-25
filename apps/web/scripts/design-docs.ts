// Publishes docs/design/*.md at /design. At build time each page is parsed
// with marked into HTML chunks and demo slots (`<!-- demo: name -->`) and
// served as `virtual:design-docs`; design/index.html renders them. Each page
// is also published as Markdown at its route plus .md, next to llms.txt and
// llms-full.txt at the root, for agents and anything else that reads text.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
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

// The Markdown exports have absolute links: pages to their .md, the rest of
// the repository to GitHub, since neither is next to them once published.
const SITE = 'https://wp8.vercel.app'
const REPOSITORY = 'https://github.com/ImperialBebek/metroweb'
const RAW = 'https://raw.githubusercontent.com/ImperialBebek/metroweb/main'
const MARKDOWN_ROUTE = /^\/(?:llms(?:-full)?\.txt|design(?:\/[a-z0-9-]+)?\.md)$/
// A page on the site: the HTML needs JavaScript to show anything, so the exports link its .md.
const SITE_PAGE = new RegExp(`^${SITE.replace(/\./g, '\\.')}(${BASE}(?:/[a-z0-9-]+)?)/?(#.*)?$`)
const MARKDOWN_LINK = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g
const FENCE = /^\s*(`{3,}|~{3,})/

const LLMS_INTRO = `# metroweb

> Windows Phone 8's Metro design for React. metroweb is an npm package of the phone's controls, page transitions, themes and type ramp, with the values taken from the phone itself. Its design docs are the spec, and ${SITE} is a whole phone built with it.

- Install it with \`npm install metroweb\` (it needs React 19), import \`metroweb/styles.css\` once, and render a \`PhoneFrame\` as the app's root. The starter is the quickest way in: \`npx degit ImperialBebek/metroweb/templates/starter my-app\`.
- The phone wins: where the phone and a web convention disagree, the docs and the package follow the phone. The exceptions are listed on the web and accessibility page.
- Every value in the docs carries a source label: Decoded (read from the emulator image), Toolkit (the Windows Phone Toolkit's source), Fitted (measured from footage), Estimated (matched by eye, or chosen) or Verified (checked on a device).
- Coding agents can install the metro-ui skill, with the steps, the rules and a checker script: \`npx skills add ImperialBebek/metroweb\`.

## Package

- [metroweb README](${RAW}/packages/metroweb/README.md): installing, pages and navigation, every component, the theme variables and the rules that keep an app Metro
- [metro-ui skill](${RAW}/skills/metro-ui/SKILL.md): how a coding agent builds and checks an app on the package
- [DESIGN.md](${RAW}/DESIGN.md): the design tokens in Google's DESIGN.md format
- [Starter](${REPOSITORY}/tree/main/templates/starter): a small to-do app on the package
`
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

// The Markdown exports, by file name: each page at its route plus .md
// (design.md, design/motion.md), llms.txt, and llms-full.txt with the package
// README and every page.
function markdownFiles(dir: string): Map<string, string> {
  // `dir` is docs/design, two levels into the repository.
  const root = resolve(dir, '../..')
  const sources = readSources(dir)
  const byPath = new Map(sources.map((s) => [join(dir, s.file), s]))

  const resolveLink = (href: string, from: string): string | null => {
    const [, route, anchor = ''] = SITE_PAGE.exec(href) ?? []
    if (route && sources.some((s) => s.route === route)) return `${SITE}${route}.md${anchor}`
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return href
    const hashAt = href.indexOf('#')
    const path = resolve(from, hashAt < 0 ? href : href.slice(0, hashAt))
    const hash = hashAt < 0 ? '' : href.slice(hashAt)
    const page = byPath.get(path)
    if (page) return `${SITE}${page.route}.md${hash}`
    const file = relative(root, path).split(sep).join('/')
    if (file.startsWith('../') || file.startsWith('docs/evidence/private')) return null
    if (file.startsWith('docs/design/assets/')) return `${RAW}/${file}`
    // docs/evidence isn't uploaded to Vercel, so there a name without an extension is taken for a folder.
    const folder = existsSync(path) ? statSync(path).isDirectory() : !/\.[a-z0-9]+$/i.test(file)
    return `${REPOSITORY}/${folder ? 'tree' : 'blob'}/main/${file}${hash}`
  }

  const exportFile = (file: string) => {
    const from = dirname(file)
    let fence = ''
    const lines: string[] = []
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const marker = FENCE.exec(line)?.[1]
      if (marker && (!fence || marker.startsWith(fence))) fence = fence ? '' : marker
      else if (!fence) {
        if (DEMO.test(line.trim())) continue
        lines.push(
          line.replace(MARKDOWN_LINK, (_, image: string, label: string, href: string, title = '') => {
            const target = resolveLink(href, from)
            if (target === null) return image ? '' : label
            return `${image}[${label}](${target}${title})`
          }),
        )
        continue
      }
      lines.push(line)
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const files = new Map<string, string>()
  const pages = sources.map((s) => exportFile(join(dir, s.file)))
  sources.forEach((s, i) => files.set(`${s.route.slice(1)}.md`, pages[i]))

  // The README's numbered list of sections says what each page covers.
  const about = new Map<string, string>()
  for (const m of readFileSync(join(dir, 'README.md'), 'utf8').matchAll(/^\d+\.\s+\[[^\]]*\]\(([^)#\s]+)\):\s*(.+)$/gm)) about.set(m[1], m[2])
  const entries = sources.map((s) => {
    const what = s.number === null ? 'how to read the pages, the source labels and the version baseline' : about.get(s.file)
    return `- [${s.title}](${SITE}${s.route}.md)${what ? `: ${what}` : ''}`
  })
  files.set(
    'llms.txt',
    `${LLMS_INTRO}\n## Design docs\n\n${entries.join('\n')}\n\n## Optional\n\n- [Everything in one file](${SITE}/llms-full.txt): the package README and every page of the design docs\n`,
  )
  files.set('llms-full.txt', [exportFile(join(root, 'packages/metroweb/README.md')), ...pages].join('\n---\n\n'))
  return files
}

// `dir` is the docs/design folder.
export function designDocs({ dir }: { dir: string }): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = (req.url ?? '').split(/[?#]/)[0]
    if (req.method === 'GET' && ROUTE.test(path)) req.url = `${BASE}/index.html`
    next()
  }
  // In dev the Markdown exports are made per request, from the files as they are now.
  const markdown: Connect.NextHandleFunction = (req, res, next) => {
    const path = (req.url ?? '').split(/[?#]/)[0]
    const body = req.method === 'GET' && MARKDOWN_ROUTE.test(path) ? markdownFiles(dir).get(path.slice(1)) : undefined
    if (body === undefined) return next()
    res.setHeader('Content-Type', `${path.endsWith('.txt') ? 'text/plain' : 'text/markdown'}; charset=utf-8`)
    res.end(body)
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
    generateBundle() {
      for (const [fileName, source] of markdownFiles(dir)) this.emitFile({ type: 'asset', fileName, source })
    },
    configureServer(server) {
      server.middlewares.use(markdown)
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}
