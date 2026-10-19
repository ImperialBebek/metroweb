# 05 · Colour and theme

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-19
> **Code** [`src/theme.ts`](../../src/theme.ts) (`ACCENTS`, `PALETTES`, `themeVariables`), [`src/store.tsx`](../../src/store.tsx), [`src/App.tsx`](../../src/App.tsx)
> **Sources** `0000_ThemeResources.xaml` (light) and `0100_ThemeResources.xaml` (dark); the image's registry (accents, defaults); `uixmobileres.dll.mui` (accent names)

The user picks two things: a **background** (dark or light) and an **accent** (one of 20 colours). Everything else follows from those.

![Start in the dark theme with the Red accent](assets/screenshots/start-dark.png) ![Start in the light theme with the Cobalt accent](assets/screenshots/start-light.png)

## How the theme is applied

- `themeVariables(background, accent)` turns the palette into CSS variables named after the Microsoft resources: `subtle` becomes `--wp-subtle`, `textBoxEditBackground` becomes `--wp-text-box-edit-background`.
- `App` sets the variables on `.desk` and `.screen`, and `data-theme="dark|light"` on the screen.
- The page background and the `theme-color` meta tag follow the background (`#000000` or `#ffffff`), so overscroll and browser chrome match.
- Settings are saved in `localStorage` (`wp8-settings`). The default is **dark** with **Red**, from the emulator registry (`DefaultTheme = 1`, `DefaultAccent = 0xB`).

## Palette

XAML colours are `#AARRGGBB`; the recreation converts them to `rgba()`. All values are **Decoded**.

| Microsoft name | CSS variable | Dark | Light | Used for |
|---|---|---|---|---|
| `PhoneForegroundColor` | `--wp-foreground` | `#FFFFFFFF` | `#DE000000` | Text, glyphs, borders |
| `PhoneBackgroundColor` | `--wp-background` | `#FF000000` | `#FFFFFFFF` | Page background |
| `PhoneContrastForegroundColor` | `--wp-contrast-foreground` | `#FF000000` | `#FFFFFFFF` | Text on a foreground-coloured fill |
| `PhoneContrastBackgroundColor` | `--wp-contrast-background` | `#FFFFFFFF` | `#DE000000` | |
| `PhoneSubtleColor` | `--wp-subtle` | `#99FFFFFF` | `#66000000` | Subtitles, headers above controls |
| `PhoneDisabledColor` | `--wp-disabled` | `#66FFFFFF` | `#4D000000` | Disabled text and controls |
| `PhoneChromeColor` | `--wp-chrome` | `#FF1F1F1F` | `#FFDDDDDD` | App bar, volume band, message boxes |
| `PhoneBorderColor` | `--wp-border` | `#BFFFFFFF` | `#99000000` | |
| `PhoneSemitransparentColor` | `--wp-semitransparent` | `#AA000000` | `#AAFFFFFF` | Message box scrims |
| `PhoneTextBoxColor` | `--wp-text-box` | `#BFFFFFFF` | `#26000000` | Text box fill at rest, list picker border |
| `PhoneTextBoxForegroundColor` | `--wp-text-box-foreground` | `#FF000000` | `#DE000000` | Text in text boxes |
| `PhoneTextBoxEditBackgroundColor` | `--wp-text-box-edit-background` | `#FFFFFFFF` | `#00000000` | Text box and open picker while editing |
| `PhonePivotUnselectedItemOpacity` | `--wp-pivot-unselected-opacity` | 0.4 | 0.23144 | Pivot headers that aren't selected |
| `PhoneAccentColor` | `--wp-accent` | the accent | the accent | Tiles, toggles, selection, pressed states |

Resources in the XAML that the recreation doesn't use yet:

