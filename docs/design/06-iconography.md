# 06 · Iconography

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-19
> **Code** [`packages/metroweb/src/icons/`](../../packages/metroweb/src/icons) (`phosphor.ts`, `PhIcon.tsx`, `ph.tsx`), [`packages/metroweb/src/components/glyphs.tsx`](../../packages/metroweb/src/components/glyphs.tsx), [`apps/web/src/start/icons.tsx`](../../apps/web/src/start/icons.tsx), [`packages/metroweb/scripts/gen-phosphor-icons.mjs`](../../packages/metroweb/scripts/gen-phosphor-icons.mjs)
> **Sources** Phosphor Icons (MIT, [`LICENSE-phosphor.txt`](../../packages/metroweb/src/icons/LICENSE-phosphor.txt)); sizes Estimated from emulator screenshots

Metro glyphs are flat, solid, single-colour shapes drawn on a square grid, with no outlines, gradients or perspective. The phone's own glyphs (Segoe WP symbols and the SDK's app bar icon set) can't ship, so the recreation uses **Phosphor** in its **fill** weight, which has the same solid, geometric character.

## Where icons come from

- `packages/metroweb/scripts/gen-phosphor-icons.mjs` copies the path data of the icons named in its `NAMES` list from `@phosphor-icons/core` into `packages/metroweb/src/icons/phosphor.ts`. Every icon is on a 256-unit square.
- Icons use the fill weight. An entry can name another weight as `icon:weight`; only two do: `star:regular` (the outline "favorite" star, so it reads differently from the filled "unfavorite" one) and `check:bold`.
- `phosphor.ts` is generated. Never edit it by hand.

Three ways to draw an icon:

| Helper | Use for | Notes |
|---|---|---|
| `<PhIcon name size />` | A standalone icon (system tray, navigation bar, volume band) | An `<svg>` with `fill="currentColor"`, hidden from assistive technology |
| `ph(name, size, cx, cy)` | A glyph inside another SVG (app bar rings, the Start arrow) | Returns a `<path>` centred on `cx, cy` |
| `<Icon name size />` | Tile and app list glyphs | Maps app glyph names (`phone`, `people`, `music`) to Phosphor names |

To add an icon: add its Phosphor name to `NAMES` in the generator, run `npm run icons -w metroweb`, then map it in `glyphs.tsx` (app bar) or the phone's `start/icons.tsx` (tiles). Check the licence still covers it (all Phosphor icons are MIT).

## Sizes

All sizes are logical px. All are **Estimated** unless noted.

| Where | Glyph | Container | Notes |
|---|---|---|---|
| Medium and wide tiles | 84 | the tile | Centred; a count sits 12 px to the right |
| Small tiles | 44 | 99 × 99 tile | Count 6 px to the right |
| App list | 36 | 62 × 62 accent square | |
| App bar buttons | 24 | 48 px ring, radius 21.5, 3 px stroke | Stroke from `PhoneStrokeThickness` (Decoded) |
| Start arrow, app list search | 22 | 44 px ring, radius 19.5, 3 px stroke, in a 48 × 48 button | |
| System tray | 20 (signal, Wi-Fi, airplane), 18 (Bluetooth), 28 (battery) | 32 px tray | |
| Navigation bar | 30 | 120 × 64 button | |
| Volume band | 28 (speaker) | 48 px row | |
| Volume band media buttons | 44 px SVG of a 48-unit glyph | 52 px circle, 2 px border | |

## States

| Where | Rest | Pressed | Disabled |
|---|---|---|---|
| App bar button | Foreground ring and glyph | Ring filled with foreground, glyph in chrome colour | Whole button at 0.4 opacity |
| Volume band media button | Foreground ring and glyph | Filled with foreground, glyph in chrome colour | — |
| Navigation bar button | White | 0.5 opacity | — |
| Tile and app list glyph | White on accent | Tilts with the tile | — |

## Glyph map

| App or action | Phosphor icon |
|---|---|
| phone, people, messaging, Outlook | `phone`, `users`, `chat`, `envelope-simple` |
| calendar, Internet Explorer, Store, photos | `calendar-blank`, `globe`, `shopping-bag`, `image` |
| Music+Videos, Games, settings, camera, maps | `headphones`, `game-controller`, `gear`, `camera`, `map-trifold` |
| alarms, calculator, Wallet, Office, OneNote, Data Sense | `alarm`, `calculator`, `wallet`, `file-text`, `notebook`, `chart-pie-slice` |
| App bar: add, check, close, delete, edit, search | `plus`, `check`, `x`, `trash`, `pencil-simple`, `magnifying-glass` |
| App bar: send, refresh, favorite, pin | `paper-plane-right`, `arrow-clockwise`, `star` (regular), `push-pin` |
| App bar: play, pause, previous, next, shuffle, repeat | `play`, `pause`, `skip-back`, `skip-forward`, `shuffle`, `repeat`, `repeat-once` |
| Navigation bar: Back, Start, Search | `arrow-left`, `windows-logo`, `magnifying-glass` |

The full list is `GLYPHS` in `glyphs.tsx` and `start/icons.tsx`.

## Rules

- Glyphs are `currentColor`. They take the foreground colour, or white on accent. Never colour a glyph with the accent unless the phone does.
- One weight. Use fill unless there's a reason the phone draws an outline, and note the reason in the generator.
- App bar icons sit inside the ring the app bar draws. Don't draw your own ring.
- Icons are decoration for assistive technology; the button carries the `aria-label`.

## Open questions

- Microsoft's app bar icon guidance describes a smaller foreground area inside the 48 px icon than a strict 24 px; we haven't checked our glyph size against the SDK icon set. See [open questions](14-evidence.md#open-questions).
