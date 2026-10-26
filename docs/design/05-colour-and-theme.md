# 05 · Colour and theme

> **Status** Draft · **Baseline** 8.0, with 8.1 differences noted · **Last reviewed** 2026-10-26
> **Code** [`packages/metroweb/src/theme.ts`](../../packages/metroweb/src/theme.ts) (`ACCENTS`, `PALETTES`, `themeVariables`), [`apps/web/src/store.tsx`](../../apps/web/src/store.tsx), [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx)
> **Sources** `0000_ThemeResources.xaml` (light) and `0100_ThemeResources.xaml` (dark); the image's registry (accents, defaults); `uixmobileres.dll.mui` (accent names); the same files in the Windows Phone 8.1 SDK Update 1 emulator image, and the 8.1 SDK's WinRT `themeresources.xaml`

The user picks two things: a **background** (dark or light) and an **accent** (one of 20 colours). Everything else follows from those.

![Start in the dark theme with the Red accent](assets/screenshots/start-dark.png) ![Start in the light theme with the Cobalt accent](assets/screenshots/start-light.png)

## How the theme is applied

- `themeVariables(background, accent)` turns the palette into CSS variables named after the Microsoft resources: `subtle` becomes `--wp-subtle`, `textBoxEditBackground` becomes `--wp-text-box-edit-background`.
- `App` sets the variables on `.desk` and `.screen`, and `data-theme="dark|light"` on the screen.
- The page background and the `theme-color` meta tag follow the background (`#000000` or `#ffffff`), so overscroll and browser chrome match.
- Settings are saved in `localStorage` (`wp8-settings`). The default is **dark** with **Red**, from the 8.0 emulator registry (`DefaultTheme = 1`, `DefaultAccent = 0xB`). The 8.1 emulator defaults to Cobalt (`DefaultAccent = 0x5`); see [Windows Phone 8.1](#windows-phone-81). A retail phone's default comes from its maker or operator.

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
| `PhoneTextBoxReadOnlyColor` | `--wp-text-box-read-only` | `#77000000` | `#2E000000` | Text in a read-only text box |
| `PhoneTextBoxSelectionForegroundColor` | `--wp-text-box-selection-foreground` | `#FFFFFFFF` | `#FFFFFFFF` | Selected text in a text box, on the accent |
| `PhoneTextCaretColor` | `--wp-text-caret` | `#FF000000` | `#DE000000` | Text box caret |
| `PhoneButtonBasePressedForegroundColor` | `--wp-button-base-pressed-foreground` | `#FFFFFFFF` | `#FFFFFFFF` | Text and glyphs on accent: pressed buttons, tiles, selected items, accent toasts and bubbles |
| `PhonePivotUnselectedItemOpacity` | `--wp-pivot-unselected-opacity` | 0.4 | 0.23144 | Pivot headers that aren't selected |
| `PhoneAccentColor` | `--wp-accent` | the accent | the accent | Tiles, toggles, selection, pressed states |

Resources in the XAML that the recreation doesn't use yet:

| Microsoft name | Dark | Light |
|---|---|---|
| `PhoneProgressBarBackgroundColor` | `#19FFFFFF` | `#19000000` |
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
- Text on accent colour uses `--wp-button-base-pressed-foreground`, which is white in both themes. White that sits over a picture rather than the accent (Camera, the Photos viewer, Music+Videos over album art) and the black navigation bar are written as `#fff`.
- Chrome surfaces (app bar, volume band, message boxes) use `--wp-chrome`, never the background.
- Use the palette variables. If you need a colour that isn't in the XAML, derive it with `color-mix()` from a palette variable, label it Estimated, and add it below.

## Derived colours

Colours the recreation mixes itself. All **Estimated**.

| Where | Value | Why |
|---|---|---|
| People tile cells | accent mixed with 30% or 45% black, or 15% white | Contacts have no photos, so cells are shaded initials cards |
| Panorama background dim | background at 55% over the picture | Keeps hub text readable over photos |
| Volume slider track | `--wp-subtle` at 0.4 opacity | Matched to footage |
| Text box placeholder | text box foreground at 55% | `PhoneTextBox` has no placeholder; Messaging's compose box shows one |
| Music tile title | `text-shadow: 0 0 6px rgba(0,0,0,0.6)` | White title over album art |
| Navigation bar and safe areas | `#000` in both themes | The 8.1 navigation bar is black |
| Photos viewer info bar | black at 60% over the picture | Keeps the date and time readable over any photo |
| Photos viewer app bar | `#1F1F1F` (dark chrome) at 90% | Stays dark and see-through over pictures in both themes |
| Camera bar | black at 50% | Over the viewfinder |
| Music+Videos over album art | black at 60% (history labels), 45% (now playing toggles), 65% (seek bar); white at 35% (seek track) | Keeps text and controls readable over any cover |

Message box scrims aren't derived: [`MessageBox`](09-components.md#message-box) uses `--wp-semitransparent`.

## Windows Phone 8.1

What changed in 8.1, read from the Windows Phone 8.1 SDK Update 1 emulator image (build 8.10.14141), a retail Lumia 520's firmware (build 8.10.12393) and the SDK's WinRT theme. The recreation keeps the 8.0 values above.

- **Silverlight theme: unchanged.** `0000_ThemeResources.xaml` and `0100_ThemeResources.xaml` are byte for byte the 8.0 files, in the emulator and in the Lumia 520's retail firmware, so every value in [Palette](#palette) also holds for Silverlight apps on 8.1. **Decoded (8.1)**.
- **Cobalt: `#3E65FF`.** 8.1 keeps the 20 accents in the same order, with the same names, but Cobalt (`Accents\5\Color`) moves from `#0050EF` to `#3E65FF`. White on the new Cobalt is 4.43:1. **Decoded (8.1)**.
- **Default accent: Cobalt.** The 8.1 emulator's `DefaultAccent` is 5. So is a retail Lumia 520's (RM-914, Indonesian firmware 3058.50000.1425.0004): its image has the same accent table, including the new Cobalt, and no maker override (`Shell\OEM\Theme\OEMDefaultAccent` is absent). The phone's first-run setup could still change it, so this is the image's default, not proof of what every phone showed. **Decoded (8.1)**.
- **Complementary colours.** Each accent gains a `ComplementaryColor`, mostly the next accent in the picker: Lime → Green, Green → Emerald, and so on to Amber → Yellow, then Yellow → Amber, Brown and Olive → Taupe, Steel ↔ Mauve, Taupe → Brown. Where 8.1 draws it isn't known. **Decoded (8.1)**.
- **WinRT apps use a different light palette.** The 8.1 SDK's `themeresources.xaml`, which 8.1's new app model uses, has an opaque black foreground (`#FF000000`, keeping `#DE000000` as `PhoneTextHighColor`), a `#73000000` subtle colour (`PhoneTextMidColor`), `#66000000` disabled, and unselected pivot headers drawn in the disabled colour rather than at an opacity, in both themes. Its dialog scrim (`ContentDialogDimmingColor`) is `#99` black or white, not `#AA`. The dark palette matches 8.0. **Decoded (8.1 WinRT)**.

