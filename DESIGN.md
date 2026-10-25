---
version: alpha
name: Metro
description: Windows Phone 8's Metro design language, as metroweb rebuilds it for the web. The colours are the dark theme with the default Red accent; the light theme and the other accents are in the Themes section.
colors:
  accent: "#E51400"
  foreground: "#FFFFFF"
  background: "#000000"
  subtle: "#FFFFFF99"
  disabled: "#FFFFFF66"
  chrome: "#1F1F1F"
  semitransparent: "#000000AA"
  button-base-pressed-foreground: "#FFFFFF"
  text-box: "#FFFFFFBF"
  text-box-foreground: "#000000"
  text-box-edit-background: "#FFFFFF"
  text-box-read-only: "#00000077"
  text-box-selection-foreground: "#FFFFFF"
typography:
  text-title-1:
    fontFamily: WP SemiLight
    fontSize: 72px
    lineHeight: "1.2"
  text-extra-large:
    fontFamily: WP SemiLight
    fontSize: 42.667px
    lineHeight: "1.2"
  text-normal:
    fontFamily: WP Normal
    fontSize: 20px
    lineHeight: "1.33"
  text-small:
    fontFamily: WP Normal
    fontSize: 18.667px
  pivot-title:
    fontFamily: WP SemiBold
    fontSize: 22.667px
  button-base:
    fontFamily: WP SemiBold
    fontSize: 22.667px
  text-box:
    fontFamily: WP Normal
    fontSize: 25.333px
    lineHeight: "1.3"
  app-bar-label:
    fontFamily: WP Normal
    fontSize: 16px
    lineHeight: "1.2"
  picker-item:
    fontFamily: WP SemiLight
    fontSize: 54px
    lineHeight: "1.1"
  panorama-title:
    fontFamily: WP Light
    fontSize: 133.333px
    lineHeight: "1.2"
  panorama-header:
    fontFamily: WP SemiLight
    fontSize: 53.333px
    lineHeight: "1.2"
spacing:
  margin: 12px
  touch-target-overhang: 12px
  border-thickness: 3px
  stroke-thickness: 3px
omitted:
  - section: rounded
    reason: Metro has no rounded corners.
components:
  phone-frame:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.text-normal}"
    width: 480px
  pivot-title:
    typography: "{typography.pivot-title}"
  pivot-header:
    typography: "{typography.text-title-1}"
  panorama-section:
    width: 432px
  list-item:
    typography: "{typography.text-extra-large}"
  list-item-subtitle:
    textColor: "{colors.subtle}"
    typography: "{typography.text-normal}"
  button:
    textColor: "{colors.foreground}"
    typography: "{typography.button-base}"
  button-pressed:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-base-pressed-foreground}"
  toggle-switch:
    width: 88px
    height: 32px
  text-box:
    backgroundColor: "{colors.text-box}"
    textColor: "{colors.text-box-foreground}"
    typography: "{typography.text-box}"
    height: 48px
  text-box-focused:
    backgroundColor: "{colors.text-box-edit-background}"
    textColor: "{colors.text-box-foreground}"
  text-box-read-only:
    backgroundColor: "{colors.text-box}"
    textColor: "{colors.text-box-read-only}"
  text-box-disabled:
    textColor: "{colors.disabled}"
  text-box-selection:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-box-selection-foreground}"
  looping-selector-item:
    typography: "{typography.picker-item}"
    size: 148px
  looping-selector-item-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-base-pressed-foreground}"
  app-bar:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.foreground}"
    height: 72px
  app-bar-button:
    typography: "{typography.app-bar-label}"
    size: 48px
  message-box:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.foreground}"
  message-box-scrim:
    backgroundColor: "{colors.semitransparent}"
  tile:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-base-pressed-foreground}"
    typography: "{typography.text-small}"
    size: 210px
  tile-small:
    size: 99px
  tile-wide:
    width: 432px
    height: 210px
---

# Metro

## Overview

Metro is Windows Phone 8's design language, and metroweb rebuilds it for the web from the phone's own theme files, the Windows Phone Toolkit and measurements of real phones. Content is the interface: text, pictures and flat colour, with nothing drawn around them. Type does the hierarchy, with big, light, lower-case headings. Motion explains where you are, as pages turn on a hinge at the left edge of the screen. It is personal, because the one accent colour the user picks recolours tiles, toggles, selection and pressed states at once, and touch first, because whatever you press tilts toward your finger. Where the phone and a web convention disagree, follow the phone.

