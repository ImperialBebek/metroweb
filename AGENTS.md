# AGENTS.md

A recreation of Windows Phone 8 in the browser: Start, live tiles, Settings and a set of built-in apps. Vite, React 19 and TypeScript, no UI libraries. Deployed to https://wp8.vercel.app.

## Commands

- `npm run dev`: Vite dev server.
- `npm run lint`: oxlint. `npm run build`: type check (`tsc -b`) and production build. Run both before you finish a change.
- `npm run docs:assets` (or `-- shots | diagrams | strips | footage`): regenerate the pictures in `docs/design/assets`. Needs a Playwright Chromium, or `CHROMIUM_PATH` pointing at one. Run it after any visual change that a screenshot, diagram or motion strip shows.
- `node scripts/gen-phosphor-icons.mjs`: regenerate `src/icons/phosphor.ts` after adding an icon name.
- Deploy with `npx vercel deploy --prod --yes`, and only when asked.

## The design docs are the spec

Read [`docs/design/README.md`](docs/design/README.md) and the page for the area you're changing before you change UI. Those pages say what the phone does, which value the code uses, and how sure we are.

- **The phone wins.** When the phone and a web convention disagree, copy the phone. Every exception goes in [`13-web-and-accessibility.md`](docs/design/13-web-and-accessibility.md).
- **Label every value** you add or change: Decoded, Toolkit, Fitted, Estimated or Verified (see the README). Never upgrade a label without new evidence.
- **Update the docs in the same change** as the code: the value, its label, and the version baseline row if it moves. Regenerate assets that show it.
- **Microsoft names are canonical.** Keep names from `ThemeResources.xaml` and the UIX markup (`PhoneFontSizeLarge`, `TurnstileFeatherPixelDelay`) in tables and comments.

## Code rules

- **Colour.** Use the `--wp-*` variables from `src/theme.ts`. Never write an accent hex in a component; use `var(--wp-accent)`. See [Colour and theme](docs/design/05-colour-and-theme.md).
- **Type.** Use `--font-*` families and `--size-*` sizes from `src/index.css`. See [Typography](docs/design/04-typography.md).
- **Motion.** Take easings and durations from `src/motion.ts` and `src/pageMotion.ts`. Guard every animation with `prefersReducedMotion()` or a `prefers-reduced-motion` block. See [Motion](docs/design/07-motion.md).
- **Pages.** Build app screens with `PageStack` and follow the authoring contract in [Navigation](docs/design/08-navigation.md#authoring-contract): `data-feather`, `data-continuum-target`, `registerBackHandler` for anything Back should close.
- **Pressables.** A real `button` with `useTilt`. Never a click handler on a `div`.
- **Popups.** Render into the popup layer, give them a role, a label and `aria-modal`, and move focus in on open.
- **Text.** Follow [Writing](docs/design/12-writing.md): lower case for headers and labels, the phone's own wording where the string tables have it, US English. Format times and dates with `src/format.ts`.

## Assets and evidence

- **No Microsoft assets ship.** No Segoe WP, no Microsoft icons, sounds or images in `src/` or `public/`. The substitutes are Selawik (`public/fonts`, OFL) and Phosphor icons (MIT).
- **`docs/evidence/` is never published.** It is in `.vercelignore` and outside the Vite build. Don't import from it. Cite videos by YouTube ID only; download URLs carry session tokens.
- The unpacked emulator image lives in `../extracted/`, outside the repository. Don't copy whole binaries into the repo; extract the part you need into `docs/evidence/` with a note of where it came from.
