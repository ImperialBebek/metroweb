# 08 · Navigation model

> **Status** Draft · **Baseline** 8.0 behaviour, 8.1 on-screen keys · **Last reviewed** 2026-10-19
> **Code** [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) (launch, `back`, `start`, history guard, keys), [`packages/metroweb/src/navigation.tsx`](../../packages/metroweb/src/navigation.tsx) (`PageStack`, `useNavigation`), [`packages/metroweb/src/components/PhoneFrame.tsx`](../../packages/metroweb/src/components/PhoneFrame.tsx) (keys, for apps built on the package), [`apps/web/src/start/StartScreen.tsx`](../../apps/web/src/start/StartScreen.tsx), [`apps/web/src/apps/registry.ts`](../../apps/web/src/apps/registry.ts)
> **Sources** Windows Phone 8 behaviour as seen in the emulator and footage

The phone has one way in (Start) and one way back (the Back key). Every app is a stack of pages. There are no tabs, hamburger menus or close buttons.

## The parts

| Part | What it is |
|---|---|
| **Start** | Two panes side by side: the tile grid and the app list. Swipe left or tap the arrow for the app list; Back or swipe right returns to the tiles. |
| **App** | One running app at a time, mounted in `.app-host`. Each app owns a `PageStack`. |
| **Page stack** | The app's pages, newest on top. All pages stay mounted (hidden, `inert`, `aria-hidden`), so going back restores scroll positions and pivot items. |
| **Popups** | Full-screen pickers, message boxes and the expanded app bar sit over the top page and take Back first. |
| **Back, Start, Search** | The three keys in the [navigation bar](11-system-ui.md#navigation-bar). |

## What each key does

| Where you are | Back | Start |
|---|---|---|
| Start, tiles | Nothing | Scrolls the tiles to the top |
| Start, app list | Returns to the tiles | Returns to the tiles |
| App, a popup or expanded app bar open | Closes the popup or app bar | Leaves the app |
| App, a page above the first | Goes back one page | Leaves the app |
| App, its first page | Leaves the app (the page turns out backward, then Start feathers in) | Leaves the app (the page turns out forward, Start jumps to the tiles and feathers in) |

Search does nothing yet.

## Launching and leaving

1. Tapping a tile or app list item feathers Start out, the tapped item last ([Start feather](07-motion.md#start-feather)).
2. The app mounts with `PageStack enter`, so its first page feathers in.
3. Leaving the app turns its top page out, unmounts it and feathers Start back in, on the same frame, while the tiles are still held invisible.

Input is ignored while a transition runs (`busy`), so double taps can't open two pages.

## Browser and keyboard

A web page has no Back key of its own, so the recreation borrows the browser's.

- **Browser Back** (and the Android back gesture) acts as the phone's Back. While anything is open, one extra history entry sits on top so Back stays inside the phone; it is removed again when you return to Start's tiles, so Back from there leaves the site.
- **Escape**, and **Backspace** when not typing, press Back.
- **+** / **−** (and the media volume keys) step the volume and show the [volume band](11-system-ui.md#volume-band).
- **Left** and **right arrows** move a [pivot](09-components.md#pivot) (from its focused header) or a [panorama](09-components.md#panorama) one item.

These are [deviations](13-web-and-accessibility.md#input-and-navigation) from the phone, which has hardware keys.

## Authoring contract

Pages describe themselves to the shell with a few attributes and hooks. Follow these and page transitions, continuum and Back work without extra code.

### Pages

- Render pages from the app's `PageStack` `render(route)` function. Routes are plain strings the app parses itself (`'thread:3'`, `'album:camera-roll'`).
- Move forward with `useNavigation().navigate(route)`; go back with `useNavigation().back()`.
- A page with an [app bar](09-components.md#app-bar) is a `.app-page` (a flex column) with its content in a `.app-page-body` and `<AppBar>` last.
- Choose `transition="feather"` (native apps, the default) or `"turnstile"` (whole-page turns, like Silverlight apps).

### Attributes

| Attribute | Put it on | Effect |
|---|---|---|
| `data-feather` | Each row or block that should turn on its own: list items, paragraphs, the pivot title, the header strip | Feathers in and out ([turnstile feather](07-motion.md#turnstile-feather)). Only the outermost one counts. |
| `data-continuum` | The label inside a tappable `data-feather` row that should carry over to the next page (a name, a title) | Drops away from the row going forward and flies back going back ([continuum](07-motion.md#continuum)) |
| `data-continuum-target` | The next page's title | Rises into place when the page was opened from a `data-continuum` label. `Pivot` and `SettingsPage` already mark their titles. |
| `data-intro="<px>"` | Panorama layers | Turns the page's entrance into the [hub intro](07-motion.md#hub-intro). `Panorama` sets it. |
| `data-sheet` | A full-page sheet, like the dialer keypad | Slides up instead of turning |

### Pressables

- Use `useTilt(onTap)` for anything pressable, and spread its `handlers` on the element. It fires `onTap` on release if the finger didn't move more than 12 px.
- Also handle keyboard activation: `onClick={(e) => { if (e.detail === 0) onTap() }}`. Pointer taps come from `useTilt`, so `detail === 0` means Enter or Space.
- The page stack remembers which `data-feather` element was pressed (pointer or key) in the last second, so that element leaves last. Put `data-feather` on the pressable itself or an ancestor.

### Popups and Back

- Render popups into the popup layer (`usePopupLayer()`, or `FullScreenPopup`), not inside the page.
- Anything that should close on Back registers a handler with `useNavigation().registerBackHandler(() => { close(); return true })`, and unregisters it when it closes. Handlers run newest first; returning `true` consumes the press.
- Message boxes, pickers and the expanded app bar already do this.

### Don'ts

- Don't navigate on `click` alone; it loses the tilt and fires during pans.
- Don't unmount pages to "reset" them; the stack keeps them so Back restores their state.
- Don't add your own Back or close buttons to pages. Use Back, or the app bar's **cancel** in pickers and forms, as the phone does.
- Don't set `visibility: visible` on anything inside a page. Pages further down the stack stay mounted under `visibility: hidden`, and `visible` on a descendant shows it through the page on top. Use `visibility: inherit` to undo a `hidden`.
