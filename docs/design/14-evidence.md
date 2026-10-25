# 14 · Evidence appendix

> **Status** Draft · **Baseline** Windows Phone 8.0 · **Last reviewed** 2026-10-26
> **Evidence** [`docs/evidence/`](../evidence/README.md) (tools and measurements; the Microsoft files are kept private)

Where every value in these pages came from, what is still unknown, and what only a real phone can settle.

## Sources

| Source | What it gave | Label | Kept in |
|---|---|---|---|
| Windows Phone SDK 8.0 emulator image | Theme XAML (palettes, type ramp, margins, text styles); `System.Windows.xaml` (default button and text box templates); registry (accents, default theme and accent, Settings order); app manifests (tile templates); en-US string tables (Settings titles, accent names, app names, confirmations); UIX markup in `ShellControls.dll` and others (tile flip keyframes, motion value names) | Decoded | `theme/`, `uix/` and `strings/` in the private evidence; decoders in [`uix/tools/`](../evidence/uix/tools) and [`strings/`](../evidence/strings) |
| Windows Phone Toolkit (Silverlight) source | `TurnstileTransition`, `TurnstileFeatherEffect`, `SwivelTransition`, `TiltEffect`, `ToggleSwitch`, `ListPicker`, `DatePicker`, `TimePicker`, `LoopingSelector` | Toolkit | Not copied; cite the class |
| YouTube `38SziMGTUiw` (Windows Phone 8.0) | The Games hub intro | Fitted | [`footage/`](../evidence/footage/README.md) |
| YouTube `RNSggiWpmxM` (Windows Phone 8.1) | Start and app list feather, app launch, Office hub intro, Settings pivot, drill in and back, Music and Games hubs | Fitted, Estimated | [`footage/`](../evidence/footage/README.md) |
| Own 240 fps recordings of a WP8.1 phone (`IMG_0884.mov`, `IMG_0887.mov`) | Native page turn (angle per frame, duration, perspective), feather-out stagger and duration, Messaging's conversation drop | Fitted, Estimated | [`footage/`](../evidence/footage/README.md) |
| Matching by eye | Most sizes not in the theme XAML: tray, navigation bar, volume band, tile content, message boxes | Estimated | Nothing kept |

No screenshots of the real phone or emulator are kept. The footage contact sheets, in the private evidence, are the only stored pictures of real phones, so every value matched by eye is **Estimated** and appears below as needing a device.

The emulator image itself is unpacked to `extracted/` next to the project, outside the repository. The files taken from it, and the frames from the footage, are kept in `docs/evidence/private/`, a private repository of their own. [`docs/evidence/README.md`](../evidence/README.md) lists each one and its original path.

## Open questions

Things the evidence names but doesn't settle. Each links to the page that uses the value.

### Type and layout

