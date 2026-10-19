# 13 · Web and accessibility deviations

> **Status** Draft · **Baseline** Windows Phone 8.0 · **Last reviewed** 2026-10-19
> **Code** [`src/App.tsx`](../../src/App.tsx) (history, keys, viewport), [`src/navigation.tsx`](../../src/navigation.tsx) (`inert` pages), [`src/components/modal.ts`](../../src/components/modal.ts) (popups), [`src/motion.ts`](../../src/motion.ts) (`prefersReducedMotion`), [`src/index.css`](../../src/index.css) (focus style), [`src/theme.ts`](../../src/theme.ts)
> **Sources** Source review; contrast computed with the WCAG 2 formula from the palette in `theme.ts`

[The phone wins](01-principles.md#rules-this-project-adds), except where a browser can't do what the phone does or where copying the phone would shut people out. This page lists both kinds of exception:

- A **deviation** is something the recreation does differently from the phone because it runs in a browser. Deviations are deliberate.
- A **gap** is a place where the recreation leaves some users out, whether by copying the phone or by falling short of it. Gaps are bugs. If fixing one would change how the phone looks, the fix needs a note here first.

## Input and navigation

| The phone | The recreation | Why |
|---|---|---|
| Hardware or capacitive Back, Start and Search keys | The 8.1 on-screen [navigation bar](11-system-ui.md#navigation-bar), always shown | A browser has no keys below the screen |
| Back key | Also browser Back and the Android back gesture, Escape, and Backspace when not typing. See [Browser and keyboard](08-navigation.md#browser-and-keyboard) | People expect browser Back to work; keyboard users need a Back key |
| Search key opens Bing | Does nothing, and is `aria-disabled` | Out of scope |
| Volume rocker | The desk's volume keys (at 1100 px and wider), **+** / **−** (also **=** / **_**), and the media volume keys | Phones' browsers don't pass the hardware keys to the page |
| Tapping the system tray shows all its indicators | Opens the [volume band](11-system-ui.md#volume-band). In a home-screen web app, tapping the top safe area does the same | Otherwise the volume band can't be reached on a phone |
| Touch only | Pointer events: mouse and pen drag pivots, panoramas and sliders, and tilt on press. Buttons also work from the keyboard | Desktop browsers |
| Press and hold (context menus, moving tiles) | Not implemented | Not built yet |
| The phone's on-screen keyboard and word suggestions | The device's own keyboard | A web page can't replace it |
| Calculator and the phone keypad take taps only | Both also take typed digits (and Calculator, operators) | Keyboard users |
| Pivots and panoramas move by swiping | Also by the left and right arrow keys: on a focused pivot header, or anywhere in a panorama outside a control that uses arrows. Focus follows to the new header | Keyboard users |

## Rendering

| The phone | The recreation | Why |
|---|---|---|
| A 480 × 800 logical screen, scaled to the panel | 480 px wide; narrower windows scale the whole screen down with a CSS transform, never up. Height follows the window. See [Canvas](02-canvas.md) | Fits every browser window |
| Segoe WP | Segoe WP or Segoe UI if installed, otherwise Selawik. See [Typography](04-typography.md#families) | Segoe WP can't ship |
| Segoe WP symbols and the SDK app bar icons | Phosphor icons. See [Iconography](06-iconography.md) | Microsoft's icons can't ship |
| Contact photos | Initials on a shaded accent square, in contact pictures and on the People tile | The sample contacts have no photos |
| Alarm tones from the phone | Tones synthesised with Web Audio ([`sounds.ts`](../../src/apps/alarms/sounds.ts)) | The phone's sounds can't ship |
| UIX animation engine | Web Animations and CSS transitions; easing curves are fits or estimates. See [Motion](07-motion.md) | The browser's animation engines |
| Text can't be selected outside text boxes | The same: `user-select: none` on the whole desk | Follows the phone, against web convention |
| App and page titles are stored in capitals (`CalendarRes` NEW TO-DO, `PhoneRes` PHONE) | The same on screen, but written lower case in source and upper-cased with CSS. See [Writing](12-writing.md#casing) | Screen readers read the source text, and some spell out words in capitals |

## Platform features

- **Storage.** Settings, contacts, messages, notes, alarms, events and photos are kept in `localStorage`. Clearing the site's data resets the phone.
- **Sound.** Browsers block audio until the user has tapped or pressed a key, so the alarm ringer unlocks audio on the first interaction. An alarm that rings before then can be silent.
- **Vibration.** The alarm ringer vibrates through `navigator.vibrate` where the browser supports it (Android, not iOS), and only after the user has interacted with the page.
- **Camera.** Uses `getUserMedia` and needs permission; without it the viewfinder shows a message instead.
- **Calls, texts and email.** Calls and texts are simulated. "send email" on a contact card opens a `mailto:` link.

## Contrast

Measured with the WCAG 2 contrast ratio. The thresholds that matter here: 4.5:1 for normal text, 3:1 for large text (24 px and up, or 18.67 px bold) and for the edges of controls.

The phone's colours are kept as they are. That leaves these failures, all in the light theme or with light accents:

| Pair | Dark | Light | Used for |
|---|---|---|---|
| Subtle text on background | 7.37 | **2.85** | Subtitles, secondary lines (Normal 20, so 4.5:1 applies) |
| Disabled text on background | 3.66 | **2.12** | Disabled list items and buttons (exempt from WCAG, but still hard to read) |
| Unselected pivot headers | 3.66 | **1.61** | SemiLight 53.333, so 3:1 applies |

Full palette contrast is in [Colour and theme](05-colour-and-theme.md#contrast-of-the-theme-colours).

### Accents

White text on an accent (tiles, pressed buttons) and accent text on the light background give the same ratio. Accent text on the dark background is the other column. Tile titles are Normal 18.667, so 4.5:1 applies.

| Accent | White on accent, or accent on white | Accent on black |
|---|---|---|
| Lime | **2.00** | 10.47 |
| Green | **2.92** | 7.18 |
| Emerald | 4.53 | 4.64 |
| Teal | **2.84** | 7.40 |
| Cyan | **2.90** | 7.24 |
| Cobalt | 6.19 | 3.39 |
| Indigo | 6.87 | 3.06 |
| Violet | 5.06 | 4.15 |
| Pink | **2.57** | 8.16 |
| Magenta | 5.04 | 4.17 |
| Crimson | 8.19 | **2.56** |
| Red (default) | 4.74 | 4.43 |
| Orange | **2.98** | 7.04 |
| Amber | **2.11** | 9.95 |
| Yellow | **1.68** | 12.53 |
| Brown | 6.09 | 3.45 |
| Olive | 3.96 | 5.30 |
| Steel | 4.68 | 4.48 |
| Mauve | 5.51 | 3.81 |
| Taupe | 4.31 | 4.88 |

Bold values are below 3:1. Below 4.5:1 there are more: Olive and Taupe on white; Cobalt, Indigo, Violet, Magenta, Red, Brown, Steel and Mauve on black.

Accent text appears in message snippets, missed calls, selected list picker rows, Calendar's today header and OneNote's list dates, among others.

The phone's own answer was its ease of access settings (high contrast and text size). The recreation's ease of access page is a placeholder, and `forced-colors` and `prefers-contrast` aren't handled.

## What the recreation already does

- Pages under the top one, unselected pivot items, panorama sections other than the current one, and the hidden Start pane are `inert` and `aria-hidden`.
- Popups (message boxes, full-screen popups, the accent picker, the alarm ringer) go through `useModal` in [`src/components/modal.ts`](../../src/components/modal.ts). While one is open, the running app, Start and any older popup are `inert`. Focus moves into the popup on open (a message box's first button, the current accent swatch, the ringer's dismiss, or a full-screen popup itself) and goes back on close to whatever had it. The navigation bar stays live, because Back has to work.
- Every popup is a `dialog` or `alertdialog` with a label and `aria-modal`.
- Pivot headers are a `tablist` of `tab`s, each controlling its `tabpanel`. Only the selected tab is in the tab order.
- Buttons, links and anything with a `tabindex` get a 2 px dashed accent outline on keyboard focus (`:focus-visible`). The looping selector, the speed dial and the alarm ringer's buttons have their own.
- Controls carry roles: `switch` (toggle switch), `listbox` and `option` (list picker), `spinbutton` (looping selector), `slider` (volume, seek), `radiogroup` (accent picker), `menu` (app bar menu), `alertdialog` (message boxes, alarm ringer), `grid` (Calendar month).
- A live tile's name includes what it shows: "messaging, 2 new", "phone, 1 missed", "calendar, next: Lunch with Anna, 12:30 PM", "alarms, next alarm 7:00 AM monday".
- Live regions announce the alarm-set toast (`status`), calendar reminders (`alert`), the calculator display, the phone keypad, in-call state, and new messages in a Messaging thread.
- Reduced motion is respected everywhere. See [Motion](07-motion.md#reduced-motion).
- The system tray is `aria-hidden`, since it duplicates nothing a screen reader user can act on.
- Search, on the navigation bar and in the app list, does nothing; both buttons are `aria-disabled` so they're announced as unavailable.

## Accessibility gaps

| Gap | Where | Effect | Fix |
|---|---|---|---|
| Light theme subtle, disabled and unselected pivot text; light accents | See [Contrast](#contrast) | Low-vision users | Can't change without changing the phone's palette; a high contrast setting would be the faithful fix |
| Browser zoom stops helping below 480 px | Everywhere | Zoom enlarges the phone until the window is 480 CSS px wide; past that the screen scales down to fit | Honour a text size setting, as the phone's ease of access did |
| Focus isn't placed on a new page | Every page transition | Nothing moves focus after navigating, so it falls back to the document and keyboard users start from the top | Focus the new page's title, or its first control, once the transition ends |
| Tab can leave the phone while a popup is open | Popups | Tab reaches the navigation bar and the desk's controls, though not the page behind | Acceptable while Back must stay reachable; a full focus trap would need its own Back key |
| Photos have no text alternative | Photos viewer and albums | Pictures are `alt=""` | Name them by date taken, as the viewer's info line does |

## Rules for new work

- Use `useTilt` and a real `button` for anything pressable. Never put a click handler on a `div`.
- Give every popup a role, a label and `aria-modal`, and call `useModal` on its root element.
- Guard every animation with `prefersReducedMotion()`, or add a `prefers-reduced-motion` block for CSS animations and transitions.
- Don't put anything a user must read to finish a task in subtle or disabled text.
- When you add a deviation or find a gap, add it to this page in the same change.