| Microsoft name | Dark | Light |
|---|---|---|
| `PhoneProgressBarBackgroundColor` | `#19FFFFFF` | `#19000000` |
| `PhoneTextCaretColor` | `#FF000000` | `#DE000000` |
| `PhoneTextBoxReadOnlyColor` | `#77000000` | `#2E000000` |
| `PhoneTextBoxSelectionForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` |
| `PhoneButtonBasePressedForegroundColor` | `#FFFFFFFF` | `#FFFFFFFF` |
| `PhoneTextHighContrastColor` | `#FFFFFFFF` | `#DE000000` |
| `PhoneTextMidContrastColor` | `#99FFFFFF` | `#73000000` |
| `PhoneTextLowContrastColor` | `#73FFFFFF` | `#40000000` |
| `PhoneInactiveColor` (deprecated) | `#33FFFFFF` | `#33000000` |
| `PhoneInverseInactiveColor` (deprecated) | `#FFCCCCCC` | `#FFE5E5E5` |
| `PhoneInverseBackgroundColor` (deprecated) | `#FFFFFFFF` | `#FFDDDDDD` |

## Accents

Registry order, which is also the order of the accent picker grid. Names from `uixmobileres.dll.mui`. All **Decoded**. The last column is the contrast of white text on the accent, which is what tiles and pressed buttons show.

| # | Name | Hex | White on accent |
|---|---|---|---|
| 0 | Lime | `#A4C400` | 2.00 |
| 1 | Green | `#60A917` | 2.92 |
| 2 | Emerald | `#008A00` | 4.53 |
| 3 | Teal | `#00ABA9` | 2.84 |
| 4 | Cyan | `#1BA1E2` | 2.90 |
| 5 | Cobalt | `#0050EF` | 6.19 |
| 6 | Indigo | `#6A00FF` | 6.87 |
| 7 | Violet | `#AA00FF` | 5.06 |
| 8 | Pink | `#F472D0` | 2.57 |
| 9 | Magenta | `#D80073` | 5.04 |
| 10 | Crimson | `#A20025` | 8.19 |
| 11 | Red (default) | `#E51400` | 4.74 |
| 12 | Orange | `#FA6800` | 2.98 |
| 13 | Amber | `#F0A30A` | 2.11 |
| 14 | Yellow | `#E3C800` | 1.68 |
| 15 | Brown | `#825A2C` | 6.09 |
| 16 | Olive | `#6D8764` | 3.96 |
| 17 | Steel | `#647687` | 4.68 |
| 18 | Mauve | `#76608A` | 5.51 |
| 19 | Taupe | `#87794E` | 4.31 |

![The accent picker](assets/screenshots/accent-picker.png)

## Contrast of the theme colours

The phone's own colours, measured against the background they sit on. They are kept as they are (the phone wins), but don't use subtle or disabled colours for anything a user must read to finish a task. See [Web and accessibility deviations](13-web-and-accessibility.md#contrast).

| Pair | Dark | Light |
|---|---|---|
| Foreground on background | 21.0 | 16.1 (87% black) |
| Subtle on background | 7.37 | 2.85 |
| Disabled on background | 3.66 | 2.12 |
| Unselected pivot header (foreground at the unselected opacity) | 3.66 | 1.61 |

## Rules

- Anything that should follow the accent uses `var(--wp-accent)`. Never write an accent hex in a component.
- Text on accent colour is white in both themes (`PhoneButtonBasePressedForegroundColor` is `#FFFFFFFF` in both). The recreation writes `#fff` today; it should become `--wp-button-base-pressed-foreground`.
- Chrome surfaces (app bar, volume band, message boxes) use `--wp-chrome`, never the background.
- Use the palette variables. If you need a colour that isn't in the XAML, derive it with `color-mix()` from a palette variable, label it Estimated, and add it below.

## Derived colours

Colours the recreation mixes itself. All **Estimated**.

| Where | Value | Why |
|---|---|---|
| People tile cells | accent mixed with 30% or 45% black, or 15% white | Contacts have no photos, so cells are shaded initials cards |
| Panorama background dim | background at 55% over the picture | Keeps hub text readable over photos |
| Volume slider track | `--wp-subtle` at 0.4 opacity | Matched to footage |
| Text box placeholder (Messaging) | text box foreground at 55% | |
| Music tile title | `text-shadow: 0 0 6px rgba(0,0,0,0.6)` | White title over album art |
| Navigation bar and safe areas | `#000` in both themes | The 8.1 navigation bar is black |
| App scrims | `rgba()` literals in app stylesheets | To consolidate onto `--wp-semitransparent` |
