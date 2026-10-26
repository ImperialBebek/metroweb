# 07 · Motion

> **Status** Draft · **Baseline** 8.1 for native page and Start motion (8.0 behind a switch), 8.0 elsewhere, with 8.1 footage and the 8.1 SDK where noted · **Last reviewed** 2026-10-26
> **Code** [`packages/metroweb/src/motion.ts`](../../packages/metroweb/src/motion.ts), [`packages/metroweb/src/pageMotion.ts`](../../packages/metroweb/src/pageMotion.ts), [`packages/metroweb/src/navigation.tsx`](../../packages/metroweb/src/navigation.tsx), [`apps/web/src/start/StartScreen.tsx`](../../apps/web/src/start/StartScreen.tsx), [`apps/web/src/start/tileFlip.ts`](../../apps/web/src/start/tileFlip.ts), [`packages/metroweb/src/components/useTilt.ts`](../../packages/metroweb/src/components/useTilt.ts), [`packages/metroweb/src/motionSpeed.ts`](../../packages/metroweb/src/motionSpeed.ts)
> **Sources** Windows Phone Toolkit (`TurnstileTransition`, `SwivelTransition`, `TiltEffect`); UIX markup in `ShellControls.dll`, `UIXMobileAssets480x800.dll`, `uixmobile.dll`, `startmenu.dll` and `MessagingUI.dll` (8.0 and 8.1); footage (see [evidence](../evidence/footage/README.md))

Motion in Metro is how you know where you are. Pages swing on a hinge at the left edge of the screen; content leaves in reading order; the thing you tapped leaves last and lands in the next page's title. Nothing bounces, and nothing fades without also moving.

## Easing

The Toolkit storyboards use Silverlight's `ExponentialEase`. `motion.ts` samples it into a CSS `linear()` easing with 33 points, so Web Animations and CSS transitions play the same curve.

| Name | Curve | Used for | Source |
|---|---|---|---|
| `EXPO_OUT_6` | `ExponentialEase` Exponent 6, EaseOut | Toolkit arrivals: pages, popups, app bar, pivot snap | Toolkit |
| `EXPO_IN_6` | Exponent 6, EaseIn | Toolkit departures, 8.0 continuum hide | Toolkit |
| `EXPO_OUT_5` | Exponent 5, EaseOut | Native turnstile and 8.1 Start arrivals (`Log` weight 150, $\ln 150 \approx 5.01$), hub layer slide | Decoded, Fitted |
| `EXPO_IN_5` | Exponent 5, EaseIn | Native turnstile and Start departures (`Exp` weight 150 and 100) | Decoded |
| `EXPO_OUT_2` | Exponent 2, EaseOut | 8.0 Start return (`Log` weight 10, $\ln 10 \approx 2.30$), hub swing | Decoded, Fitted |
| `EXPO_IN_2` | Exponent 2, EaseIn | Messaging's conversation dropping away | Fitted |
| `EXPO_OUT_15` | Exponent 15, EaseOut | Toggle switch thumb | Toolkit |

