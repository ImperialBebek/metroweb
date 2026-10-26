---
name: metro-ui
description: Windows Phone 8 Metro UI in React with the metroweb package, from pivots, panoramas, app bars and pickers to page transitions, themes and the phone's writing. Use when building a Metro or Windows Phone-style app or screen, when changing code that imports from metroweb, or when reviewing such UI against the phone. Includes a checker for the rules code can show.
license: MIT
---

# Metro UI with metroweb

metroweb recreates Windows Phone 8's Metro design for React: the controls, the page stack and its transitions, the themes and the type ramp, with values taken from the phone itself. **The phone wins**: where a web habit and the phone disagree, build what the phone does. The rules below are the phone's.

Look things up here, nearest first:

- **The package**, in `node_modules/metroweb/`: `README.md` for setup and the component list, `dist/index.d.ts` for every export and prop. Read props from the types rather than guessing them.
- **The design docs**, the spec: [wp8.vercel.app/llms.txt](https://wp8.vercel.app/llms.txt) indexes them, and every page is Markdown at `https://wp8.vercel.app/design/<page>.md`. [Look it up](#look-it-up) says which page answers what.
- **The starter**, a small complete app: [templates/starter](https://github.com/ImperialBebek/metroweb/tree/main/templates/starter).

## Start an app

1. Copy the starter: `npx degit ImperialBebek/metroweb/templates/starter my-app`, then `npm install`. In an app you already have: `npm install metroweb` (it needs React 19), and import `'metroweb/styles.css'` once in the entry file.
2. Render one `PhoneFrame` as the root: `<PhoneFrame initialRoute="home" render={(route) => …} />`, with `background` (`'dark'` or `'light'`) and `accent` (an index into `ACCENTS`) when people can choose them. Routes are strings the app parses itself (`'note:42'`). Keep the app's state above `render`, so every page in the stack sees it.

Done when `npm run dev` shows the first page inside the frame.

## Build a page

1. Choose the page's shape:

   | The page shows | Use |
   |---|---|
   | Several views under the app's title | `Pivot` with `items={[{ key, header, content }]}` |
   | One form or settings page | `SettingsPage` with `app` and `title` |
   | A hub: wide sections over a background picture | `Panorama` with `title`, `background` and `sections` |

   A pivot's items hold one kind of data; a panorama has four sections at most. Never nest one in another, don't use a pivot for the steps of a task (each step is a page), and keep sliders, maps and toggles out of a pivot or panorama with more than one item: put toggles on a `SettingsPage`.

   A page with commands is a `<div className="app-page">` holding a `<div className="app-page-body">` and then the `AppBar`: up to four `buttons` (`{ icon, label, onTap }`, with icons named in `GLYPHS`) and an optional `menu` (`{ label, onTap }`).

2. Fill it with the package's controls. They carry the phone's metrics, states, tilt and Back handling:

   | Need | Use |
   |---|---|
   | Rows to tap | `ListItem` (`title`, `subtitle`, `onTap`) inside `<div className="list">` |
   | Body text | `Paragraph`, with `subtle` for secondary text |
   | On or off | `ToggleSwitch` (`header`, `checked`, `onChange`) |
   | One choice from a few | `ListPicker` (`header`, `value`, `onChange`, `options`) |
   | One choice from many | `ListPicker` with `onOpenFullMode`, opening a `FullScreenPopup`; `AccentPicker` for accents |
   | A date or a time | `DatePicker`, `TimePicker` |
   | Typing | `TextBox` (`header`, `value`, `onChange`; `multiline`, `blurOnEnter`) |
   | A confirmation | `MessageBox` (`caption`, `message`, `buttons`, `onDismissed`) |
   | A button in the content | `Button` |
   | Anything else pressable | A `<button>` with `useTilt`, as in [Pressables](#pressables) |
   | An icon | `PhIcon` |

3. Navigate with `useNavigation()`: `navigate(route)` from an `onTap`, and `back()` after a save or a delete. Pages under the top one stay mounted, so Back returns to a page as it was left.
4. Give Back everything the page opens, as in [Back](#back).
5. Write the text by [Writing](#writing).
6. Run the [check](#check).

Done when the check reports no errors, each warning is fixed or marked with its reason, and the app type checks.

## Rules

### Colour

- Colour comes from the theme variables `PhoneFrame` sets: `--wp-foreground`, `--wp-background`, `--wp-subtle`, `--wp-chrome`, `--wp-border` and the rest of the phone's brushes.
- One accent, `var(--wp-accent)`, used sparingly: a highlight, a selected row, a tile. Text on it is `var(--wp-button-base-pressed-foreground)`.
- A screen that is always dark, like a camera or a photo viewer, sets the `--wp-*` variables on its root.
- Flat: solid fills and square corners, with `border-radius: 50%` for rings and dots. Set things apart with space and type size.

### Type and space

- The weight comes from the family: `var(--font-light)`, `var(--font-semilight)`, `var(--font-normal)` or `var(--font-semibold)`, with `font-weight` left normal.
- Sizes come from the type ramp, `var(--size-small)` (18.667 px) to `var(--size-extra-extra-large)` (72 px).
- Space in multiples of `var(--wp-margin)`, 12 px. Text starts 24 px from the screen's left edge: the page margin plus the item margin.
- The screen is 480 px wide and scaled as a whole, so size things in px and %.

### Motion

- The stack turns the pages. Each row or block marked `data-feather` turns in and out on its own, top to bottom, with the tapped item leaving last. Mark a tapped label that becomes the next page's title with `data-continuum`, and a page whose content should drop away going back with `data-drop-out`. The package's list items, paragraphs and titles are already marked.
- Animate `transform` (or `translate`, `rotate`, `scale`) and `opacity`, with the package's curves and transitions: `EXPO_OUT_5` / `EXPO_OUT_6` for what arrives, `EXPO_IN_5` / `EXPO_IN_6` for what leaves, and `turnstile`, `swivel`, `continuum`, `slideSheet` and the rest.
- Check `prefersReducedMotion()` before starting an animation; in CSS, add a `prefers-reduced-motion: reduce` block.
- Pages under the top one stay mounted under `visibility: hidden`. Inside a page, undo a `hidden` with `visibility: inherit`.

### Pressables

A pressable is a real `button` with `useTilt`, which tilts it under the finger and fires on release unless the press became a pan. Navigate from that `onTap`. The keyboard arrives as a click with `detail === 0`:

```tsx
function Card({ onOpen }: { onOpen: () => void }) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(onOpen)
  return (
    <button ref={ref} type="button" data-feather {...handlers} onClick={(e) => { if (e.detail === 0) onOpen() }}>
      …
    </button>
  )
}
```

Text fields and choices are the package's controls, and confirmations are a `MessageBox`: they carry the phone's states.

### Back

Back closes things, so a page has no back or close buttons of its own. A form or a picker puts **cancel** in its app bar. While something of yours is open, register a handler that closes it; returning `true` consumes the press:

```tsx
const { registerBackHandler } = useNavigation()
useEffect(() => {
  if (open) return registerBackHandler(() => { setOpen(false); return true })
}, [open, registerBackHandler])
```

`MessageBox`, the pickers and the expanded app bar register themselves.

A popup of your own renders into `usePopupLayer()` with `createPortal`, has `role="dialog"`, an `aria-label` and `aria-modal="true"`, and calls `useModal(ref)` on its root, which moves focus in, makes the app behind inert and gives focus back. `FullScreenPopup` does all of this for a page over the page; close it from inside with `usePopupClose()`.

### Writing

| Text | Case | Examples |
|---|---|---|
| App titles, page and pivot headers, panorama titles and sections, list items, buttons, app bar labels and menu items | Lower case, with names keeping their capitals | settings, new to-do, Wi-Fi, OneNote |
| Control headers, message box captions and messages, help text | Sentence case | Due date; Delete note?; This note will be deleted. |
| Toggle states | Capitalised | On, Off |

- CSS shows app titles in capitals; write them in lower case.
- US English, in as few words as the phone would use, with no exclamation marks and no "please".
- A confirmation names its action in the caption, gives the consequence in the message and repeats the verb on its button: Delete note?, This note will be deleted., delete and cancel.
- Join paired features with `+`: ringtones+sounds, tap+send.
- Format times and dates with `formatTimeOfDay` and `formatShortDate`: 3:04 PM, 10/19/2026.

## Check

Run the checker in this skill's `scripts/` folder from the app's root:

```sh
node <this skill's folder>/scripts/check-metro.mjs src
```

It reads stylesheets as text, and TypeScript and JavaScript with the app's own `typescript` package. Each finding gives the file and line, the rule and the fix; `--help` lists the rules. Errors are rules the phone never breaks: fix them. Review each warning: fix it, or mark a deliberate exception with its reason on the line or the line above, `/* metro-ignore <rule>: <why> */` (`{/* … */}` inside JSX). `metro-ignore-file <rule>` covers a whole file.

The check reads code, so look over what it can't see: the case of text that comes from data, Back closing everything that opens, the accent kept to a few places, and spacing on the 12 px grid. Then look at the screen: it should do one job, a glance should say what's new, and with the screenshot blurred the headers and groups should still read.

## Look it up

The design docs, as Markdown at `https://wp8.vercel.app/design/<page>.md`:

| Question | Page |
|---|---|
| A component's metrics, states and behaviour | `components` |
| The page stack, Back and the authoring contract | `navigation` |
| Transitions, tilt, feather, continuum and live tiles | `motion` |
| Casing, voice, and date and time formats | `writing` |
| The theme variables and the 20 accents | `colour-and-theme` |
| The grid, margins and component metrics | `layout` |
| The type ramp and text styles | `typography` |
| Where the recreation departs from the phone | `web-and-accessibility` |

[llms-full.txt](https://wp8.vercel.app/llms-full.txt) holds every page in one file, and [DESIGN.md](https://github.com/ImperialBebek/metroweb/blob/main/DESIGN.md) has the design tokens in Google's DESIGN.md format.
