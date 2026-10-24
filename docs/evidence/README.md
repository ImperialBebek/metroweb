# Evidence

The raw material behind the [design docs](../design/README.md): files decoded from the Windows Phone 8 emulator image, the tools that decoded them, measurements of footage of real phones, and the scripts that fitted curves to those measurements.

> **Two parts.** The tools, measurements and fits in this folder are public. The files copied or dumped from the emulator image, and the frames from other people's videos, are Microsoft material or someone else's work, so they live in [`private/`](#private-files): a separate private repository that this one ignores. A clone of this repository doesn't have them. Neither part is deployed: Vite only bundles `src/` and `public/`, and `docs/evidence` is in `.vercelignore`.

## Public files

| Path | What it is | Used for |
|---|---|---|
| [`uix/tools/consts.py`](uix/tools/consts.py) | Finds and dumps a UIX resource's constant table: `python3 consts.py <resource file>` | Producing `private/uix/*_consts.txt` |
| [`uix/tools/anims.py`](uix/tools/anims.py) | Walks `ShellControls` animation bytecode and prints `anims_shell.txt`. It reads its inputs from `/tmp/wp8-uix/`; copy the `private/uix/*.txt` files there first | Producing `private/uix/anims_shell.txt` |
| [`strings/casing.py`](strings/casing.py) | Reads the string tables (`RT_STRING`) of the image's en-US `*.mui` files and prints whole strings, with their IDs, for app names and titles, confirmations, empty states and relative days | Producing `private/strings/casing.txt`, used by [Writing](../design/12-writing.md) |
| [`footage/`](footage/README.md) | Which recordings of real phones were measured, and the Swift tools that measured them | Fitting the hub intro, feather stagger and Start feather |
| [`fits/fit.mjs`](fits/fit.mjs), [`fits/fit2.mjs`](fits/fit2.mjs) | Grid searches that fit exponential and power ease-outs to the hub intro samples measured from footage (swing angle, title offset, section offset) | The hub intro's `EXPO_OUT_2` swing and `EXPO_OUT_5` layer slide |
| [`fits/fit-results.txt`](fits/fit-results.txt), [`fits/fit2-results.txt`](fits/fit2-results.txt) | Their output: best start time, duration, start value and RMS error per curve | as above |

## Private files

Paths are relative to `docs/evidence/private/`. They can be made again from the Windows Phone SDK 8.0 emulator image (see [where the originals are](#where-the-originals-are)) and the footage, with the tools above.

| Path | What it is | Used for |
|---|---|---|
| `theme/0000_ThemeResources-light.xaml` | `Windows\System32\0000_ThemeResources.xaml` from the image: the light theme's colours, opacities, type ramp, margins and text styles | [Colour and theme](../design/05-colour-and-theme.md), [Typography](../design/04-typography.md), [Layout](../design/03-layout.md) |
| `theme/0100_ThemeResources-dark.xaml` | `Windows\System32\0100_ThemeResources.xaml`: the same for the dark theme | as above |
| `theme/System.Windows.xaml` | `Windows\System32\System.Windows.xaml`: the default styles and templates of the platform controls (`PhoneButtonBase`, `PhoneTextBox`, list box, slider, scroll viewer) | [Components](../design/09-components.md#button) (button, text box), [Layout](../design/03-layout.md) |
| `uix/*_strings.txt` | String tables from compiled UIX markup: type, property and resource names, for example `TurnstileFeatherPixelDelay`, `ContinuumForwardShowXOffset`, `FlipCellDurationMin` | Naming the native motion and tile values; most values themselves are still undecoded |
| `uix/*_consts.txt` | Constant tables dumped from the same markup (`ShellControls.dll`, `ShellControlsAssets480x800.dll`, `StartAssets480x800.dll`, `UIXMobileAssets480x800.dll`, `uixmobile.dll`) with each record's raw bytes and its float and integer readings | Tile flip keyframes; the 62, 62 constant in `StartAssets480x800` |
| `uix/shell_props.txt` | Property ids for `ShellControls.dll` markup | Input to `anims.py` |
| `uix/anims_shell.txt` | Every animation in `ShellControls.dll` (`FlipTile.uix`, `FlipGrid.uix`), decoded into keyframes with times, angles, interpolation types and weights | [Live tile flips](../design/10-start-and-live-tiles.md#flip-motion) |
| `strings/casing.txt` | The output of `casing.py` | [Writing](../design/12-writing.md) |
| `footage/*.jpg`, `footage/wp81/*.jpg` | Contact sheets and key frames from the two recordings, and the hub intro side by side; listed in [`footage/README.md`](footage/README.md#files) | Fitting and checking the motion |

## Where the originals are

The emulator image was unpacked to `extracted/` next to this project (not in the repository). The private files came from:

- `extracted/mainos/Windows/System32/0000_ThemeResources.xaml` and `0100_ThemeResources.xaml`
- `extracted/mainos/Windows/System32/ShellControls.dll`, `ShellControlsAssets480x800.dll`, `StartAssets480x800.dll`, `UIXMobileAssets480x800.dll`, `uixmobile.dll`, with their UIX resources unpacked under `extracted/resources/`
- `extracted/mainos/Windows/System32/EN-US/*.mui` and `extracted/mainos/Programs/*/en-us/*.mui` for strings (accent names, Settings titles, app strings)
- The registry hives in the image for the accent colours, the default theme and the Settings item order

## Reading the fit results

Each line is one easing family (`expo2` is an exponential ease-out with exponent 2, `pow3` a cubic ease-out) with its best parameters: `t0` the start time in the video (seconds), `D` the duration (seconds), `v0` the starting value (degrees or px) and `rms` the error against the samples. Lower `rms` wins. For the hub swing, `expo2` at about 0.46 s is the best fit; for the layer slide, `expo5` at about 0.95 s. `fit2` repeats the search with the start time pinned to the first frame the hub shows (6.867 s).

The sample times are seconds into the clip they were read from, and the files don't say which clip that was. See [open questions](../design/14-evidence.md#open-questions) before relying on them.

## Adding evidence

- Keep files small and text where possible. Prefer a contact sheet or a few key frames to a whole video.
- Anything copied or dumped from the emulator image, any picture of the phone's screen, and any frame from someone else's video goes in `private/`. Tools, measurements and fits you wrote go in the public folders.
- Name the source in the file or next to it: the image path, the Toolkit file, or the video's YouTube ID and timestamp. Cite videos by ID only; download URLs carry session tokens.
- When new evidence changes a value, update the docs page and its [source label](../design/README.md#source-labels) in the same change.