Live tile flips and 8.1's continuum use the phone's own (Iris) curves instead, sampled into keyframes; see [flip motion](10-start-and-live-tiles.md#flip-motion).

## Turnstile

A page or feathered row turns about a vertical hinge on or to the left of the screen, seen through a camera centred on the screen (`perspective: 1000px` on `.page-stack`, origin 50% 50%; see [Camera](#camera) for which turns the markup gives a camera to). In CSS, a positive `rotateY` pushes the right side away from you, the opposite sign of the Toolkit's `PlaneProjection.RotationY` and UIX's right-handed `Rotation`.

Because there is one camera for the whole screen and the hinge sits left of the content (`CenterPointPercent = Vec3(-0.1, 0, 0)` = −48 px in `ANIMATIONS.UIX`; `TileCenterPointPercent = Vec3(-0.3, 0, 0)` = −144 px on Start in `STYLES.UIX`), a turning page or row is a 3D trapezoid: as it swings toward you (`rotateY < 0`, `Z > 0`) it grows larger and its top edge above the screen's centre slopes up toward the right; as it swings in from behind the screen (`rotateY > 0`, `Z < 0`) its right side shrinks and its top edge slopes down toward the right. This is what makes the turn look 3D rather than a flat flip.

![Drilling into Settings: rows feather out top to bottom, the tapped row last, then the next page feathers in](assets/strips/drill-in.jpg)

Native app pages (`NATIVE_TURNSTILE`, decoded from `TurnstileFeather*` wrapping `Turnstile*` in `ANIMATIONS.UIX`), Start (`START_TURNSTILE`, decoded from `TileNavigate*` and `ApplicationNavigate*` in `startmenu`'s `STYLES.UIX`) and Silverlight apps (`TOOLKIT_TURNSTILE`, `PageStack transition="turnstile"`) use these timings. The native and Start columns are 8.0's; the recreation plays 8.1's by default (`NATIVE_TURNSTILE_81`, `START_TURNSTILE_81`), listed in [What 8.1 changed](#what-81-changed):

| Mode | Native (`ANIMATIONS.UIX`) | Start (`STYLES.UIX`) | Toolkit (`TurnstileTransition`) |
|---|---|---|---|
| `forwardIn` | 80° → 0°, 350 ms, `EXPO_OUT_5` | 80° → 0°, 350 ms, `EXPO_OUT_5` | 75° → 0°, 350 ms, `EXPO_OUT_6` |
| `forwardOut` | 0° → −50°, 134 ms (`167 ms × 0.8`), `EXPO_IN_5` | 0° → −50°, 167 ms, `EXPO_IN_5` | 0° → −80°, 250 ms, `EXPO_IN_6` |
| `backwardIn` | −50° → 0°, 168 ms (`350 ms × 0.48`), `EXPO_OUT_5` | −80° → 0°, 250 ms, `EXPO_OUT_2` | −80° → 0°, 350 ms, `EXPO_OUT_6` |
| `backwardOut` | 0° → 80°, 134 ms (`167 ms × 0.8`), `EXPO_IN_5` | 0° → 50°, 133 ms, `EXPO_IN_5` | 0° → 75°, 250 ms, `EXPO_IN_6` |

| Value | Native (`ANIMATIONS.UIX`) | Start (`STYLES.UIX`) | Toolkit | Source |
|---|---|---|---|---|
| Camera | `NATIVE_PERSPECTIVE`, 1000 px | 1000 px | 1000 px | Native **Estimated** (no camera in `ANIMATIONS.UIX`; 8.1 footage fits 1250 to 1290 px); Start **Decoded** for the return (`PageNavigateToCamera`), **Estimated** for the launch; Toolkit **Estimated** |
| Hinge (`hingeX`) | −48 px (`CenterPointPercent = -0.1`) | −144 px on tiles (`-0.3`), 0 px on app list | 0 px (`CenterOfRotationX = 0`) | Native and Start **Decoded**; Toolkit **Toolkit** |

- **Native (`ANIMATIONS.UIX`)** angles, keyframes, `TimeScale` multipliers (0.8 on `TurnstileFeatherForwardOut` and `TurnstileFeatherBackwardOut`, 0.48 on `TurnstileFeatherBackwardIn`), `Log`/`Exp` weight 150 ($\ln 150 \approx 5.01$) and `CenterPointPercent = Vec3(-0.1, 0, 0)` are **Decoded** from `uixmobile`'s `ANIMATIONS.UIX`. Whole-page native turns (`nativePageTurn`, used when a page has no `[data-feather]` elements) play the unscaled `Turnstile*` durations (350 ms in, 167 ms out).
- **Start (`STYLES.UIX`)** angles, durations (167 ms `TileNavigateAway`, 250 ms `TileNavigateTo`), `Exp` weight 100 ($\ln 100 \approx 4.61$) / `Log` weight 10 ($\ln 10 \approx 2.30$) and `TileCenterPointPercent = Vec3(-0.3, 0, 0)` are **Decoded** from `startmenu`'s `STYLES.UIX` and confirmed against 240 fps 8.1 footage (`IMG_0885.mov`).
- **Toolkit** durations and easing come from `TurnstileTransition`; the angles are **Estimated**.

An outgoing page or element snaps to opacity 0 on its last frame (`160 ms → 167 ms` in `ANIMATIONS.UIX`) and stays there until it is hidden.

### Camera

UIX describes the camera as a `Camera` object: `Eye` (0, 0, −1000), `At` (0, 0, 0), `Up` (0, 1, 0), `Zn` 2 and `Perspective` true. Only two places in the markup attach one (`ViewItem.Camera`), and both take it off again (set it to null) when their animation ends:

- `startmenu`'s `STARTPAGE.UIX` attaches `PageNavigateToCamera` (`IntroAnimationCameraEye` in `StartAssets480x800`'s `CONSTANTS.UIX`) while `NavigateToHandle` plays, that is, while the tiles turn back in.
- `uixmobile`'s `PANORAMA.UIX` attaches `IntroAnimationCamera` (`PanoramaIntroAnimationCameraEye` in `UIXMobileAssets480x800`) during the hub intro.

The `Turnstile*` and `TurnstileFeather*` animations in `ANIMATIONS.UIX`, and Start's `TileNavigateAway`, set no camera, so an app's page turn and the launch from Start use the renderer's default camera (below). 240 fps 8.1 footage of a page turning in fits a camera 1250 to 1290 px away ([fits](../evidence/footage/wp81-240fps/fits.md)). The recreation uses 1000 px for pages and Start. The two cameras' values are **Decoded**; the default camera is **Estimated**.

How `Eye` maps to a CSS `perspective` isn't settled either. The hub intro's camera is also 1000 away, yet its footage fits 1670 px ([hub intro](#hub-intro)), so `Zn`, the `At` point or the renderer's projection may change the effective distance. Until that is decoded, read `Eye` = 1000 as the markup's value, not as proof of `perspective(1000px)`.

The renderer's own default camera, in `uixrender.dll`, has `Eye` (0, 0, −4), `At` (0, 0, 0), `Up` (0, 1, 0) and a view size of 2, so the screen plane maps one to one and the perspective distance is twice whichever viewport extent spans the view: 960 px if that is the width, 1600 px if it is the height. The values are **Decoded (8.1)**; which axis it uses isn't, so the distance is a Candidate. The markup cameras' 1000 at 480 px wide (2.08 × the width) is close to the width reading. The footage's 1250 to 1290 px was fitted with the hinge on the screen's left edge and on the screen plane; a hinge 48 px further left and 100 px behind, as 8.1 has, would make the same motion fit a longer distance, so the footage doesn't rule out 960 or 1000 px.

WinRT pages turn through `PlaneProjection`, whose camera (`Windows.UI.Xaml.dll`) is fixed: a 57° field of view, rescaled so it cancels, with the eye 999 px from the plane. That is `perspective(1000px)` in view pixels, with the vanishing point at the centre of the turning element rather than the screen. **Decoded (8.1 WinRT)**. The Silverlight runtime's `PlaneProjection`, which the Toolkit's turnstile uses, probably works the same way, but it wasn't decoded, so the Toolkit camera stays Estimated.

8.1 scales the eye's distance with the screen, always about 2.08 × its width: 1000 at 480 px wide, 1125 at 540, 1500 at 720, 2250 at 1080, and less in the six-column (s20, s30) variants, for example 1755 at 1080 s30. **Decoded (8.1)**. In 8.1 the turnstile's `CenterPointPercent` also gains a Z component (100, and 65 for the app list). The renderer code that reads it wasn't found, but WinRT's turnstile uses the same numbers (`CenterOfRotationX` −0.1, `CenterOfRotationZ` −100 px; see [8.1 WinRT](#windows-phone-81-winrt)), so it is most likely a hinge 100 px behind the page (Candidate).
### What 8.1 changed

8.1 keeps the native turnstile's angles and curves but shortens the turns: out 167 → 128 ms, in 350 → 300 ms. It adds a `TimeScale` 0.6 to `TurnstileFeatherForwardIn`, so a feathered element turns in over 180 ms rather than 350 ms (out 102 ms, back in 144 ms), and moves the hinge to `CenterPointPercent` (±0.1, 0, 100). Start's `STYLES.UIX` moves the same way (see [Start feather](#start-feather)), and continuum is rewritten (see [Continuum](#continuum)). A retail Lumia 520 on 8.1 has the same animations. **Decoded (8.1)**.

The recreation plays 8.1. `setNativeMotionVersion('8.0')` (the "native motion" switch on the desk beside the phone, kept for the tab's session) brings back 8.0's `NATIVE_TURNSTILE`, `START_TURNSTILE` and continuum, for comparison. `featherPage`, `nativePageTurn`, `turnstileFeather`'s default timing, `startTurnstile()` and `continuum` follow the switch:

| Value | 8.0 | 8.1 (default) |
|---|---|---|
| Feathered turn | in 350 ms, out 134 ms, back in 168 ms | in 180 ms, out 102 ms, back in 144 ms |
| Whole-page turn | in 350 ms, out 167 ms | in 300 ms, out 128 ms |
| Hinge | 48 px left of the screen, on its plane | 48 px left on forward in and back out, 48 px right of the left edge on forward out and back in; 100 px behind the screen |
| Feather delay | 0.36 ms per px, at most 220 ms | 0.375 ms per px (`TurnstileFeatherPixelDelay`), no maximum |
| Start, launching an app | 0° → −50° over 167 ms, around `TileCenterPointPercent` (−144 px) | 0° → −50° over 128 ms, 48 px left of the screen and 50 px behind it |
| Start, coming back | −80° → 0° over 250 ms, `Log` 10 | −50° → 0° over 300 ms, `Log` 150, 48 px right of the left edge and 100 px behind |
| Continuum | Translate only (Estimated) | Drops, turns about X and scales (`ContinuumActive*`) |

The native turnstile's angles and curves, the camera, the tapped item's extra delay and Start's stagger are the same in both. The 8.1 values are **Decoded (8.1)**, except that reading the hinge's Z as px behind the screen is a Candidate (see [Camera](#camera)). The Toolkit turnstile and the hub intro don't change.

## Turnstile feather

In native apps, top-level `[data-feather]` elements turn in and out one after another from the top of the screen (`TurnstileFeatherForwardIn`, `TurnstileFeatherForwardOut`, `TurnstileFeatherBackwardIn` and `TurnstileFeatherBackwardOut` in `ANIMATIONS.UIX`).

Every feathered element hinges on the shared vertical axis 48 px left of the screen (`CenterPointPercent = Vec3(-0.1, 0, 0)`) and is seen through the **same camera** as the page stack, centred on the screen at `z = 1000 px`. Each element gets `transform-origin` set to the screen's centre (`240 − x px`, `height / 2 − y px`) and `perspective(1000px) translateX(-288px) rotateY(θ) translateX(288px)`, so every row on the page shares one vanishing point and one off-screen hinge.

| Value | Microsoft name | Value | Source |
|---|---|---|---|
| Per-item feather delay | `TurnstileFeather*` delay | 33 ms per item (`0.36 ms/px` in `FEATHER_PIXEL_DELAY`, about 41 ms per 114 px list row) | Decoded (`0.033 s` in `ANIMATIONS.UIX`) and Fitted on 240 fps 8.1 footage. The markup's `TurnstileFeatherPixelDelay` is `TurnstileFeatherMaximumDelay` ÷ 800 = 0.375 ms/px, within 4% of the fit |
| Maximum delay | `TurnstileFeatherMaximumDelay` | 220 ms | Estimated. The markup sets 0.3 s (**Decoded**), but as the delay at the bottom of an 800 px screen, not as a cap: no feather animation clamps to it |
| Extra delay for the tapped element | — | 140 ms after the last other element | Estimated |
| Camera | — | `perspective(1000px)` from the screen's centre | Estimated: the feather sets no camera (see [Camera](#camera)) |
| Hinge | `CenterPointPercent` | `Vec3(-0.1, 0, 0)` (−48 px) | Decoded (`ANIMATIONS.UIX`) |
| Angles, durations, easing | `TurnstileFeather*` | as the native column of the turnstile table | Decoded (`ANIMATIONS.UIX`) |

These are 8.0's values; 8.1 changes the durations, the hinge and the delay (see [What 8.1 changed](#what-81-changed)).

How `featherPage()` picks its targets:

- Only the outermost `[data-feather]` elements count; nested ones move with their parent.
- Elements that aren't visible, or are off screen, are skipped.
- Going forward, the element the user just tapped (or focused and pressed Enter on) leaves last.
- Elements waiting to leave hold their rest pose, including any tilt; elements waiting to arrive stay hidden (`opacity: 0`) until their delay expires.
- If a page has nothing to feather, it turns as a whole (`nativePageTurn`).
- The next page starts turning in as soon as the last element has gone. In the footage the gap is one display frame.

![Back: the page's rows feather out, then the previous page feathers back in](assets/strips/back.jpg)

### Dropping away

Messaging's conversation doesn't turn when you go back. Its content drops and fades (`dropOut`) while its title leaves by [continuum](#continuum), then the thread list turns in. A page opts in with `data-drop-out` on its root; every child except the title drops.

| Value | Value | Source |
|---|---|---|
| Drop | 185 px over 150 ms, `EXPO_IN_2` | Fitted on 240 fps 8.1 footage (Messaging, conversation → threads) |
| Fade | 40 ms, starting 110 ms in | Fitted |

Going into a conversation, the thread list feathers out and the thread's name carries over to the conversation's title by [continuum](#continuum). `MessagingUI.dll` (8.1) wires this: `CONVERSATIONLISTPAGE.UIX` sets `ContinuumEnabled` on the thread list, and `CHATCARDHEADER.UIX` builds the conversation's `RecipientName` header as a `ContinuumLabel`. **Decoded (8.1)**; which element plays which `Continuum*` phase is decided in native code, so that part is a reading.

## Continuum

When the tapped row has a `[data-continuum]` label (a contact's name, a thread's name, an album title), the label carries over to the next page's `[data-continuum-target]` title. In 8.1, the default, the label tips toward you on its bottom-left corner, grows and drops away as the page leaves; the next page's title falls into place from below, tipped back and enlarged, overshooting by 40 px before it settles. Going back, the title shrinks and fades, and the label swings up from edge-on into its row.

8.1's `ContinuumActive*` in `ANIMATIONS.UIX`, with offsets from `UIXMobileAssets480x800` (`ContinuumForwardShowYOffset` 200, `ContinuumForwardShowYOffset2` −40, `ContinuumBackwardShowYOffset` −20):

| Phase | Pivot | Duration | Keyframes |
|---|---|---|---|
| `forwardHide` (the tapped label leaves) | bottom left, `(0, 1, 0)` | 120 ms | Y 0 → 200 `Exp` 150; turn about X 0° → 80° `Exp` 60; scale 1 → 1.5 `Exp` 150; opacity 1, held to 100 ms, → 0 |
| `forwardShow` (the new title arrives) | bottom left, `(0, 1, 0)` | 350 ms | Y 200 → −40 by 100 ms `Log` 60 → 0 `SCurve` 7.5; turn −50° → 0° `Log` 10; scale 1.5 → 1; opacity 0 → 1 by 167 ms `Log` 10 |
| `backwardHide` (the title leaves) | centre, `(0.5, 0.5, 1)` | 300 ms | scale 1 → 0.85 `Exp` 10; opacity 1 → 0 `Log` 50 |
| `backwardShow` (the label returns) | not set (centre in the recreation) | 200 ms | Y −20 → 0 and turn −90° → 0°, both `Log` 10 |

The keyframes are **Decoded (8.1)**, and WinRT's `ContinuumNavigationTransitionInfo` plays the same motion (see [8.1 WinRT](#windows-phone-81-winrt)). Three readings are not: the forward show's scale is interpolation kind 7 (`EaseIn` 10, 0.5), whose formula isn't decoded, so the recreation uses WinRT's `PowerEase` 2 EaseOut there (Candidate); `backwardShow` sets no pivot, so centring it is Estimated; and the angles are the markup's, which the recreation plays with the opposite sign in CSS (`rotate: x -80deg`), as for `rotateY`, so the leaving label tips toward you (Candidate). `continuum` samples each property's curve into keyframes every 8 ms and animates `translate`, `rotate`, `scale` and `opacity`, so it composes with the feather's and the page turn's `transform`. `rotate` has no perspective of its own, so the turn reads as a vertical squash, which is what 240 fps 8.1 footage shows (Estimated camera). While the label leaves, the rest of its row fades out over 140 ms (Estimated).

With `setNativeMotionVersion('8.0')` the recreation plays its older estimates, translate only: the label drops away down and to the right, and the next page's title rises into place.

| Phase | Microsoft names | Offset (x, y) | Duration | Easing |
|---|---|---|---|---|
| `forwardHide` (the tapped label leaves) | `ContinuumForwardHideXOffset` / `YOffset` | 90, 70 | 200 ms | `EXPO_IN_6` |
| `forwardShow` (the new title arrives) | `ContinuumForwardShowXOffset` / `YOffset` | 0, 80 | 350 ms | `EXPO_OUT_6` |
| `backwardHide` (the title leaves) | — | 0, 80 | 200 ms | `EXPO_IN_6` |
| `backwardShow` (the label returns) | `ContinuumBackwardShowXOffset` / `YOffset` | 90, 70 | 350 ms | `EXPO_OUT_6` |

Names **Decoded** from `UIXMobileAssets480x800` strings (there is no backward-hide pair); values **Estimated**.

The 8.0 values have since been decoded from the 8.0 markup (`ContinuumActive*` in `ANIMATIONS.UIX`, offsets in `UIXMobileAssets480x800`). They differ from the estimates above, and the 8.0 switch hasn't moved to them yet:

| Phase | 8.0 offset (x, y) | Duration | Keyframes |
|---|---|---|---|
| `forwardHide` | 300, 100 | 180 ms | X `Exp` 40; Y `EaseIn` (10, 0.5); opacity 1 → 0 `Exp` 100 |
| `forwardShow` | from 300, −60 | 250 ms | X `Log` 50; Y linear; opacity 0 → 1 `Log` 50 |
| `backwardShow` | from −200, −200 | 200 ms | X linear; Y `Log` 10; opacity 0 → 1 `Log` 50 |
| `backwardHide` | no offset: scales 1 → 0.85 and fades | 300 ms | scale `Exp` 10; opacity `Log` 50; centred |

**Decoded**, with one reservation: the forward-hide X keyframe carries a `RelativeTo` flag whose meaning isn't decoded, so whether its 300 is relative to the start position is a reading, not a fact. 8.0 has no rotation keyframes: the turn about X is 8.1's.

## Start feather

Start uses its own hinge, timings (`START_TURNSTILE_81` by default, `START_TURNSTILE` for 8.0; `startTurnstile()` picks one) and stagger, decoded from `startmenu`'s `STYLES.UIX`. Both the tile grid (`FeatheredTileNavigateTo` / `Away`) and the app list (`FeatheredApplicationNavigateTo` / `Away`) set `Direction = -1`, so tiles leave and return **bottom-right first** and the app list feathers **bottom-to-top**. The tapped tile or app list item (`TileClickedNavigateAway` / `ApplicationClickedNavigateAway`) leaves last.

![Start to Settings: tiles feather out, the tapped tile last, then Settings feathers in](assets/strips/launch.jpg)

| Value | Microsoft name | 8.0 | 8.1 (default) | Source |
|---|---|---|---|---|
| Tile hinge | `TileCenterPointPercent`, then each turn's `CenterPointPercent` | `Vec3(-0.3, 0, 0)` (−144 px on a 480 px screen) | each turn's own (below) | Decoded (`STYLES.UIX`) |
| App list hinge | `ApplicationCenterPointPercent`, then each turn's | `Vec3(0, 0, 0)` (0 px, the screen's left edge) | each turn's own (below) | Decoded (`STYLES.UIX`) |
| Outgoing turn | `TileNavigateAway` / `ApplicationNavigateAway` (`NavigateAwayForward`) | 0° → −50° over 167 ms, `EXPO_IN_5` (`Exp` weight 100) | 0° → −50° over 128 ms, `EXPO_IN_5` (`Exp` 150), at `(-0.1, 0, 50)`: 48 px left of the screen, 50 px behind | Decoded (`STYLES.UIX`) |
| Returning turn | `TileNavigateTo` / `ApplicationNavigateTo` (`NavigateToBackTile`, `NavigateToBack`) | −80° → 0° over 250 ms, `EXPO_OUT_2` (`Log` weight 10) | −50° → 0° over 300 ms, `EXPO_OUT_5` (`Log` 150), at `(0.1, 0, 100)`: 48 px right of the left edge, 100 px behind | Decoded (`STYLES.UIX`) |
| Delay across the screen's height | `TileFeatherDelay_Y` / `ApplicationFeatherDelay_Y` | up to 145 ms (`0.025 s` / `0.02 s` per band in `STYLES.UIX`) | same | Decoded and Fitted on 8.1 footage |
| Delay across its width | `TileFeatherDelay_GridX` | up to 120 ms (`0.025 s` per grid column in `STYLES.UIX`) | same | Decoded and Fitted on 8.1 footage |
| Extra delay for the tapped item | `TileClickedNavigateAway` / `ApplicationClickedNavigateAway` | 150 ms after the last other item (350 ms total delay in `STYLES.UIX`) | same | Decoded and Fitted on 8.1 footage |

8.0's turns carry no `CenterPointPercent` of their own, so tiles turn around `TileCenterPointPercent`: 144 px to the left of the screen (`-30%` of 480 px), so even tiles in the leftmost column (`x = 24 px`) sit 168 px from the hinge, and as they swing toward the viewer (`0° → -50°`) or return (`-80° → 0°`) through the screen-centred `perspective(1000px)` camera, they sweep horizontally across the left edge and expand in height (`Z > 0`).

8.1 gives every turn its own `CenterPointPercent`. The recreation reads it as overriding `TileCenterPointPercent` (which 8.1 still sets on each tile), as `EnterRearrangeClick`'s `(0.5, 0.5, 0)` must for a tile to grow about its own centre when you press and hold it (Candidate). 8.1 also moves `ApplicationCenterPointPercent` to `Vec3(-0.1, 0, 65)`. Its `NavigateToForward` (−80° → 0° over 300 ms at `(-0.1, 0, 100)`) and `NavigateAwayBack` (0° → 80° over 128 ms at `(0.1, 0, 100)`) are in `START_TURNSTILE_81` too, though Start plays only the launch and the return. The app list's return, `NavigateToBack`, fades in from 30 to 150 ms; the recreation shows each item at once, as for tiles (`NavigateToBackTile`, shown at 10 ms). The headers' own variants (`NavigateToBackHeader` at `(0.1, 0, 180)`) aren't built.

For tiles the delay is `(1 − y/height) × 145 + (1 − x/480) × 120`; for the app list it is `(1 − y/height) × 145`.

## Hub intro

A panorama hub opens differently from a page. The whole page swings in from edge-on around a hinge to the left of the screen, with weaker perspective than a page turn, while its layers (background, title, sections) slide in from far to the right and settle well after the swing.

![Hub intro: the page swings in while its layers slide in from the right](assets/strips/hub-intro.jpg)

| Value | Microsoft name | Value | Source |
|---|---|---|---|
| Perspective | — | 1670 px | Fitted |
| Hinge | — | 230 px left of the screen, at mid height | Fitted |
| Swing | `PanoIntroAnimation` | 90° → 0° over 460 ms after 35 ms, `EXPO_OUT_2` | Fitted |
| Layer slide | `Panorama*IntroSlideInXOffset` | 950 ms after 35 ms, `EXPO_OUT_5` | Fitted |
| Background offset | `PanoramaBackgroundIntroSlideInXOffset` | 1040 px | Fitted |
| Title offset | `PanoramaTitleIntroSlideInXOffset` | 1640 px (about 1.33 × the sections) | Fitted |
| Section offset | `PanoramaContentIntroSlideInXOffset` | 1240 px | Fitted |

Fitted to the WP8 Games hub (YouTube `38SziMGTUiw`) and the WP8.1 Office hub. Fit results are in [`docs/evidence/fits`](../evidence/fits); which clip the stored samples came from is an [open question](14-evidence.md#open-questions). **Provisional**: the recreation trails the WP8 footage by one or two frames between 200 and 500 ms (see the side by side, `hub-intro-compare.jpg`, in the private evidence). Nothing is clipped during the swing, so the layers and the wrapped-around last section show on the tilted plane, as on the phone.

A page opts in by marking layers with `data-intro="<offset px>"`. `Panorama` does this for you.

## Tilt

Every pressable item tilts toward the finger and sinks in, then springs back after a short delay. Port of the Toolkit `TiltEffect`.

![A tile pressed near its top-left corner](assets/screenshots/tilt.png)

| Value | Toolkit name | Value | Source |
|---|---|---|---|
| Maximum angle | `MaxAngle` | 0.3 rad | Toolkit |
| Maximum depression | `MaxDepression` | 25 px | Toolkit |
| Return delay | `TiltReturnAnimationDelay` | 200 ms | Toolkit |
| Return duration | `TiltReturnAnimationDuration` | 100 ms | Toolkit |
| Camera | — | `perspective(1000px)` | Toolkit |
| Tap slop | — | 12 px; further movement cancels the tilt and the tap | Estimated |

A press at the centre sinks the item 25 px straight back; a press at a corner tips it by up to 0.3 rad and barely sinks it.

## Other motion

| What | Motion | Duration and easing | Source |
|---|---|---|---|
| Full-screen popups and pickers (`SwivelTransition` FullScreenIn/Out) | `rotateX` −45° → 0° in, 0° → 45° out, `perspective(1000px)`, origin centre | 350 ms `EXPO_OUT_6` / 250 ms `EXPO_IN_6` | Toolkit |
| Message boxes | Swivel as above, origin top centre; scrim fades | Swivel; scrim 200 ms in, 250 ms out (`scrimFade`) | Estimated |
| Phone keypad sheet (`[data-sheet]`) | Slides up from the bottom | 400 ms in, 270 ms out, `EXPO_OUT_6` | Estimated |
| Pivot swipe | Items and headers snap | 300 ms `EXPO_OUT_6` | Estimated |
| Pivot content cascade | Each row after the first starts 32 px further along | with the snap | Estimated from 8.1 footage |
| Pivot header opacity | Unselected ↔ selected | 200 ms linear | Estimated; 8.1 WinRT snaps instead (see below) |
| Panorama snap | Sections settle on a section | 450 ms `EXPO_OUT_6`; title and background glide 600 ms | Estimated |
| Start ↔ app list | Pane slides | 350 ms `EXPO_OUT_6` | Estimated |
| App bar | Expands up / collapses | 250 ms `EXPO_OUT_6` / 200 ms `EXPO_IN_6` | Estimated |
| Volume band | Drops in / slides out | 300 ms `EXPO_OUT_6` / 200 ms `EXPO_IN_6`; hides 3 s after the last touch | Estimated |
| List picker | Grows to its full height | 250 ms `EXPO_OUT_6` | Estimated; the duration agrees with 8.1 WinRT, the curve doesn't (see below) |
| Toggle switch | Thumb and fill slide | 500 ms `EXPO_OUT_15` | Toolkit |
| Looping selector | Spins to the nearest item; other items fade in when touched | 320 ms cubic ease-out; fade 200 ms linear | Estimated; 8.1 WinRT fades over 330 ms |
| Live tile flip, cell flip, cycle | See [Start and live tiles](10-start-and-live-tiles.md#flip-motion) | | Decoded and Estimated |

![Pivot: tapping the next header](assets/strips/pivot-swipe.jpg)

### Windows Phone 8.1 WinRT

The 8.1 SDK's WinRT templates (`generic.xaml`) carry exact storyboards for a few controls. They are **Decoded (8.1 WinRT)**: what WinRT apps on 8.1 got, not necessarily what the 8.0 shell or the Toolkit did. The recreation keeps the values in the table above.

| Control | 8.1 WinRT | Recreation |
|---|---|---|
| List picker (`ComboBox` drop-down) | Opens over 250 ms, `ExponentialEase` EaseInOut, exponent 6; closes over 200 ms with the same ease | 250 ms `EXPO_OUT_6`; closing doesn't animate |
| Pivot headers | Selected ↔ unselected is a discrete colour swap, with no transition. While a pivot is locked, the other headers slide 50 px and fade out over 330 ms | 200 ms linear opacity |
| Looping selector | Neighbours fade in over 330 ms | 200 ms linear |
| Context menu (`MenuFlyout`) | Scales open horizontally over 380 ms, then vertically by 500 ms, from the edge nearest its target | Not built |
| Progress bar (indeterminate) | Five dots, 167 ms apart, on a 3.917 s cycle | Not built |
| Reordering a list | The item scales to 1.05 by 75 ms and back by 200 ms | Not built |

Tilt, the toggle switch slide and the hub entrance are named in the templates (`PointerDownThemeAnimation`, `RepositionThemeAnimation`) but timed in native code, which hasn't been decoded. The page transitions (`NavigationThemeTransition`) are built in `Windows.UI.Xaml.Phone.dll`, whose x86 code in the emulator has been decoded. Times are in milliseconds and angles are `PlaneProjection` angles (the opposite sign of CSS `rotateY`). Which builder branch plays which direction is read from the values, not traced, so the direction names are a Candidate.

**Turnstile** (`CommonNavigationTransitionInfo`, the default). Every turn hinges at `CenterOfRotationX` −0.1 (10% of the element's width left of its left edge), `CenterOfRotationZ` −100 px (behind the plane) and `CenterOfRotationY` 0.5, and eases with `ExponentialEase` exponent 6, EaseOut in and EaseIn out. When staggering is on, each element on screen starts 33 ms after the one before; elements off screen don't animate. The page itself only switches its opacity.

| Direction | Staggered elements | Whole page |
|---|---|---|
| Forward in | −80°, held to 64 ms, → 0° by 278 ms; shown at 64 ms | −80°, held to 128 ms, → 0° by 556 ms |
| Forward out | 0° → 50° by 64 ms; hidden at 65 ms | 0° → 50° by 128 ms; hidden at 129 ms |
| Back in | 50°, held to 64 ms, → 0° by about 278 ms (the last keyframe is a Candidate) | 50°, held to 128 ms, → 0° by 556 ms |
| Back out | 0° → −80° by 64 ms (Candidate) | 0° → −80° by 128 ms |

The angles and the hinge are the same as 8.1's UIX turnstile; the times are WinRT's own. The staggered forward in (80° over 214 ms after a 64 ms hold, exponent 6) agrees with the 240 fps 8.1 fit (75° over about 270 ms, exponent 6).

**Continuum** (`ContinuumNavigationTransitionInfo`). The same motion as 8.1's UIX continuum:

| Direction | Element | Page |
|---|---|---|
| Forward out | Hinged at its bottom-left (0, 1, 0): `RotationX` 0° → 80° (`ExponentialEase` 2 EaseIn), `TranslateY` 0 → 200 and scale 1 → 1.5 (exponent 6 EaseIn), all by 120 ms; hidden from 100 to 120 ms | Fades from 120 to 250 ms (`CircleEase`) |
| Forward in | From 267 ms: `RotationX` −50° → 0° and scale 1.5 → 1 by 617 ms (`PowerEase` 2 EaseOut); `TranslateY` 200 → −40 by 367 ms (exponent 8 EaseOut) → 0 by 617 ms (exponent 0.75 EaseInOut); opacity 0 → 1 by 434 ms (exponent 6 EaseOut) | Shown at 267 ms, scales 0.9 → 1 by 617 ms (`CircleEase`) |
| Back out | — | `TranslateY` 0 → 200 by 250 ms (exponent 6 EaseIn), hidden at 250 ms |
| Back in | From 267 ms: `RotationX` −90° → 0° and `TranslateY` −20 → 0 by 467 ms (exponent 4 EaseOut) | Fades in from 267 to 617 ms |

**Slide** (`SlideNavigationTransitionInfo`). In: `TranslateY` 200, held to 250 ms, → 0 by 600 ms (exponent 6 EaseOut), shown at 250 ms. Out: 0 → 200 by 250 ms, exponent 6 (EaseIn is a Candidate), hidden at 250 ms.

All **Decoded (8.1 WinRT)** except where marked. The recreation plays the UIX turnstile and continuum, not WinRT's timings.

## Reduced motion

When `prefers-reduced-motion: reduce` is set (`prefersReducedMotion()`):

- Pages, Start, full-screen popups (including the date and time pickers), the accent picker, the app bar, the volume band and message boxes appear and disappear without animating.
- The pivot, the panorama and the looping selector jump to their target. Pivot headers and the looping selector's items don't fade.
- Live tiles don't run at all.
- The toggle switch, Alarms' switches, the list picker, the Photos viewer (swipe and zoom), Calendar's day view, Camera's focus ring, the alarm-set toast and the Music seek bar jump to their end state.
- Tilt still happens: it's direct feedback under the finger, not motion across the screen.

## The motion speed dial

On wide screens a dial beside the phone slows every animation down (0.05× to 2×) so motion can be studied frame by frame. It is a recreation tool, not a phone feature.

- `motionSpeed.ts` wraps `Element.prototype.animate` so each new Web Animation starts at the chosen `playbackRate`, and while slowed it retimes CSS animations and transitions every frame.
- Timers and frame loops paced against an animation must scale with `motionMs(ms)`. Pivot, Panorama and LoopingSelector do; if you add a `setTimeout` that waits for an animation, use it too.
- `setMotionSpeed` doesn't store the speed. The phone keeps it for the tab's session in `sessionStorage` (`wp8.motionSpeed`, in `apps/web/src/motionSpeedSession.ts`).

## Rules

- Use the helpers in `motion.ts` and the [authoring contract](08-navigation.md#authoring-contract). Don't write new curves or durations inline; if a new motion needs a value, add it to `motion.ts` with a source comment and to this page.
- Animate `transform` (or `translate`, `rotate` and `scale`) and `opacity` only.
- Outgoing animations keep their final frame (`fill: 'forwards'`) until the element is hidden; cancelling early flashes the old content. Incoming animations are cancelled once they finish, so they don't pin styles.
- Check `prefersReducedMotion()` before starting any motion that moves content across the screen.
