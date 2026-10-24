# AGENTS.md

A recreation of Windows Phone 8 in the browser, and `metroweb`, the library it is built on. Vite, React 19 and TypeScript, no UI libraries. The phone is deployed to https://wp8.vercel.app.

## Layout

An npm workspace with three packages:

- `packages/metroweb`: the `metroweb` npm package. Tokens and styles in `styles/`; the theme, motion, page stack and shared components in `src/`; icons in `src/icons/`; fonts in `fonts/`. What `src/index.ts` exports is its public API.
- `apps/web` (workspace `wp8`): the phone. Start, the system tray and volume band, Settings and the built-in apps, and the design docs site in `src/design/`.
- `templates/starter` (workspace `metroweb-starter`): a small to-do app on the package, which people copy with degit.

The phone imports the package as `metroweb`, and the `@metroweb/source` export condition resolves that to `packages/metroweb/src`, so a change there shows up without a package build. The starter uses the package's build in `dist/`, as any app outside this repository does.

## Commands

Run them from the repository root.

- `npm run dev`: the phone's dev server. The phone is at `/`, the design docs site at `/design`.
- `npm run lint`: oxlint. `npm run build`: type check and build the package, the phone and the starter. Run both before you finish a change.
- `npm run docs:assets` (or `-- shots | diagrams | strips | footage`): regenerate the pictures in `docs/design/assets`. Needs a Playwright Chromium, or `CHROMIUM_PATH` pointing at one. Run it after any visual change that a screenshot, diagram or motion strip shows.
- `npm run icons -w metroweb`: regenerate `packages/metroweb/src/icons/phosphor.ts` after adding an icon name.
- `npm run build -w metroweb`, then `npm run dev -w metroweb-starter`: run the starter against the package as it is now.
- Pushing to `main` deploys the phone to production on Vercel. Push only when asked.

## The design docs are the spec

Read [`docs/design/README.md`](docs/design/README.md) and the page for the area you're changing before you change UI. Those pages say what the phone does, which value the code uses, and how sure we are.

- **The phone wins.** When the phone and a web convention disagree, copy the phone. Every exception goes in [`13-web-and-accessibility.md`](docs/design/13-web-and-accessibility.md).
- **Label every value** you add or change: Decoded, Toolkit, Fitted, Estimated or Verified (see the README). Never upgrade a label without new evidence.
- **Update the docs in the same change** as the code: the value, its label, and the version baseline row if it moves. Regenerate assets that show it.
- **Microsoft names are canonical.** Keep names from `ThemeResources.xaml` and the UIX markup (`PhoneFontSizeLarge`, `TurnstileFeatherPixelDelay`) in tables and comments.
- **The docs are published** at `/design` (https://wp8.vercel.app/design), built from `docs/design` by `apps/web/scripts/design-docs.ts`. Fix any `design-docs` warning the dev server or build prints: it means a broken page link, a missing heading anchor or an image outside `docs/design/assets`. Live demos for `<!-- demo: name -->` comments are in `apps/web/src/design/demos.tsx`.

## Code rules

- **Package or phone.** A component, token or helper that any Metro app could use belongs in `packages/metroweb`, exported from `src/index.ts`. The phone's shell, its apps and their data stay in `apps/web`. The package never imports from `apps/` or `templates/`.
- **The package's API is public.** When you change an export or a prop, update `packages/metroweb/README.md`, and the starter if it uses it. The phone and the starter import from `metroweb`, never by a relative path into `packages/`.
- **Colour.** Use the `--wp-*` variables that `themeVariables` in `packages/metroweb/src/theme.ts` sets. Never write an accent hex in a component; use `var(--wp-accent)`, and `var(--wp-button-base-pressed-foreground)` for text on it. See [Colour and theme](docs/design/05-colour-and-theme.md).
- **Spacing.** Use `--wp-margin`, `--wp-touch-target-overhang` and `--wp-border-thickness` from `packages/metroweb/styles/tokens.css` where a value means that resource. See [Layout](docs/design/03-layout.md).
- **Type.** Use `--font-*` families and `--size-*` sizes from `tokens.css`. A size only one app uses may stay in its stylesheet; list it in [Typography](docs/design/04-typography.md#app-specific-sizes).
- **Motion.** Take easings and durations from `packages/metroweb/src/motion.ts` and `pageMotion.ts`. Guard every animation with `prefersReducedMotion()` or a `prefers-reduced-motion` block. See [Motion](docs/design/07-motion.md).
- **Pages.** Build app screens with `PageStack` (`PhoneFrame` holds one) and follow the authoring contract in [Navigation](docs/design/08-navigation.md#authoring-contract): `data-feather`, `data-continuum-target`, `registerBackHandler` for anything Back should close.
- **Pressables.** A real `button` with `useTilt`. Never a click handler on a `div`.
- **Shared components.** Use `TextBox` and `MessageBox` from `metroweb`. Don't style an `input` or build a dialog inside an app.
- **Popups.** Render into the popup layer, give them a role, a label and `aria-modal`, and call `useModal` (`packages/metroweb/src/components/modal.ts`) on the root element: it moves focus in, makes the app behind inert, and gives focus back.
- **Text.** Follow [Writing](docs/design/12-writing.md): lower case for headers and labels, the phone's own wording where the string tables have it, US English. Format times and dates with `formatTimeOfDay` and `formatShortDate` from `metroweb`.

## Assets and evidence

- **No Microsoft assets ship.** No Segoe WP, no Microsoft icons, sounds or images in `packages/`, `apps/` or `templates/`. The substitutes are Selawik, renamed Metroweb Sans (`packages/metroweb/fonts`, OFL), and Phosphor icons (MIT).
- **Microsoft material stays private.** Files copied or dumped from the emulator image (theme XAML, string tables, UIX tables), pictures of the phone's screen and frames from other people's videos go in `docs/evidence/private/`, a separate private repository that this one ignores. Never add them anywhere else, and don't link to them from public pages: a clone of this repository doesn't have them. The rest of `docs/evidence/` (tools, measurements, fits) is public.
- **`docs/evidence/` is never deployed.** It is in `.vercelignore` and outside the Vite build. Don't import from it. Cite videos by YouTube ID only; download URLs carry session tokens.
- The unpacked emulator image lives in `../extracted/`, outside the repository. Don't copy whole binaries into either repository; extract the part you need into `docs/evidence/private/` with a note of where it came from.