The full spec, with the source of every value and live demos, is at https://wp8.vercel.app/design.

## Colors

The user picks a background (dark or light) and an accent (one of 20), and every colour follows from those two choices. The tokens are the dark theme with the default accent, Red. In code each token is a CSS variable named `--wp-<token>`, such as `var(--wp-accent)` or `var(--wp-subtle)`, which the package sets for the current theme; write the variable, never the value.

- **Accent** is for whatever should follow the user's choice: tiles, toggle fills, selected items, pressed buttons and the focus ring. Use it sparingly; everything else is foreground, subtle or chrome.
- **Button base pressed foreground** is white in both themes. It is the colour of text and glyphs on the accent.
- **Foreground** is for text, glyphs and outlines, **subtle** for subtitles and the headers above controls, and **disabled** for disabled text and controls.
- **Chrome** paints the system's surfaces: the app bar, message boxes and the volume band. **Semitransparent** is the scrim behind a message box.
- The **text box** colours belong to the text box and its states, and come with the component.
- Mix a colour the palette doesn't have from a palette variable with `color-mix()`. White over a photo and the black navigation bar are the only plain colours.

## Themes

The frontmatter holds the dark theme, which is the phone's default. The light theme changes these tokens and keeps the rest. Values are CSS hex, `#RRGGBBAA` where there is transparency.

| Token | Dark | Light |
|---|---|---|
| `foreground` | `#FFFFFF` | `#000000DE` |
| `background` | `#000000` | `#FFFFFF` |
| `subtle` | `#FFFFFF99` | `#00000066` |
| `disabled` | `#FFFFFF66` | `#0000004D` |
| `chrome` | `#1F1F1F` | `#DDDDDD` |
| `semitransparent` | `#000000AA` | `#FFFFFFAA` |
| `text-box` | `#FFFFFFBF` | `#00000026` |
| `text-box-foreground` | `#000000` | `#000000DE` |
| `text-box-edit-background` | `#FFFFFF` | `#00000000` |
| `text-box-read-only` | `#00000077` | `#0000002E` |

The `accent` token is one of these 20, in the phone's order, which is also the order of the accent picker. Red is the default.

| Accent | Hex |
|---|---|
| Lime | `#A4C400` |
| Green | `#60A917` |
| Emerald | `#008A00` |
| Teal | `#00ABA9` |
| Cyan | `#1BA1E2` |
| Cobalt | `#0050EF` |
| Indigo | `#6A00FF` |
| Violet | `#AA00FF` |
| Pink | `#F472D0` |
| Magenta | `#D80073` |
| Crimson | `#A20025` |
| Red | `#E51400` |
| Orange | `#FA6800` |
| Amber | `#F0A30A` |
| Yellow | `#E3C800` |
| Brown | `#825A2C` |
| Olive | `#6D8764` |
| Steel | `#647687` |
| Mauve | `#76608A` |
| Taupe | `#87794E` |

## Typography

Type carries the hierarchy, without colour blocks or rules. Each weight is its own family, `WP Light`, `WP SemiLight`, `WP Normal` and `WP SemiBold`, which load Segoe WP or Segoe UI when installed and otherwise Metroweb Sans, Microsoft's open-source Selawik renamed. In code, set the family with `var(--font-light)`, `var(--font-semilight)`, `var(--font-normal)` or `var(--font-semibold)` and the size with a `--size-*` variable. Leave `font-weight` alone: each family has one face, so any other weight is faked by the browser.

- `panorama-title` and `panorama-header` set a hub's title and its section headers.
- Letter case is part of the type. Pivot headers, page headers, list items, buttons and app bar labels are lower case, except for names (OneNote, Wi-Fi). The app's title above a pivot is written in lower case and shown in capitals. Message box captions and messages are sentence case, and toggle states read On and Off.
- Headings and labels are left-aligned. Only tile glyphs and picker items are centred.

## Layout

Every app is laid out on one logical screen of the `phone-frame` width (480 px) and scaled as a whole to fit the window; its height follows the window. Lay out in px, never in viewport units.

