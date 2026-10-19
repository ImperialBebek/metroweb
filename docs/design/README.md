# Metro design system

How this recreation of Windows Phone 8 looks, moves and behaves, and where each rule lives in the code. It is written for people building on the recreation first, but every page should read fine without the code open.

> **Status** Draft · **Baseline** Windows Phone 8.0, with 8.1 where noted · **Last reviewed** 2026-10-19
> **Code** [`src/`](../../src) · **Evidence** [`docs/evidence/`](../evidence/README.md) (local only, never published)

## Sections

1. [Principles](01-principles.md): what Metro is for, and the rules this project adds.
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
| **Decoded** | Read from the Windows Phone 8 emulator image: theme XAML, the registry, string tables, app manifests, or compiled UIX markup decoded with the tools in [`docs/evidence/uix/tools`](../evidence/uix/tools). |
| **Toolkit** | Taken from Microsoft's published Windows Phone Toolkit source (Silverlight). |
| **Fitted** | Measured frame by frame from recordings of real phones, usually with a curve fitted to the samples. |
| **Estimated** | Matched by eye against footage or screenshots, or chosen by us where no source exists. |
| **Verified** | Checked on a real device. Nothing has this label yet; see [what still needs a device](14-evidence.md#what-still-needs-a-device). |

### Settled and provisional

Where Windows Phone 8.0 and 8.1 differ, or where only 8.1 footage was available, the [version baseline](#version-baseline) below marks each choice **Settled** (we know what the phone does and chose deliberately) or **Provisional** (the best we can do without a device).

## Ground rules

- **The phone wins.** When the phone's behaviour and a web convention disagree, the recreation follows the phone. Every exception is listed in [Web and accessibility deviations](13-web-and-accessibility.md).
- **Microsoft names are canonical.** Tokens keep the names from `ThemeResources.xaml` and the UIX markup. The CSS variables (`--wp-*`, `--size-*`, `--font-*`) are the current implementation. Consolidating the remaining literal values into tokens happens after these docs, using these tables as the spec.
- **No Microsoft assets ship.** Fonts, icons and images from the phone stay out of the build. See [Typography](04-typography.md) and [Iconography](06-iconography.md) for the substitutes.

## Version baseline

| Area | Windows Phone 8.0 | Windows Phone 8.1 | Recreation follows | Status |
|---|---|---|---|---|
| Back, Start, Search | Hardware or capacitive keys below the screen | Adds an optional on-screen navigation bar | 8.1 on-screen bar, because a browser has no hardware keys | Settled |
| System tray | 32 px tray across the top | Same tray, plus Action Center on a swipe down | 8.0 tray. Tapping it opens the volume band; there is no Action Center | Settled |
| Start | Four small-tile columns of solid accent tiles | Adds a six-column option and a Start background picture | 8.0 | Settled |
| App list | Search button and a list sorted by name | Search box and more sorting and grouping options | 8.0 style list; letter groups are not implemented | Settled |
| Accent colours | 20 accents from the registry | Same set (not checked against an 8.1 image) | 8.0 registry values | Settled |
| Typography | Segoe WP | Segoe WP | 8.0 theme resources | Settled |
| Page transitions | Turnstile, feather and continuum | Same family | Toolkit durations and easing; angles and feather stagger estimated from 8.1 footage | Provisional |
| Hub intro | Panorama swings in while layers slide | Same family | Fitted to 8.0 (Games hub) and 8.1 (Office hub) footage | Provisional |
| Pivot | Swipe or tap headers | Same | 8.0 behaviour; content cascade estimated from 8.1 footage | Provisional |
| Live tiles | Flip, cycle, people and calendar templates | Adds transparent tiles over a background | 8.0, decoded from `ShellControls.dll` | Settled |
| Music | One Music+Videos hub | Separate Xbox Music and Video apps | 8.0 | Settled |
| Volume | One volume band, 0 to 30, with media controls | Ringer and media volumes split | 8.0 | Settled |
| Settings | 8.0 item list and order | Adds and regroups items (for example notifications+actions) | 8.0 registry order | Settled |

## Keeping these pages current

- When you change a documented value, update its row here in the same change, including the source label.
- Screenshots, measurement diagrams and motion strips are generated. Run `npm run docs:assets` (or one group: `npm run docs:assets -- strips`) after a visual change. See [`scripts/docs-assets.mjs`](../../scripts/docs-assets.mjs).
- `<!-- demo: … -->` comments mark where a live specimen will go if these pages are published at `/design`.
