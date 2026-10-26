# 10 · Start and live tiles

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-26
> **Code** [`apps/web/src/start/StartScreen.tsx`](../../apps/web/src/start/StartScreen.tsx), [`apps/web/src/start/Tile.tsx`](../../apps/web/src/start/Tile.tsx), [`apps/web/src/start/apps.ts`](../../apps/web/src/start/apps.ts), [`apps/web/src/start/tileFlip.ts`](../../apps/web/src/start/tileFlip.ts), [`apps/web/src/start/icons.tsx`](../../apps/web/src/start/icons.tsx)
> **Sources** App manifests in `Windows\System32\Manifests` (tile templates); `ShellControls.dll` UIX markup (flip animations, decoded by [`anims.py`](../evidence/uix/tools/anims.py) into `anims_shell.txt`, kept private); 8.1 footage (feather timing)

Start is the home screen: a scrolling grid of tiles in the accent colour, with the app list one swipe to the right. Tiles are live: they flip, cycle and update on their own.

Start is there so a glance tells you what's new without opening anything. In the words of Microsoft's Metro booklet, "the people and things you care about most appear as soon as you start up", and when their status changes you see it at once. That's why a tile shows information (a count, the next appointment, the latest photo) where other phones show a fixed icon, and why the tiles stay readable even blurred: big blocks of colour and big numbers survive where small icons don't. See [Checking a screen](01-principles.md#checking-a-screen).

![Start, dark](assets/screenshots/start-dark.png) ![App list](assets/screenshots/app-list.png)

## Panes

Start is a 960 px strip of two 480 px panes that scroll vertically.

| Pane | Contents |
|---|---|
| Tiles | The tile grid, then a 48 px arrow button (44 px ring) at the bottom right that opens the app list |
| App list | A 48 px search button (not wired up yet), then every app sorted by display name, ignoring case |

- Swipe horizontally (locks after 14 px) to switch panes. It commits past 120 px or at a flick of 0.45 px/ms and settles in 350 ms. Past either end the strip follows at a third of the finger's speed.
- The pane that isn't showing is `inert`.
- Live tiles only run while the tiles pane is showing and no app is open.

## Tile grid

Measurements are in [Layout](03-layout.md#start). In short: four 99 px columns, 12 px gaps, 24 px side padding, packed densely in row order.

| Size | Cells | px | Title | Glyph |
|---|---|---|---|---|
| Small | 1 × 1 | 99 × 99 | none | 44 px |
| Medium | 2 × 2 | 210 × 210 | Normal 18.667, 12 px in, 6 px up | 84 px |
| Wide | 4 × 2 | 432 × 210 | as medium | 84 px |

Tiles are always the accent colour with white content, in both themes. A count sits to the right of the glyph (Normal 53.333, or 26.667 on small tiles).

The image has no default Start layout (the phone writes one on first boot), so `DEFAULT_LAYOUT` in `apps.ts` is composed by hand.

## Templates

Each app's tile template comes from the `PrimaryToken` in its manifest (**Decoded**). The recreation implements these:

| Manifest template | `live.kind` | Apps | What it does | Timing |
|---|---|---|---|---|
| `TemplateMetroCount` | `iconic` | phone, messaging, Outlook, Store, camera, maps, calculator, settings, Internet Explorer, Games | Glyph and an optional count | — |
| `TemplateFlip` | `flip` | OneNote, Office, Wallet, Data Sense | Flips between the front and a back with a title and lines of text | Every 6–10 s |
| `TemplateFlip` | `alarm` | alarms | Flips to the next alarm's time and day while one is on | Every 6–10 s |
| `TemplatePeople` | `people` | people | A grid of contact pictures (3 × 3 medium, 6 × 3 wide); single cells flip to other contacts | A cell every 2.2–4.2 s (the markup waits 0.5–2 s; see [People cell flips](#people-cell-flips)) |
| `TemplateCycle` | `cycle` | photos | Pictures pan up into the tile one after another (camera roll, then sample pictures) | Every 5–7 s |
| `TemplateCalendar` | `calendar` | calendar | The next appointments in the coming week; today's day number and name where the title would be | Flips to the next appointment every 8–11 s |
| `TemplateMusicVideo` | `music` | Music+Videos | The album last played (or, on a wide tile, its artist's picture) | — |

Intervals are **Estimated**. Each tile picks a random delay in its range (the shell's `GetRandomAnimationDelay`, a **Decoded** name), so tiles never move in step.

Counts: messaging shows unread threads and phone shows missed calls, both from app data; Outlook (5) and Store (3) are fixed.

A tile's accessible name is its title plus what it says: its count ("phone, 1 missed"; "messaging, 2 new"), Calendar's next appointment, or the next alarm. The wording is the project's own (**Estimated**). Tests and scripts find tiles by `data-app`, which doesn't change.

Not implemented: `TemplateGames`, `TemplateGroup` and `TemplateDeepLink`, and tile notifications that interrupt a flip (`Template1112_FlipNotificationInterruptDuration`).

### Rules for live tiles

- Live behaviour runs only while Start's tiles are visible.
- Small tiles never animate; they show their glyph (or, for calendar, the day number).
- Nothing animates under reduced motion.
- Flip tiles turn over as a whole, background and all.

## Flip motion

Decoded from `FlipTile.uix` and `FlipGrid.uix` in `ShellControls.dll`. Each flip is two tracks that play together: the outgoing face's (hide) and the incoming face's (show). At the **swap** time the outgoing face disappears and the incoming one appears, both edge-on, so one element can play the hide track up to the swap and the show track after it.

![A live tile flipping](assets/strips/tile-flip.jpg)

### Tile flips

The shell picks one of three variants at random for each flip. The markup times are halved by the `TimeScale 0.5` that wraps the tile flips; the times below are after halving. Tiles turn about their horizontal axis (`rotateX`) with `perspective(800px)` (Estimated).

| Variant | Hide track | Show track | Swap |
|---|---|---|---|
| 1 | 0° → 90° by 250 ms (Exp, weight 10) | −90°, held to 250 ms → 0° by 750 ms (Log, 150) | 250 ms |
| 2 | 0° → 215° by 183 ms (Log, 10) | −180° → 35° by 183 ms (Log, 10) → −6° by 417 ms (SCurve, 10) → 0° by 625 ms (SCurve, 10) | 40 ms |
| 3 | 0° → −30° by 125 ms (SCurve, 10) → 200° by 292 ms (SCurve, 10) | −210°, held to 125 ms → 20° by 292 ms (SCurve, 10) → 0° by 458 ms (SCurve, 10) | 209 ms |

All keyframes are **Decoded**.

### People cell flips

Cells use `NormalizedCellFlip*` on a timeline normalized to 0–1. The recreation plays it over 1000 ms (Estimated), which matches the markup for horizontal cells: `HorizontalCellFlipShow` has `TimeScale` 1. `VerticalCellFlipShow` has `TimeScale` 0.5, which multiplies every keyframe time, so vertical cells show over 500 ms; the recreation doesn't apply it. Hides take 137 ms either way. **Decoded**.

`FlipCellDurationMin` / `Max` are 500 / 2000 ms (200 / 2000 ms for the 3 × 3 variants). They aren't the length of a flip: they bound the random wait before the next cell flips (`Random.Next(min, max)` feeds the grid's timer). **Decoded**; how the code uses them is read from bytecode whose method names are only partly resolved. If nothing native adds idle time, the phone flips a cell every 0.5–2 s, faster than the recreation's 2.2–4.2 s.

| Track | Keyframes | Swap |
|---|---|---|
| Hide | 0° → 90° by 0.137 (Log, 1.99) | 0.12 |
| Show | −180° → 0° by 1.0 (Log, 150) | |

Horizontal cells turn about the X axis; vertical ones play the same motion about Y. Half the flips pick each, at random, with `perspective(300px)` (Estimated).

### Curves

Iris (the phone's animation engine) interpolations as `uixrender` computes them, with weight `w`:

- **Exp** eases in: `(wᵗ − 1) / (w − 1)`.
- **Log** eases out: the mirror of Exp.
- **SCurve**: Exp over the first half and Log over the second, each at double speed: `E(2t) / 2` before the midpoint, `1/2 + L(2t − 1) / 2` after it, the same as `ExponentialEase` EaseInOut with exponent `ln w`. **Decoded** from `uixrender.dll` in the 8.1 emulator; that this evaluator is the markup's SCurve follows the engine's order of interpolation kinds, which wasn't traced. The recreation's Exp mirrored about the midpoint is the same curve. Cell flips don't use it: they use Log.

They have no CSS equivalent, so `tileFlip.ts` samples each track into keyframes every 8 ms.

### Cycle

The cycle tile pans a two-picture strip up by one tile height in 1200 ms (`cubic-bezier(0.45, 0, 0.2, 1)`), then swaps in the next picture. Estimated.

## Tile content details

| Tile | Detail | Source |
|---|---|---|
| Flip back | Lines of Normal 20 (line height 1.3) 8 px from the top, 12 px in; the back's title replaces the app name | Estimated; Normal 20 agrees with `TileTemplateNormalFontSize` (15 pt), and the 12 px with `TileTemplateContentMarginLeftBottom` (12, 0, 0, 12) |
| Calendar | First line (the event title) SemiBold; title row: day number (32 px) and weekday; lines show title, location and when ("all day", "9:00 AM", "Tue 9:00 AM") | Estimated |
| Calendar, small | The day number, Normal 42.667, centred | Estimated |
| People | Contacts have no photos, so each cell is the contact's initials (SemiLight 26.667) on one of four shades of the accent | Estimated (a [deviation](13-web-and-accessibility.md#rendering)) |
| Music | Album or artist art fills the tile; the title gets a soft shadow | Estimated |

## Not implemented

- Pinning, unpinning, resizing and moving tiles (press and hold).
- Wide tiles for every app; the tile sizes in `DEFAULT_LAYOUT` are fixed.
- 8.1's six-column layout, transparent tiles and Start background. Its markup has the layout as screen-size variants (`480x800s20`, `s30`): six columns of 66 px cells with 12 px gaps, tile text at 10.5 pt rather than 15 (**Decoded (8.1)**). Which phones use which variant isn't decoded.
- Letter groups and the jump list in the app list.
- The lock screen.

## Open questions

- `TileTemplate*` values are now decoded from the 8.0 markup but not applied: `TileTemplateFlipNotificationFontSize` 24 pt (32 px), `TileTemplateFlipMessageMargins` (0, 0, 0, 0), `TileTemplateFlipTileMessageTitleTextMargins` (0, 0, 0, 8), and a 37 × 37 notification indicator 12 px from the top-right corner at 17 pt. `TileTemplateFlipMessageLineSpacing` is 9, in a unit that isn't known yet.
- The recreation doesn't apply `VerticalCellFlipShow`'s `TimeScale 0.5` (500 ms vertical cell flips) or the 0.5–2 s wait between cell flips.

See [Evidence](14-evidence.md#open-questions).