- **Panorama section header size.** `PanoramaItemHeaderFontSize` is 66 in the theme XAML, but native hubs in footage look closer to 53.333, which the recreation uses. The XAML value may be for Silverlight panoramas only. See [Typography](04-typography.md#type-ramp) and [Components](09-components.md#panorama).
- **App bar glyph size.** Microsoft's app bar icon guidance describes a smaller foreground area inside the 48 px icon than a strict 24 px. The recreation's glyphs haven't been checked against the SDK icon set. See [Iconography](06-iconography.md#open-questions).
- **Tile template metrics.** `TileTemplateFlipMessageMargins`, `TileTemplateFlipNotificationFontSize` and the other `TileTemplate*` values are named in the UIX markup but not decoded. See [Start and live tiles](10-start-and-live-tiles.md#open-questions).

### Motion

- **Native motion values.** `TurnstileFeatherPixelDelay`, `ContinuumForwardShowXOffset`, `TileFeatherDelay_GridX`, `TileFeatherDelay_Y` and `TileFeatherDelay_YMax` are decoded as names, but their values sit in UIX bytecode that hasn't been decoded. The recreation uses frame counts and fits instead. See [Motion](07-motion.md#turnstile-feather).
- **Turnstile angles.** Estimated from 8.1 footage; 8.0 may differ. The native 75° start fits the 240 fps footage but isn't pinned down by it (a steeper start fits nearly as well). See [Motion](07-motion.md#turnstile).
- **Native backward turns.** `backwardIn` and `backwardOut` durations mirror the forward ones; only forward turns and the conversation drop were measured.
- **Continuum about X.** The returning label looks squashed vertically in 240 fps 8.1 footage, so continuum may also turn about X. Not measured. See [Motion](07-motion.md#continuum).
- **Start feather camera.** Tiles use the page feathers' screen-centred camera without a separate fit. See [Motion](07-motion.md#start-feather).
- **Hub intro lag.** The recreation trails the 8.0 Games hub by one or two frames between 200 and 500 ms. See [Motion](07-motion.md#hub-intro) and the side by side, `hub-intro-compare.jpg`, in the private evidence.
- **Hub intro samples.** [`fits/fit.mjs`](../evidence/fits/fit.mjs) holds the samples, in seconds into their clip (6.93 to 7.9 s), without saying which clip. They don't match the Games hub at 98.665 s in `38SziMGTUiw`; they are most likely the 8.1 Office hub opening in `RNSggiWpmxM`, a few seconds after the launch in `t5_office_launch1.jpg` (private evidence). Re-measure and record the clip before relying on the fit.
- **Pivot content cascade.** Estimated from 8.1 footage. See [Motion](07-motion.md#other-motion).
- **SCurve.** The tile flip keyframes use an interpolation called SCurve whose shape wasn't decoded; the recreation mirrors Exp about the midpoint. See [Start and live tiles](10-start-and-live-tiles.md#curves).
- **`VerticalCellFlipShow` time scale.** It is wrapped in `TimeScale 0.5` in the markup; the recreation doesn't apply it.
- **Cell flip duration.** `FlipCellDurationMin` and `FlipCellDurationMax` (and their 3 × 3 variants) aren't decoded; the recreation plays cell flips over 1000 ms.

### Writing

- **Messaging day separators.** The recreation writes "Today" and "Yesterday"; the string tables searched have only a lower-case "yesterday". See [Writing](12-writing.md#known-inconsistencies).

## What still needs a device

Nothing is **Verified** yet. These checks would settle the most values for the least effort, roughly in order.

| Check | Settles | Pages |
|---|---|---|
| Record app launch, Back, drill in and Start on an 8.0 phone at 60 fps or more | Turnstile angles, feather stagger, Start feather delays, continuum | [Motion](07-motion.md) |
| Record a hub opening and a pivot swipe on 8.0 | The hub intro lag, the pivot content cascade | [Motion](07-motion.md#hub-intro) |
| Screenshot a native hub and a Silverlight panorama at 480 × 800 | The panorama header size, panorama margins | [Components](09-components.md#panorama) |
| Screenshot the tray (tapped and not), the volume band, and a message box in Messaging, People, Photos, OneNote and Calendar | Tray, volume band and message box metrics | [System UI](11-system-ui.md), [Components](09-components.md#message-box) |
| Watch a People tile and a flip tile for a few minutes | Cell flip duration, the SCurve shape, flip spacing | [Start and live tiles](10-start-and-live-tiles.md#flip-motion) |
| Screenshot an app bar with icons, expanded and not | Glyph size inside the ring | [Iconography](06-iconography.md) |
| Read the confirmations and day separators in Messaging, People, Photos, Phone and Calendar | The open items in Writing | [Writing](12-writing.md#known-inconsistencies) |
| Press and hold a list item and a tile with tilt | Whether native tilt matches the Toolkit's `TiltEffect` | [Motion](07-motion.md#tilt) |
| Open an 8.1 image's registry | Whether 8.1 kept the 20 accents | [Colour and theme](05-colour-and-theme.md#accents) |

On phones with Windows Phone 8 Update 3 or later, Microsoft's Project My Screen app mirrors the screen to a PC over USB, which gives straight frames without the rectifying step in [`footage/tools`](../evidence/footage/tools).

### Recording a check

When a device settles a value:

1. Put the recording or screenshots (or a contact sheet of them) in `docs/evidence/private/device/` (they show Microsoft's UI, so they stay private), named for what they show, with a note of the phone model, OS version and build, and the date.
2. Change the value's label to **Verified** on its page and in any table that repeats it.
3. If the value changes, change the code in the same commit and regenerate the assets (`npm run docs:assets`).
4. Remove the item from this page.
