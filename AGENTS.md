# AGENTS.md

A recreation of Windows Phone 8 in the browser: Start, live tiles, Settings and a set of built-in apps. Vite, React 19 and TypeScript, no UI libraries. Deployed to https://wp8.vercel.app.

## Commands

- `npm run dev`: Vite dev server. The phone is at `/`, the design docs site at `/design`.
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
- **The docs are published** at `/design` (https://wp8.vercel.app/design), built from `docs/design` by `scripts/design-docs.ts`. Fix any `design-docs` warning the dev server or build prints: it means a broken page link, a missing heading anchor or an image outside `docs/design/assets`. Live demos for `<!-- demo: name -->` comments are in `src/design/demos.tsx`.

## Code rules

- **Colour.** Use the `--wp-*` variables from `src/theme.ts`. Never write an accent hex in a component; use `var(--wp-accent)`, and `var(--wp-button-base-pressed-foreground)` for text on it. See [Colour and theme](docs/design/05-colour-and-theme.md).
- **Spacing.** Use `--wp-margin`, `--wp-touch-target-overhang` and `--wp-border-thickness` from `src/index.css` where a value means that resource. See [Layout](docs/design/03-layout.md).
- **Type.** Use `--font-*` families and `--size-*` sizes from `src/index.css`. A size only one app uses may stay in its stylesheet; list it in [Typography](docs/design/04-typography.md#app-specific-sizes).
- **Motion.** Take easings and durations from `src/motion.ts` and `src/pageMotion.ts`. Guard every animation with `prefersReducedMotion()` or a `prefers-reduced-motion` block. See [Motion](docs/design/07-motion.md).
- **Pages.** Build app screens with `PageStack` and follow the authoring contract in [Navigation](docs/design/08-navigation.md#authoring-contract): `data-feather`, `data-continuum-target`, `registerBackHandler` for anything Back should close.
- **Pressables.** A real `button` with `useTilt`. Never a click handler on a `div`.
- **Shared components.** Use `TextBox` and `MessageBox` from `src/components/`. Don't style an `input` or build a dialog inside an app.
- **Popups.** Render into the popup layer, give them a role, a label and `aria-modal`, and call `useModal` (`src/components/modal.ts`) on the root element: it moves focus in, makes the app behind inert, and gives focus back.
- **Text.** Follow [Writing](docs/design/12-writing.md): lower case for headers and labels, the phone's own wording where the string tables have it, US English. Format times and dates with `src/format.ts`.

## Assets and evidence

- **No Microsoft assets ship.** No Segoe WP, no Microsoft icons, sounds or images in `src/` or `public/`. The substitutes are Selawik (`public/fonts`, OFL) and Phosphor icons (MIT).
- **Microsoft material stays private.** Files copied or dumped from the emulator image (theme XAML, string tables, UIX tables), pictures of the phone's screen and frames from other people's videos go in `docs/evidence/private/`, a separate private repository that this one ignores. Never add them anywhere else, and don't link to them from public pages: a clone of this repository doesn't have them. The rest of `docs/evidence/` (tools, measurements, fits) is public.
- **`docs/evidence/` is never deployed.** It is in `.vercelignore` and outside the Vite build. Don't import from it. Cite videos by YouTube ID only; download URLs carry session tokens.
- The unpacked emulator image lives in `../extracted/`, outside the repository. Don't copy whole binaries into either repository; extract the part you need into `docs/evidence/private/` with a note of where it came from.
