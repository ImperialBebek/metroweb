# Metro design system

How this recreation of Windows Phone 8 looks, moves and behaves, and where each rule lives in the code. It is written first for people building on the recreation or with the `metroweb` package, but every page should read fine without the code open.

> **Status** Draft · **Baseline** Windows Phone 8.0, with 8.1 where noted · **Last reviewed** 2026-10-19
> **Code** [`packages/metroweb/`](../../packages/metroweb) (the package) and [`apps/web/`](../../apps/web) (the phone and this site) · **Evidence** [`docs/evidence/`](../evidence/README.md) (tools and measurements; the Microsoft files are kept private)

## Sections

1. [Principles](01-principles.md): where Metro comes from, what it is for, how to check a screen against it, and the rules this project adds.
2. [Canvas](02-canvas.md): the 480 px logical screen, its regions, scaling and safe areas.
3. [Layout](03-layout.md): the 12 px grid, margins and component metrics.
4. [Typography](04-typography.md): Segoe WP, the type ramp and text styles.
5. [Colour and theme](05-colour-and-theme.md): light and dark palettes and the 20 accents.
6. [Iconography](06-iconography.md): glyph sizes, rings and the Phosphor substitute.
7. [Motion](07-motion.md): turnstile, feather, continuum, hub intro, tilt, live tile flips.
8. [Navigation model](08-navigation.md): Start, apps, page stacks, Back and Start.
9. [Components](09-components.md): pivot, panorama, lists, toggles, pickers, app bar, message box.
10. [Start and live tiles](10-start-and-live-tiles.md): the tile grid, templates and live behaviour.
11. [System UI](11-system-ui.md): system tray, navigation bar, volume band, desk controls.
12. [Writing](12-writing.md): casing, voice, dates and times.
13. [Web and accessibility deviations](13-web-and-accessibility.md): where the recreation departs from the phone, and why.
14. [Evidence appendix](14-evidence.md): sources, open questions and what still needs a device.

## How to read these pages

Each page starts with a header block like the one above: its status, which version of the phone it follows, the code it describes, and when it was last checked.

Values are given with their Microsoft name when one exists (`PhoneFontSizeLarge`, `PivotItemMargin`), the value, the CSS variable or file that holds it in the recreation, and a source label.

### Source labels

Every value carries one of five labels, so you can tell how much to trust it.

