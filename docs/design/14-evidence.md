# 14 · Evidence appendix

> **Status** Draft · **Baseline** Windows Phone 8.0 · **Last reviewed** 2026-10-26
> **Evidence** [`docs/evidence/`](../evidence/README.md) (tools and measurements; the Microsoft files are kept private)

Where every value in these pages came from, what is still unknown, and what only a real phone can settle.

## Sources

| Source | What it gave | Label | Kept in |
|---|---|---|---|
| Windows Phone SDK 8.0 emulator image | Theme XAML (palettes, type ramp, margins, text styles); `System.Windows.xaml` (default button and text box templates); registry (accents, default theme and accent, Settings order); app manifests (tile templates); en-US string tables (Settings titles, accent names, app names, confirmations); UIX markup in `ShellControls.dll`, `UIXMobileAssets480x800.dll` and `startmenu.dll` (tile flip keyframes, native turnstile and Start feather keyframes, hinges, camera eye and easing weights) | Decoded | `theme/`, `uix/` and `strings/` in the private evidence; decoders in [`uix/tools/`](../evidence/uix/tools) and [`strings/`](../evidence/strings) |
| Windows Phone 8.1 SDK Update 1 emulator image (build 8.10.14141, 2014-07-15) | The same theme XAML (byte for byte the 8.0 light and dark themes), registry (accents, defaults, Settings order) and UIX markup, including `MessagingUI.dll`'s (which elements of Messaging take part in continuum). Decoding 8.1's UIX format also decoded the 8.0 values that had stayed open: continuum, panorama type, tile template metrics, cell flip timing, tray padding | Decoded (8.1); the 8.0 values Decoded | `theme/wp81/`, `registry/` and `uix/wp81/` in the private evidence; decoders in [`uix/tools/`](../evidence/uix/tools) and [`registry/tools/`](../evidence/registry/tools) |
| Windows Phone 8.1 SDK Update 1 emulator image, native code (`Windows.UI.Xaml.Phone.dll`, `Windows.UI.Xaml.dll`, `uixrender.dll`, x86) | WinRT's turnstile, continuum and slide page transitions; `PlaneProjection`'s camera; the UIX renderer's default camera and its interpolation formulas, including SCurve | Decoded (8.1 WinRT, 8.1); a few readings Candidate | `native/wp81/` in the private evidence; tools in [`native/tools/`](../evidence/native/tools) |
| Windows Phone 8.1 SDK WinRT theme (`generic.xaml`, `themeresources.xaml`) | Default styles, metrics and storyboards for 8.1's new app model, in view pixels (8.0 px × 0.8). Corroborates several Estimated sizes; differs on the app bar label, the toggle switch and the list picker easing | Decoded (8.1 WinRT) | `theme/wp81-winrt/` in the private evidence, with the comparison `winrt-xaml.md`; readers in [`theme/tools/`](../evidence/theme/tools) |
| Lumia 520 retail firmware (RM-914, 3058.50000.1425.0004, Indonesia; build 8.10.12393.890) | A shipping phone's MainOS: the same Silverlight theme files, accent table and `DefaultAccent` (Cobalt) as the 8.1 emulator, and no maker override of the accent; Nokia adds ringtones, wallpapers and pinned tiles, not theme values. Its UIX motion (turnstile, panorama, pivot, tile flips, tray, app bar) is identical to the emulator's | Decoded (8.1) | `registry/` and `uix/lumia520/` in the private evidence; unpacked with [`ffu/ffu2img.py`](../evidence/ffu/ffu2img.py) |
| Windows Phone Toolkit (Silverlight) source | `TurnstileTransition`, `TurnstileFeatherEffect`, `SwivelTransition`, `TiltEffect`, `ToggleSwitch`, `ListPicker`, `DatePicker`, `TimePicker`, `LoopingSelector` | Toolkit | Not copied; cite the class |
| YouTube `38SziMGTUiw` (Windows Phone 8.0) | The Games hub intro | Fitted | [`footage/`](../evidence/footage/README.md) |
| YouTube `RNSggiWpmxM` (Windows Phone 8.1) | Start and app list feather, app launch, Office hub intro, Settings pivot, drill in and back, Music and Games hubs | Fitted, Estimated | [`footage/`](../evidence/footage/README.md) |
| Own 240 fps recordings of a WP8.1 phone (`IMG_0884.mov`, `IMG_0885.mov`, `IMG_0887.mov`) | Start tile and app list 3D feathering, native page turns and feather stagger, Calculator feathering, Messaging's conversation drop | Fitted, Estimated | [`footage/`](../evidence/footage/README.md) |
| Matching by eye | Most sizes not in the theme XAML: tray, navigation bar, volume band, tile content, message boxes | Estimated | Nothing kept |