- Space in multiples of `margin`. Text starts `margin` plus `touch-target-overhang` (24 px) from the left edge of the screen: the page's margin and the item's.
- Touch targets (list items, buttons, text boxes, pickers) keep `touch-target-overhang` around them.
- Lists scroll vertically; pivots, panoramas and Start pan horizontally. A panorama section is narrower than the screen, so the next section's header peeks in.
- An app draws only in the page area, between the system tray and the navigation bar.

## Elevation & Depth

Metro is flat: no shadows, gradients or borders around content. Separate things with space and type size, not boxes. Depth comes only from these:

- **Chrome surfaces**: the app bar, message boxes and the volume band, painted in `chrome`. A message box sits over the `semitransparent` scrim.
- **Popups**: pickers and message boxes open in a layer over the current page, and Back closes them first.
- **Motion in perspective**: pages turn in 3D, pressed items tilt and sink, and popups swivel in.

## Shapes

Every corner is square. The only circles are rings and dots: the ring around an app bar button, the app bar's ellipsis and the volume band's media buttons.

- Buttons, text boxes and message box buttons are outlined with `border-thickness`. Rings use `stroke-thickness`.
- Tiles are solid accent squares and rectangles in three sizes (`tile-small`, `tile` and `tile-wide`) on a four-column grid.
- Glyphs are flat, solid, single-colour shapes in the current text colour: the foreground, or white on the accent. An app bar glyph sits inside the ring the app bar draws.

## Motion

Motion is how you know where you are. Nothing bounces, and nothing fades without also moving.

- **Turnstile**: pages turn about a hinge at the left edge of the screen. Going forward, the page swings away and the next one swings in; Back reverses it.
- **Feather**: in native apps the rows turn one after another, top to bottom, and the item you tapped leaves last.
- **Continuum**: the tapped label, such as a name or a title, drops away, and the next page's title rises in its place.
- **Tilt**: whatever you press tilts toward the finger and sinks in, then springs back.
- **Swivel**: full-screen pickers and message boxes swing in about a horizontal axis.
- Arrivals ease out and departures ease in, on the Toolkit's exponential curves (`EXPO_OUT_6` and `EXPO_IN_6`). Take curves and durations from the package.
- Animate transform, translate and opacity only.
- With reduced motion on, pages and popups appear without moving and live tiles stop. Tilt stays, because it is feedback under the finger.

## Components

Build with the metroweb components, which carry the phone's metrics, states, motion and Back behaviour.

- An app's first page is a **pivot**: pages under one title, swiped or picked by their headers. A sub-page is a **settings page**, a pivot with one header. A hub is a **panorama**: wide sections under a big title, over an optional background picture.
- A **list item** is one button: a big title and an optional subtle subtitle. A tap navigates; rows have no selected state.
- A **button** is outlined, and fills with the accent while pressed.
- A **toggle switch** sits under a header with its state, On or Off, beside it. Its fill is the accent.
- A **list picker** expands in place for a few options and opens a full-screen list for many. **Date and time pickers** open full-screen spinning columns, with done and cancel in the app bar.
- A **text box** is filled at rest and turns to the edit background with an accent border while focused.
- The **app bar** holds up to four round icon buttons and an ellipsis at the bottom of the page. The labels and the menu appear when it expands. Forms and pickers put save or done, and cancel, there.
- A **message box** drops from the top over a scrim, with a caption, an optional message and one or two buttons. The confirm button repeats the caption's verb ("delete"), not "ok".
- Back closes things: popups, pickers and the expanded app bar first, then the page.

## Do's and Don'ts

- Do use `var(--wp-accent)` for anything that should follow the accent, with `var(--wp-button-base-pressed-foreground)` for text on it.
- Do make anything pressable a real button that tilts.
- Do check for reduced motion before moving content across the screen.
- Don't write an accent hex in a component.
- Don't set `font-weight`; pick the family.
- Don't add a font size without a source.
- Don't use viewport units inside the screen.
- Don't add back or close buttons to pages.
- Don't navigate on click alone: it loses the tilt and fires during pans.
- Don't write new easing curves or durations inline.
- Don't put anything the user must read to finish a task in subtle or disabled text.
- Don't style an input or build a dialog; use the text box and message box components.
- Don't use exclamation marks or "please" in UI text.
