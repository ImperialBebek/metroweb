# Evidence

The raw material behind the [design docs](../design/README.md): files decoded from the Windows Phone 8 and 8.1 emulator images and a Lumia 520's firmware, the tools that decoded them, measurements of footage of real phones, and the scripts that fitted curves to those measurements.

> **Two parts.** The tools, measurements and fits in this folder are public. The files copied or dumped from the emulator image, and the frames from other people's videos, are Microsoft material or someone else's work, so they live in [`private/`](#private-files): a separate private repository that this one ignores. A clone of this repository doesn't have them. Neither part is deployed: the site's build bundles only `apps/web`, `packages/metroweb` and the pages in `docs/design`, and `docs/evidence` is in `.vercelignore`.

## Public files

| Path | What it is | Used for |
|---|---|---|
| [`uix/tools/consts.py`](uix/tools/consts.py) | Finds and dumps a UIX resource's constant table: `python3 consts.py <resource file>` | Producing `private/uix/*_consts.txt` |
| [`uix/tools/anims.py`](uix/tools/anims.py) | Walks `ShellControls` animation bytecode and prints `anims_shell.txt`. It reads its inputs from `/tmp/wp8-uix/`; copy the `private/uix/*.txt` files there first | Producing `private/uix/anims_shell.txt` |
| [`uix/tools/uib.py`](uix/tools/uib.py) | Reader for compiled UIX markup (UIB) of both 8.0 and 8.1: data tables, class defaults, constants, compact asset tables and animation keyframes. `python3 uib.py anims <_DATATABLE.UIB> <file.UIX>` prints a file's animations, `dis` disassembles them. Needs `intrinsics80.txt` / `intrinsics81.txt`, which it looks for next to itself, in `private/uix/wp81/` or in `$UIB_INTRINSICS` | Every 8.1 UIX dump, and the 8.0 continuum, panorama, cell flip and tray values |
| [`uix/tools/intrinsics.py`](uix/tools/intrinsics.py) | Dumps the intrinsic UIX type names from the 8.0 and 8.1 `uixmobile.dll`: `python3 intrinsics.py <8.0 dll> <out80> <8.1 dll> <out81>` | `private/uix/wp81/intrinsics80.txt`, `intrinsics81.txt` |
| [`uix/tools/named.py`](uix/tools/named.py) | Every named value (class property or local default) of a UIX module as TSV: `python3 named.py <module dir>...` | `private/uix/wp81/*_named.tsv`, `named-80.tsv`, `named-81.tsv`, `private/uix/lumia520/named-lumia.tsv` |
| [`uix/tools/gen_dumps.py`](uix/tools/gen_dumps.py) | Regenerates the 8.1 dumps under the same file names as the 8.0 ones: `python3 gen_dumps.py <resources dir> <out dir>` | `private/uix/wp81/` |
| [`uix/tools/diff_named.py`](uix/tools/diff_named.py) | Compares two `named.py` dumps: `python3 diff_named.py <old.tsv> <new.tsv> <out.tsv>` | `private/uix/wp81/diff_80_81.tsv`, `private/uix/lumia520/diff_lumia_81.tsv` |
| [`uix/tools/animsum.py`](uix/tools/animsum.py), [`uix/tools/pystrings.py`](uix/tools/pystrings.py) | One line per animation from `uib.py anims` output; ASCII and UTF-16 strings with offsets from any binary | `private/uix/wp81/anims_uix_80.txt`, `anims_uix_81.txt` |
| [`theme/tools/`](theme/tools) | `xamltree.py`, a small XAML tree parser, and `dump_metrics.py`, `dump_animations.py` and `survey_styles.py` on it, which list each style's metrics and storyboards with line numbers | The WinRT comparison `private/theme/wp81-winrt/winrt-xaml.md` |
| [`registry/tools/`](registry/tools) | `reg_dump.py`, `reg_accents.py` and `reg_settings.py` read registry hives (needs `python-registry`); `resolve_mui.py` resolves `@file,-id` strings against the image's en-US `*.mui` files (needs `pefile`) | `private/registry/` |
| [`native/tools/`](native/tools) | x86 PE tools for the emulator's native DLLs (need `capstone` and `pefile`): `petool.py` loads a DLL, finds cross-references and prints annotated disassembly; `emu.py` and `emu_patch.py` are a small symbolic stack and x87 emulator; `kf_trace.py` and `kf_trace2.py <start> <end>` trace the keyframes, property paths and easings a transition builder creates (set `WP81_SYSTEM32` to the image's `Windows/system32`); `uix_probe.py [camera\|interp\|kinds\|all]` prints the `uixrender.dll` camera and interpolation code | `private/native/wp81/` |
| [`ffu/ffu2img.py`](ffu/ffu2img.py) | Turns a Windows Phone 8.x FFU firmware file into a raw disk image: `python3 ffu2img.py <image.ffu> <out.img> [--info]` | Unpacking the Lumia 520 firmware |
| [`strings/casing.py`](strings/casing.py) | Reads the string tables (`RT_STRING`) of the image's en-US `*.mui` files and prints whole strings, with their IDs, for app names and titles, confirmations, empty states and relative days | Producing `private/strings/casing.txt`, used by [Writing](../design/12-writing.md) |
| [`footage/`](footage/README.md) | Which recordings of real phones were measured, and the Swift tools that measured them | Fitting the hub intro, feather stagger and Start feather |
| [`footage/wp81-240fps/fits.md`](footage/wp81-240fps/fits.md) | The 240 fps measurements and the fits behind the native turnstile timings and perspective | The native page turn, feather stagger and conversation drop in [Motion](../design/07-motion.md#turnstile) |
| [`fits/fit.mjs`](fits/fit.mjs), [`fits/fit2.mjs`](fits/fit2.mjs) | Grid searches that fit exponential and power ease-outs to the hub intro samples measured from footage (swing angle, title offset, section offset) | The hub intro's `EXPO_OUT_2` swing and `EXPO_OUT_5` layer slide |
| [`fits/fit-results.txt`](fits/fit-results.txt), [`fits/fit2-results.txt`](fits/fit2-results.txt) | Their output: best start time, duration, start value and RMS error per curve | as above |

## Private files

Paths are relative to `docs/evidence/private/`. They can be made again from the Windows Phone SDK 8.0 and 8.1 emulator images, the Lumia 520 firmware (see [where the originals are](#where-the-originals-are)) and the footage, with the tools above.

| Path | What it is | Used for |
|---|---|---|
| `theme/0000_ThemeResources-light.xaml` | `Windows\System32\0000_ThemeResources.xaml` from the image: the light theme's colours, opacities, type ramp, margins and text styles | [Colour and theme](../design/05-colour-and-theme.md), [Typography](../design/04-typography.md), [Layout](../design/03-layout.md) |
| `theme/0100_ThemeResources-dark.xaml` | `Windows\System32\0100_ThemeResources.xaml`: the same for the dark theme | as above |
| `theme/System.Windows.xaml` | `Windows\System32\System.Windows.xaml`: the default styles and templates of the platform controls (`PhoneButtonBase`, `PhoneTextBox`, list box, slider, scroll viewer) | [Components](../design/09-components.md#button) (button, text box), [Layout](../design/03-layout.md) |
| `uix/*_strings.txt` | String tables from compiled UIX markup: type, property and resource names, for example `TurnstileFeatherPixelDelay`, `ContinuumForwardShowXOffset`, `FlipCellDurationMin` | Naming the native motion and tile values; most values themselves are still undecoded |
| `uix/*_consts.txt` | Constant tables dumped from the same markup (`ShellControls.dll`, `ShellControlsAssets480x800.dll`, `StartAssets480x800.dll`, `UIXMobileAssets480x800.dll`, `uixmobile.dll`) with each record's raw bytes and its float and integer readings | Tile flip keyframes; the 62, 62 constant in `StartAssets480x800` |
| `uix/shell_props.txt` | Property ids for `ShellControls.dll` markup | Input to `anims.py` |
| `uix/anims_shell.txt` | Every animation in `ShellControls.dll` (`FlipTile.uix`, `FlipGrid.uix`), decoded into keyframes with times, angles, interpolation types and weights | [Live tile flips](../design/10-start-and-live-tiles.md#flip-motion) |
| `theme/wp81/` | The 8.1 emulator's `0000_ThemeResources.xaml`, `0100_ThemeResources.xaml` (byte for byte the 8.0 files) and `System.Windows.xaml` | [Colour and theme](../design/05-colour-and-theme.md#windows-phone-81), [Typography](../design/04-typography.md#windows-phone-81) |
| `theme/wp81-winrt/` | `generic.xaml` and `themeresources.xaml` from the 8.1 SDK (the WinRT app model), and `winrt-xaml.md`, their comparison with the 8.0 values | The 8.1 notes in [Layout](../design/03-layout.md#windows-phone-81), [Typography](../design/04-typography.md#windows-phone-81), [Motion](../design/07-motion.md) and [Components](../design/09-components.md) |
| `registry/wp81-theme-registry.md`, `registry/*-settings-order.txt` | Accents, default theme and accent, and the Settings item order from the 8.1 emulator's and the Lumia 520's hives | [Colour and theme](../design/05-colour-and-theme.md#windows-phone-81), Settings |
| `registry/wp81-lumia520.md`, `registry/lumia520-accents.txt` | The Lumia 520 firmware report: build, theme files, accents, Settings, Nokia additions and its UIX compared with the emulator's | as above, [Motion](../design/07-motion.md#turnstile) |
| `uix/wp81/` | The 8.1 UIX dumps (same names as the 8.0 ones), `*_named.tsv` per module, `named-80.tsv` and `named-81.tsv` for every module, `diff_80_81.tsv`, `anims_uix_80.txt` and `anims_uix_81.txt`, `camera-assignments.txt` (every place the markup builds or attaches a `Camera`), and `uix-81.md`, the report on what they decode | Continuum, panorama, cell flips, feather delay and tray values in [Motion](../design/07-motion.md), [Start](../design/10-start-and-live-tiles.md), [System UI](../design/11-system-ui.md) and [Components](../design/09-components.md) |
| `native/wp81/` | `winrt-native.md`, the report on the 8.1 emulator's native page transitions and cameras (`Windows.UI.Xaml.Phone.dll`, `Windows.UI.Xaml.dll`, `uixrender.dll`) with addresses, and the keyframe traces of the turnstile and continuum builders | [Motion](../design/07-motion.md#windows-phone-81-winrt), the [camera](../design/07-motion.md#camera), SCurve in [Start](../design/10-start-and-live-tiles.md#curves) |
| `uix/lumia520/` | The Lumia 520's named values and animations, and their differences from the 8.1 emulator (`diff_lumia_81.tsv`, `uix-diff.txt`) | Confirming the emulator's motion matches a shipping phone |
| `strings/casing.txt` | The output of `casing.py` | [Writing](../design/12-writing.md) |
| `footage/*.jpg`, `footage/wp81/*.jpg`, `footage/wp81-240fps/*.jpg` | Contact sheets and key frames from the recordings, and the hub intro side by side; listed in [`footage/README.md`](footage/README.md#files) | Fitting and checking the motion |

## Where the originals are

The emulator image was unpacked to `extracted/` next to this project (not in the repository). The private files came from:

- `extracted/mainos/Windows/System32/0000_ThemeResources.xaml` and `0100_ThemeResources.xaml`
- `extracted/mainos/Windows/System32/ShellControls.dll`, `ShellControlsAssets480x800.dll`, `StartAssets480x800.dll`, `UIXMobileAssets480x800.dll`, `uixmobile.dll`, with their UIX resources unpacked under `extracted/resources/`
- `extracted/mainos/Windows/System32/EN-US/*.mui` and `extracted/mainos/Programs/*/en-us/*.mui` for strings (accent names, Settings titles, app strings)
- The registry hives in the image for the accent colours, the default theme and the Settings item order

The 8.1 material was unpacked to `extracted-81/`, next to `extracted/`:

- The Windows Phone 8.1 SDK Update 1 emulator image (build `WPB_CXE_R1.8.10.14141`) to `extracted-81/mainos/`, with its UIX resources under `extracted-81/resources/`
- `generic.xaml` and `themeresources.xaml` from the SDK's `INC_ABI_XAML_DES` payload to `extracted-81/sdk-xaml/`
- The Lumia 520 retail firmware (`RM914_3058.50000.1425.0004_RETAIL_apac_indonesia_205_04_447903_prd_signed.ffu`, build 8.10.12393.890) through `ffu2img.py` to `extracted-81/ffu/lumia520.img`, its MainOS to `extracted-81/ffu/mainos/` and its UIX resources to `extracted-81/ffu/resources/`

## Reading the fit results

Each line is one easing family (`expo2` is an exponential ease-out with exponent 2, `pow3` a cubic ease-out) with its best parameters: `t0` the start time in the video (seconds), `D` the duration (seconds), `v0` the starting value (degrees or px) and `rms` the error against the samples. Lower `rms` wins. For the hub swing, `expo2` at about 0.46 s is the best fit; for the layer slide, `expo5` at about 0.95 s. `fit2` repeats the search with the start time pinned to the first frame the hub shows (6.867 s).

The sample times are seconds into the clip they were read from, and the files don't say which clip that was. See [open questions](../design/14-evidence.md#open-questions) before relying on them.

## Adding evidence

- Keep files small and text where possible. Prefer a contact sheet or a few key frames to a whole video.
- Anything copied or dumped from the emulator image, any picture of the phone's screen, and any frame from someone else's video goes in `private/`. Tools, measurements and fits you wrote go in the public folders.
- Name the source in the file or next to it: the image path, the Toolkit file, or the video's YouTube ID and timestamp. Cite videos by ID only; download URLs carry session tokens.
- When new evidence changes a value, update the docs page and its [source label](../design/README.md#source-labels) in the same change.
