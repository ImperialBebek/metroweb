# 04 · Typography

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-26
> **Code** [`packages/metroweb/styles/fonts.css`](../../packages/metroweb/styles/fonts.css) (`@font-face`), [`packages/metroweb/styles/tokens.css`](../../packages/metroweb/styles/tokens.css) (`--font-*`, `--size-*`), [`packages/metroweb/fonts/`](../../packages/metroweb/fonts)
> **Sources** `ThemeResources.xaml` (copied to `docs/evidence/private/theme`, kept private); the Windows Phone 8.1 SDK's WinRT theme (`themeresources.xaml`, `generic.xaml`), as corroboration; Selawik (SIL Open Font License)

Windows Phone 8 sets everything in **Segoe WP**, in four weights, on a ramp of eight sizes. Hierarchy comes from size and weight, never from colour blocks or rules.

## Families

Each weight is its own family, as in `ThemeResources.xaml`, so components pick a weight by family name rather than `font-weight`.

| Microsoft name | Phone font | CSS variable | Recreation family | Source |
|---|---|---|---|---|
| `PhoneFontFamilyLight` | Segoe WP Light | `--font-light` | `WP Light` | Decoded |
| `PhoneFontFamilySemiLight` | Segoe WP SemiLight | `--font-semilight` | `WP SemiLight` | Decoded |
| `PhoneFontFamilyNormal` | Segoe WP | `--font-normal` | `WP Normal` | Decoded |
| `PhoneFontFamilySemiBold` | Segoe WP Semibold | `--font-semibold` | `WP SemiBold` | Decoded |
| `PhoneFontFamilyBold` | Segoe WP Bold | not defined | — | Decoded, unused |

Each `WP *` family loads, in order:

1. `Segoe WP *`, if the visitor has it installed.
2. `Segoe UI *`, which Windows has.
3. **Selawik**, from `packages/metroweb/fonts/`. Selawik is Microsoft's open-source (OFL) font made to match Segoe UI's metrics, so line lengths and wrapping come out close even where the letterforms differ.

Selawik's composite glyphs (accented letters, the ellipsis) were flattened to plain outlines with fontTools, because Chrome drew only the first component of each from the original woff2 files. Because of that change, the OFL doesn't let the files keep the name Selawik, so their file names and name tables call them Metroweb Sans; the CSS families are unaffected. If you replace the font files, flatten and rename them again.

Segoe WP itself is never shipped. The screenshots in these docs were generated on macOS, so they show Selawik.

## Type ramp

All sizes are logical px at the 480 px [canvas](02-canvas.md). Microsoft specified them in points; px = pt × 4 ÷ 3. The native shell's UIX markup gives its font sizes in points too: `FontMediumSize` 15, `FontLargeSize` 17 and `PivotHeaderFontSize` 54 are this table's pt column.

| Microsoft name | px | pt | CSS variable | Typical use | Source |
|---|---|---|---|---|---|
| `PhoneFontSizeSmall` | 18.667 | 14 | `--size-small` | Tile titles | Decoded |
| `PhoneFontSizeNormal` | 20 | 15 | `--size-normal` | Body text, subtitles, headers above controls | Decoded |
| `PhoneFontSizeMedium` | 22.667 | 17 | `--size-medium` | Pivot title, buttons, volume band labels | Decoded |
| `PhoneFontSizeMediumLarge` | 25.333 | 19 | `--size-medium-large` | App list titles, picker rows, text boxes, app bar menu | Decoded |
| `PhoneFontSizeLarge` | 32 | 24 | `--size-large` | Toggle state, message box captions | Decoded |
| `PhoneFontSizeExtraLarge` | 42.667 | 32 | `--size-extra-large` | List item titles | Decoded |
| `PhoneFontSizeExtraExtraLarge` | 72 | 54 | `--size-extra-extra-large` | Pivot headers, page titles | Decoded |
| `PhoneFontSizeHuge` | 186.667 | 140 | not defined | — | Decoded, unused |

Other sizes in the theme resources:

| Microsoft name | px | In the recreation | Source |
|---|---|---|---|
| `PivotHeaderFontSize` | 72 | `.pivot-header` uses `--size-extra-extra-large` | Decoded |
| `PivotTitleFontSize` | 22.667 | `.pivot-title` uses `--size-medium` | Decoded |
| `PanoramaItemHeaderFontSize` | 66 | **not followed**: `.pano-header` is 53.333 px, matched to footage of native hubs. The native panorama agrees with 66: its `PanoramaGroupHeaderFontSize` is 50 pt (66.667 px) | Decoded; see [open questions](14-evidence.md#open-questions) |
| `PanoramaItemCharacterSpacing` | −35 (thousandths of an em) | not applied | Decoded |
| `LongListSelectorGroupHeaderFontSize` | 29.333 | not used | Decoded |
| `LongListSelectorGroupHeaderLetterTileFontSize` | 42.667 | not used: People's letter tiles are 38 px (Estimated) | Decoded |
| `JumpListStringFontSize` | 26.667 | not used | Decoded |
| `JumpListAlphabetFontSize` / `…SmallFontSize` | 48 / 37.333 | not used: People's jump list letters are 54 px (Estimated) | Decoded |
| `EmptyListHeaderFontSize` | 32 | not used | Decoded |

## Text styles

`ThemeResources.xaml` defines these styles. All start from `PhoneTextBlockBase`: Normal family, Normal size, the foreground colour, and a 12 px horizontal margin.

| Microsoft style | Family | Size | Colour | Recreation |
|---|---|---|---|---|
| `PhoneTextNormalStyle` | Normal | 20 | foreground | `.paragraph`, `.screen` default |
| `PhoneTextSubtleStyle` | Normal | 20 | subtle | `.paragraph-subtle`, `.list-item-subtitle`, `.toggle-header`, `.picker-header` |
| `PhoneTextTitle1Style` | SemiLight | 72 | foreground | `.pivot-header` |
| `PhoneTextTitle2Style` | SemiLight | 32 | foreground | — |
| `PhoneTextTitle3Style` | SemiLight | 22.667 | foreground | — |
| `PhoneTextExtraLargeStyle` | SemiLight | 42.667 | foreground | `.list-item-title` |
| `PhoneTextLargeStyle` | SemiLight | 32 | foreground | `.volume-value` |
| `PhoneTextGroupHeaderStyle` | SemiLight | 32 | subtle | — |
| `PhoneTextSmallStyle` | Normal | 18.667 | subtle | — (tile titles use Small in white) |
| `PhoneTextContrastStyle` | SemiBold | 20 | contrast foreground | — |
| `PhoneTextAccentStyle` | SemiBold | 20 | accent | — (`.accent-text` is Normal weight) |
| `PhoneTextHugeStyle` | Light | 186.667 | foreground | — |
| `PivotTitleStyle` | SemiBold | 22.667 | foreground | `.pivot-title`, uppercased |

All style values are **Decoded**.

## Text in components

Sizes used by shared components that are not one of the styles above. Values off the ramp have their own `--size-*` variables in `tokens.css`.

| Where | Family | Size | CSS variable | Source |
|---|---|---|---|---|
| Pivot title | SemiBold, uppercase | 22.667 | `--size-medium` | Decoded size; uppercase Estimated from screenshots |
| Toggle state (On/Off) | Light | 32 | `--size-large` | Estimated; the size agrees with 8.1 WinRT, the weight doesn't (see [8.1](#windows-phone-81)) |
| Button face | SemiBold | 22.667 | `--size-medium` | Decoded (`PhoneButtonBase`) |
| Text box | Normal | 25.333 | `--size-medium-large` | Decoded (`PhoneTextBox`) |
| Tile title | Normal | 18.667 | `--size-small` | Estimated |
| Tile count | Normal | 53.333 (26.667 on small tiles) | `--size-tile-count`, `--size-tile-count-small` | Estimated |
| Calendar tile day number | Normal | 32 (42.667 on small tiles) | `--size-large`, `--size-extra-large` | Estimated |
| People tile initials | SemiLight | 26.667 | `--size-tile-initials` | Estimated |
| App list title | Normal | 25.333 | `--size-medium-large` | Estimated |
| Panorama title | Light | 133.333 | `--size-panorama-title` | Estimated; the native `PanoramaTitleFontSize` is 128 pt (170.667 px), see [open questions](14-evidence.md#type-and-layout) |
| Panorama section header | SemiLight | 53.333 | `--size-panorama-header` | Estimated; the native `PanoramaGroupHeaderFontSize` is 50 pt (66.667 px) |
| App bar button label | Normal, lowercase | 16 | `--size-app-bar-label` | Estimated; 8.1 WinRT says about 12 (see [8.1](#windows-phone-81)) |
| App bar menu item | Normal, lowercase | 25.333 | `--size-medium-large` | Estimated |
| Date and time picker item | SemiLight | 54 (secondary line Normal 20) | `--size-picker-item` (`--size-normal`) | Estimated; the time picker size agrees with 8.1 WinRT |
| Picker page title (CHOOSE TIME) | SemiBold | 20 | `--size-normal` | Estimated |
| Message box caption | SemiBold | 32 | `--size-large` | Estimated; agrees with 8.1 WinRT (`MessageDialogTitleStyle`) |

## Line height

| Where | Value | Source |
|---|---|---|
| Screen default | 1.33 | Estimated |
| Pivot headers, list item titles, panorama text | 1.2 | Estimated |
| Tile back text | 1.3 | Estimated |

## Rules

- Use the four `--font-*` families and the `--size-*` variables. Don't set `font-weight`; pick the family.
- Don't add a size without a source. If a component needs one, add it to the table above with its label.
- Headings and labels are left-aligned. Nothing is centred except tile glyphs and picker items.
- Letter case is part of the type system: see [Writing](12-writing.md).
- The desk controls beside the phone (13–15 px) are outside the phone and not part of the ramp.

## Windows Phone 8.1

The 8.1 SDK's theme for its new WinRT app model gives every size in view pixels, which are 8.0 px × 0.8: `TextStyleMediumFontSize` 16 is `PhoneFontSizeNormal` 20, `PivotHeaderItemFontSize` 57 is 72, and so on down the ramp. Multiplied back by 1.25, the WinRT theme agrees with the whole 8.0 ramp, so 8.1 kept the 8.0 type grid. Silverlight apps on 8.1 still use the 8.0 `ThemeResources.xaml` unchanged.

Where the WinRT theme has a size for one of the Estimated rows above, it agrees with the message box caption (32) and message (22.667), the toggle state (32) and the time picker item (54). Those rows stay **Estimated**: WinRT apps are not the 8.0 shell, so agreement is corroboration, not proof.

What the WinRT theme does differently, all **Decoded (8.1 WinRT)** and converted to 8.0 px. The recreation doesn't follow these.

| Where | 8.1 WinRT | Recreation (8.0) |
|---|---|---|
| App bar button label | 9.5 (about 12 px) | Normal 16, Estimated. The strongest hint to re-measure on an 8.0 phone |
| Toggle state (On/Off) | Normal weight | Light |
| List item title (`ListViewItemTextBlockStyle`) | SemiLight 37.333, one step smaller | SemiLight 42.667 (`PhoneTextExtraLargeStyle`) |
| List item subtitle | SemiLight 20 | Normal 20 |
| Pivot header | `CharacterSpacing` −25 | No letter spacing |
| Picker page title (`FlyoutPickerTitleTextBlockStyle`) | SemiBold 22.667, wide tracking | SemiBold 20 |
| Looping selector item | SemiBold 56.25, secondary SemiBold 21.25 | SemiLight 54, secondary Normal 20 |
| New steps | 13.333 (`TextStyleSmallFontSize`) and 37.333 (`TextStyleExtraLargePlusFontSize`) | Not in the 8.0 ramp |
| Hub (8.1's panorama for WinRT) | Title Light 97.5; section headers SemiBold 23.75 | Panorama title Light 133.333, section headers SemiLight 53.333 |

The WinRT Hub is a different control from the native panorama, so its sizes don't bear on the [panorama header question](14-evidence.md#type-and-layout). The native panorama's own markup does.

## App-specific sizes

Sizes that only one app uses stay in that app's stylesheet. All are **Estimated**. If a second component needs one, move it to a `--size-*` variable in `tokens.css`.

| App | Where | Size |
|---|---|---|
| Alarms | Alarm time in the list | 64 |
| Alarms | Time on the ringer | 128 |
| Phone | Keypad digits | 40 (30 on the in-call keypad, its letters 14) |
| Phone | Caller name during a call | 54 |
| People | Initials on favourites | 36 |
| People | Letter tiles in the contact list | 38 |
| People | Initials on group tiles | 18 |
| People | Jump list letters | 54 |
| Calculator | Digit keys | 36 (operators and functions 30) |
| Calendar | Appointments in month cells | 12 |
| Messaging | Time under a bubble | 16 |
| Messaging | Character counter | 15 |
| Camera | Labels on the bar | 14 |