| Label | Meaning |
|---|---|
| **Decoded** | Read from the Windows Phone 8 emulator image: theme XAML, the registry, string tables, app manifests, or compiled UIX markup decoded with the tools in [`docs/evidence/uix/tools`](../evidence/uix/tools). **Decoded (8.1)** is the same, read from the Windows Phone 8.1 SDK Update 1 emulator image; **Decoded (8.1 WinRT)** is read from the 8.1 SDK's theme for its new app model (`generic.xaml`, `themeresources.xaml`), whose sizes are 8.0 px × 0.8. Neither replaces an 8.0 value; where one agrees with an Estimated value, the source says so. |
| **Toolkit** | Taken from Microsoft's published Windows Phone Toolkit source (Silverlight). |
| **Fitted** | Measured frame by frame from recordings of real phones, usually with a curve fitted to the samples. |
| **Estimated** | Matched by eye against footage or screenshots, or chosen by us where no source exists. |
| **Verified** | Checked on a real device. Nothing has this label yet; see [what still needs a device](14-evidence.md#what-still-needs-a-device). |

### Settled and provisional

Where Windows Phone 8.0 and 8.1 differ, or where only 8.1 footage was available, the [version baseline](#version-baseline) below marks each choice **Settled** (we know what the phone does and chose deliberately) or **Provisional** (the best we can do without a device).

## Where the code lives

Pages name files by their path from the root of the repository.

- [`packages/metroweb/`](../../packages/metroweb) is the `metroweb` package, which any app can use: the tokens and styles (`styles/`), the theme, motion and page stack (`src/`), the shared components (`src/components/`), the icons (`src/icons/`) and the fonts.
- [`apps/web/`](../../apps/web) is the phone built on it: Start, the system tray and volume band, Settings and the other apps, and this site (`src/design/`).
- [`templates/starter/`](../../templates/starter) is a small app on the package, to copy when you start your own.
- [`skills/metro-ui/`](../../skills/metro-ui/SKILL.md) is a skill for coding agents that build on the package: the steps, the rules, and a checker for the ones code can show. [`DESIGN.md`](../../DESIGN.md) gives the tokens and rules in Google's DESIGN.md format.

## Ground rules

- **The phone wins.** When the phone's behaviour and a web convention disagree, the recreation follows the phone. Every exception is listed in [Web and accessibility deviations](13-web-and-accessibility.md).
- **Microsoft names are canonical.** Tokens keep the names from `ThemeResources.xaml` and the UIX markup. The CSS variables (`--wp-*`, `--size-*`, `--font-*`) are the current implementation. Shared values use those variables; a value only one app uses stays in that app's stylesheet and is listed on the page for its area.
- **No Microsoft assets ship.** Fonts, icons and images from the phone stay out of the build. See [Typography](04-typography.md) and [Iconography](06-iconography.md) for the substitutes.

## Version baseline

| Area | Windows Phone 8.0 | Windows Phone 8.1 | Recreation follows | Status |
|---|---|---|---|---|
| Back, Start, Search | Hardware or capacitive keys below the screen | Adds an optional on-screen navigation bar | 8.1 on-screen bar, because a browser has no hardware keys | Settled |
| System tray | 32 px tray across the top, 9 px left padding, clock 10 px from the right | Same height, 24 px padding on both sides, plus Action Center on a swipe down | 8.0 tray, with estimated 12 px padding. Tapping it opens the volume band; there is no Action Center | Settled |
| Start | Four small-tile columns of solid accent tiles | Adds a six-column option and a Start background picture | 8.0 | Settled |
| App list | Search button and a list sorted by name | Search box and more sorting and grouping options | 8.0 style list; letter groups are not implemented | Settled |
| Accent colours | 20 accents from the registry; default Red | Same 20 in the same order, but Cobalt is `#3E65FF` (was `#0050EF`), each accent gains a complementary colour, and the emulator defaults to Cobalt | 8.0 registry values | Settled |
| Typography | Segoe WP | Segoe WP; the Silverlight theme resources are unchanged. WinRT apps get the same ramp in view pixels (× 0.8) | 8.0 theme resources | Settled |
| Page transitions | Turnstile, feather and continuum | Same family, faster: turns out 128 ms and in 300 ms, feathered elements in over 180 ms; continuum moves vertically and turns about X | 8.1: native turnstile, Start feather and continuum decoded from 8.1's `ANIMATIONS.UIX` and `STYLES.UIX` and checked against 240 fps 8.1 footage; Toolkit timings for Silverlight-style stacks. `setNativeMotionVersion('8.0')` switches back to the 8.0 turnstile and Start feather, and the estimated 8.0 continuum, for comparison | Provisional |
| Hub intro | Panorama swings in while layers slide | Same family | Fitted to 8.0 (Games hub) and 8.1 (Office hub) footage | Provisional |
| Pivot | Swipe or tap headers | Same | 8.0 behaviour; content cascade estimated from 8.1 footage | Provisional |
| Panorama | Section headers 66.667 px, title 170.667 px, sections 191 px down (decoded) | Same at 480 × 800; smaller in the six-column variants | Sizes matched to 8.1 footage of what looks like a six-column phone (53.333, 133.333, 146), not yet moved to the decoded 8.0 values | Provisional |
| Live tiles | Flip, cycle, people and calendar templates | Adds transparent tiles over a background | 8.0, decoded from `ShellControls.dll` | Settled |
| Music | One Music+Videos hub | Separate Xbox Music and Video apps | 8.0 | Settled |
| Volume | One volume band, 0 to 30, with media controls | Ringer and media volumes split | 8.0 | Settled |
| Settings | 8.0 item list and order | Adds and regroups items: start+theme first, then notifications+actions, cellular+SIM, NFC, data sense, storage sense, navigation bar and more (decoded from the 8.1 emulator's registry; a Lumia 520 on 8.1 has the same list without navigation bar, apps corner and accessory apps) | 8.0 registry order | Settled |

## Keeping these pages current

- When you change a documented value, update its row here in the same change, including the source label.
- Screenshots, measurement diagrams and motion strips are generated. Run `npm run docs:assets` (or one group: `npm run docs:assets -- strips`) after a visual change. See [`apps/web/scripts/docs-assets.mjs`](../../apps/web/scripts/docs-assets.mjs).
- These pages are also published as a site at [`/design`](https://wp8.vercel.app/design), built from this folder by [`apps/web/scripts/design-docs.ts`](../../apps/web/scripts/design-docs.ts) during `npm run dev` and `npm run build`. Links between pages and to their headings become site links, and the build warns about any that don't resolve. Links outside `docs/design` (to the code or the evidence) are published as plain text, and only images in `assets/` are published.
- Each page is also published as Markdown at its route plus `.md` (`/design/motion.md`), listed in [`/llms.txt`](https://wp8.vercel.app/llms.txt) and joined with the package README in `/llms-full.txt`. Their links are absolute: pages to their `.md`, the code to GitHub.
- `DESIGN.md` and the metro-ui skill restate tokens and rules from these pages. Change them with the page.
- A `<!-- demo: name -->` comment on its own line puts a live component at that spot on the site, in a phone frame that follows the site's theme and accent switches. The demos are in [`apps/web/src/design/demos.tsx`](../../apps/web/src/design/demos.tsx); a name with no demo renders nothing and logs a warning in the dev server.