The 8.1 SDK image, the WinRT theme and the Lumia firmware were unpacked to `extracted-81/` next to the project, outside the repository.

No screenshots of the real phone or emulator are kept. The footage contact sheets, in the private evidence, are the only stored pictures of real phones, so every value matched by eye is **Estimated** and appears below as needing a device.

The emulator image itself is unpacked to `extracted/` next to the project, outside the repository. The files taken from it, and the frames from the footage, are kept in `docs/evidence/private/`, a private repository of their own. [`docs/evidence/README.md`](../evidence/README.md) lists each one and its original path.

### Design guidance

These sources give reasons and usage rules, not values, so nothing they say carries a source label. All three are about Windows Phone 7; the ideas carried over to 8.0 unchanged.

| Source | What it gave | Used in |
|---|---|---|
| Microsoft, *Introducing Windows Phone design system, codename: Metro* (Windows Phone 7 Series booklet, about 2010) | Metro's definition ("modern and clean, fast and in motion, about content and typography, entirely authentic"), its roots in transit signage, the Life Maximizer audience, and the Red Threads (Personal, Relevant, Connected). Its pictures are marketing art, not the phone's UI: its headlines are in capitals, and its rings take the accent | [Principles](01-principles.md#where-metro-comes-from), [Start and live tiles](10-start-and-live-tiles.md) |
| David Chen, *Metro UI / Interaction Design Guidelines*, Microsoft Tech Days 2011 (Taipei, 2011-09-15) | "Designed to get you in and out and back to life"; Start as a glance, and the blurred Start screen next to iOS and Android; Microsoft's WP7 guidelines for pivots and panoramas, quoted on its slides | [Principles](01-principles.md#checking-a-screen), [Components](09-components.md#pivot-or-panorama) |
| dorizztd, *The principles of Microsoft Metro UI decoded* (Medium, 2011-02-08) | Microsoft's five principles with their objectives, and a critique of where WP7 fell short of them: headers and lists too close in scale, no separation between messages, keys with no edges, pale colours in daylight | [Principles](01-principles.md#microsofts-five-principles) |

The booklet and the slides aren't kept in the evidence: they hold Microsoft's pictures, so a copy would belong in the private evidence.

## Open questions

Things the evidence names but doesn't settle. Each links to the page that uses the value.

### Type and layout

- **Panorama sizes: decoded, not applied.** The native panorama's markup (`UIXMobileAssets480x800`, the same in 8.0 and 8.1) gives the section header as `PanoramaGroupHeaderFontSize` 50 pt (66.667 px), agreeing with the XAML's `PanoramaItemHeaderFontSize` 66; the title as `PanoramaTitleFontSize` 128 pt (170.667 px); and the sections' top as `PanoramaHeaderMargins` 191 px. The recreation's 53.333, 133.333 and 146 were matched to 8.1 footage, and they are almost exactly 8.1's six-column `s30` variant scaled to a 480 px width (52, 133.12 and 148.9), so the footage was most likely of a large-screen phone in six-column mode. For the 8.0 baseline the decoded values are the ones to use; moving to them changes the panorama's layout and needs new screenshots. See [Typography](04-typography.md#type-ramp), [Layout](03-layout.md#panorama) and [Components](09-components.md#panorama).
- **App bar glyph size.** Microsoft's app bar icon guidance describes a smaller foreground area inside the 48 px icon than a strict 24 px. The recreation's glyphs haven't been checked against the SDK icon set. See [Iconography](06-iconography.md#open-questions).
- **Tile template metrics.** The 8.0 `TileTemplate*` values are decoded but not applied; `TileTemplateFlipMessageLineSpacing` and the other `LineSpacing` values are in a unit that isn't known. See [Start and live tiles](10-start-and-live-tiles.md#open-questions).
- **Six-column variants.** 8.1's markup has `s20` and `s30` variants of every screen size (six Start columns, smaller type). They look like physical screen-size buckets, but the code that picks one is native.

### Motion

- **Continuum.** The recreation plays 8.1's decoded continuum. Three readings in it are open: the forward show's scale curve (interpolation kind 7, `EaseIn` 10, 0.5, played as WinRT's `PowerEase` 2), the back show's pivot, and the sign of the turn about X, which can't be seen without a camera and the recreation doesn't give the turn one. The 8.0 offsets, durations and keyframes are decoded too (forward hide 300, 100 over 180 ms; forward show from 300, −60 over 250 ms; back show from −200, −200 over 200 ms; back hide shrinks to 0.85 and fades over 300 ms), but the 8.0 switch still plays the older estimates. Whether 8.0's forward-hide X is relative to the start position depends on a `RelativeTo` flag that isn't decoded. See [Motion](07-motion.md#continuum).
- **Start's 8.1 hinges.** 8.1's Start turns each carry a `CenterPointPercent`, while `GRIDADAPTER.UIX` still sets `TileCenterPointPercent` (−0.3) on every tile, after attaching them. The recreation reads the animation's value as overriding the item's, as it must for `GRIDCELL.UIX`'s `EnterRearrangeClick` to scale a tile about its centre; the renderer code that decides it wasn't traced. See [Motion](07-motion.md#start-feather).
- **Hub intro lag.** The recreation trails the 8.0 Games hub by one or two frames between 200 and 500 ms. See [Motion](07-motion.md#hub-intro) and the side by side, `hub-intro-compare.jpg`, in the private evidence.
- **Hub intro samples.** [`fits/fit.mjs`](../evidence/fits/fit.mjs) holds the samples, in seconds into their clip (6.93 to 7.9 s), without saying which clip. They don't match the Games hub at 98.665 s in `38SziMGTUiw`; they are most likely the 8.1 Office hub opening in `RNSggiWpmxM`, a few seconds after the launch in `t5_office_launch1.jpg` (private evidence). Re-measure and record the clip before relying on the fit.
- **Pivot content cascade.** Estimated from 8.1 footage. See [Motion](07-motion.md#other-motion).
- **Cell flips: decoded, not applied.** `VerticalCellFlipShow`'s `TimeScale 0.5` makes vertical cell flips 500 ms, and `FlipCellDurationMin` / `Max` (500 / 2000 ms) bound the random wait between cell flips, not the flip itself. The recreation plays every cell flip over 1000 ms, one every 2.2–4.2 s. See [Start and live tiles](10-start-and-live-tiles.md#people-cell-flips).
- **Feather maximum delay.** `TurnstileFeatherMaximumDelay` is 0.3 s, the delay at the bottom of an 800 px screen; the recreation's 220 ms is an estimate. See [Motion](07-motion.md#turnstile-feather).
- **Turnstile camera.** App page turns, the feather and the launch from Start set no camera in the markup, so they use `uixrender`'s default camera. Its values are decoded, but not whether it spans the screen's width or height, so its distance is 960 or 1600 px; 8.1 footage fits 1250 to 1290 px with a hinge on the screen plane, against the recreation's 1000. The cameras the markup does set (`Eye` −1000) don't map to CSS one to one: the hub intro fits 1670 px. `CenterPointPercent`'s Z (100 in 8.1) is most likely a hinge 100 px behind the page, as WinRT's turnstile has, but the code that reads it wasn't found. See [Motion](07-motion.md#camera).
- **8.1 WinRT transition directions.** The page transition builders in `Windows.UI.Xaml.Phone.dll` take a mode number; which number is forward or back, in or out, is read from the values, not traced. See [Motion](07-motion.md#windows-phone-81-winrt).
- **8.1 interpolation kind 10.** 8.1's markup adds an interpolation whose three parameters are the integers 1, 1 and 12. `uixrender` has WPF-style `BounceEase` and `ElasticEase` evaluators that both take three integers; the order of kinds points to Elastic (EaseOut, one oscillation, springiness 12), a Candidate. It is used by `GRIDDRAG.UIX`, not by anything the recreation builds.

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
| Watch a People tile and a flip tile for a few minutes | Cell flip duration, flip spacing, and that 8.0's SCurve matches the shape decoded from 8.1's renderer | [Start and live tiles](10-start-and-live-tiles.md#flip-motion) |
| Screenshot an app bar with icons, expanded and not | Glyph size inside the ring | [Iconography](06-iconography.md) |
| Read the confirmations and day separators in Messaging, People, Photos, Phone and Calendar | The open items in Writing | [Writing](12-writing.md#known-inconsistencies) |
| Press and hold a list item and a tile with tilt | Whether native tilt matches the Toolkit's `TiltEffect` | [Motion](07-motion.md#tilt) |
| Screenshot an expanded app bar on 8.0 | Whether the label is 16 px (ours) or nearer the 8.1 WinRT 12 px | [Components](09-components.md#app-bar) |
| Record a toggle switch on 8.0 | Border width, fill inset, thumb height and the On/Off weight, which 8.1 WinRT draws differently | [Components](09-components.md#toggle-switch) |

On phones with Windows Phone 8 Update 3 or later, Microsoft's Project My Screen app mirrors the screen to a PC over USB, which gives straight frames without the rectifying step in [`footage/tools`](../evidence/footage/tools).

### Recording a check

When a device settles a value:

1. Put the recording or screenshots (or a contact sheet of them) in `docs/evidence/private/device/` (they show Microsoft's UI, so they stay private), named for what they show, with a note of the phone model, OS version and build, and the date.
2. Change the value's label to **Verified** on its page and in any table that repeats it.
3. If the value changes, change the code in the same commit and regenerate the assets (`npm run docs:assets`).
4. Remove the item from this page.
