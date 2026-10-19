# 07 · Motion

> **Status** Draft · **Baseline** 8.0, with 8.1 footage where noted · **Last reviewed** 2026-10-19
> **Code** [`src/motion.ts`](../../src/motion.ts), [`src/pageMotion.ts`](../../src/pageMotion.ts), [`src/navigation.tsx`](../../src/navigation.tsx), [`src/start/StartScreen.tsx`](../../src/start/StartScreen.tsx), [`src/start/tileFlip.ts`](../../src/start/tileFlip.ts), [`src/components/useTilt.ts`](../../src/components/useTilt.ts), [`src/motionSpeed.ts`](../../src/motionSpeed.ts)
> **Sources** Windows Phone Toolkit (`TurnstileTransition`, `SwivelTransition`, `TiltEffect`); UIX markup in `ShellControls.dll` and `UIXMobileAssets480x800.dll`; footage (see [evidence](../evidence/footage/README.md))

Motion in Metro is how you know where you are. Pages swing on a hinge at the left edge of the screen; content leaves in reading order; the thing you tapped leaves last and lands in the next page's title. Nothing bounces, and nothing fades without also moving.

## Easing

The Toolkit storyboards use Silverlight's `ExponentialEase`. `motion.ts` samples it into a CSS `linear()` easing with 33 points, so Web Animations and CSS transitions play the same curve.

| Name | Curve | Used for | Source |
|---|---|---|---|
| `EXPO_OUT_6` | `ExponentialEase` Exponent 6, EaseOut | Everything that arrives: pages, popups, app bar, pivot snap | Toolkit |
| `EXPO_IN_6` | Exponent 6, EaseIn | Everything that leaves | Toolkit |
| `EXPO_OUT_2` | Exponent 2, EaseOut | Hub swing | Fitted |
| `EXPO_OUT_5` | Exponent 5, EaseOut | Hub layer slide | Fitted |
| `EXPO_OUT_15` | Exponent 15, EaseOut | Toggle switch thumb | Toolkit |

Live tile flips use the phone's own (Iris) curves instead; see [flip motion](10-start-and-live-tiles.md#flip-motion).

## Turnstile

A page turns about its left edge, seen through a camera centred on the screen (`perspective: 1000px` on `.page-stack`, origin 50% 50%). In CSS, a positive `rotateY` pushes the right side away from you, the opposite sign of the Toolkit's `PlaneProjection.RotationY`.

| Mode | From | To | Duration | Easing |
|---|---|---|---|---|
| `forwardIn` | 75° | 0° | 350 ms | `EXPO_OUT_6` |
| `forwardOut` | 0° | −80° | 250 ms | `EXPO_IN_6` |
| `backwardIn` | −80° | 0° | 350 ms | `EXPO_OUT_6` |
| `backwardOut` | 0° | 75° | 250 ms | `EXPO_IN_6` |

Durations and easing are **Toolkit**; angles are **Estimated** from 8.1 footage. An outgoing page snaps to opacity 0 on its last frame and stays there until it is hidden.

Silverlight-style apps turn whole pages (`PageStack transition="turnstile"`). Native apps, and the default, feather.

## Turnstile feather

Native apps don't turn the page as one piece. Each top-level `[data-feather]` element turns on its own, after a delay that grows with its distance from the top of the screen. Every element still hinges on the **screen's** left edge, while its camera sits on the element's own centre, so a row's hinge distance is `x + width / 2`.

![Drilling into Settings: rows feather out top to bottom, the tapped row last](assets/strips/drill-in.jpg)

| Value | Microsoft name | Value | Source |
|---|---|---|---|
| Delay per px from the top | `TurnstileFeatherPixelDelay` | 0.32 ms (about 35 ms per list row) | Estimated, frame-counted on 8.1 footage |
| Maximum delay | `TurnstileFeatherMaximumDelay` | 220 ms | Estimated |
| Extra delay for the tapped element | — | 140 ms after the last other element | Estimated |
| Camera | — | `perspective(1000px)` on each element | Toolkit (`TurnstileFeatherEffect`) |
| Angles, durations, easing | — | as the turnstile table | Toolkit and Estimated, as above |

The Microsoft names are **Decoded** from UIX string tables; their values are still compiled into undecoded UIX bytecode.

How `featherPage()` picks its targets:

- Only the outermost `[data-feather]` elements count; nested ones move with their parent.
- Elements that aren't visible, or are off screen, are skipped.
- Going forward, the element the user just tapped (or focused and pressed Enter on) leaves last.
- Elements waiting to arrive are held invisible at their start angle; elements waiting to leave hold their rest pose, including any tilt.
- If a page has nothing to feather, it turns as a whole.

![Back: the page turns out toward the viewer, the previous page turns in](assets/strips/back.jpg)

## Continuum

When the tapped row has a `[data-continuum]` label (a contact's name, a thread's name, an album title), the label carries over: it drops away down and to the right as the page leaves, and the next page's `[data-continuum-target]` title rises into place. Going back reverses it.

| Phase | Microsoft names | Offset (x, y) | Duration | Easing |
|---|---|---|---|---|
| `forwardHide` (the tapped label leaves) | `ContinuumForwardHideXOffset` / `YOffset` | 90, 70 | 200 ms | `EXPO_IN_6` |
| `forwardShow` (the new title arrives) | `ContinuumForwardShowXOffset` / `YOffset` | 0, 80 | 350 ms | `EXPO_OUT_6` |
| `backwardHide` (the title leaves) | — | 0, 80 | 200 ms | `EXPO_IN_6` |
| `backwardShow` (the label returns) | `ContinuumBackwardShowXOffset` / `YOffset` | 90, 70 | 350 ms | `EXPO_OUT_6` |

Names **Decoded** from `UIXMobileAssets480x800` strings (there is no backward-hide pair); values **Estimated**. While the label leaves, the rest of its row fades out over 140 ms (Estimated). `Continuum` animates `translate`, so it composes with the feather's `transform`.

## Start feather

Start uses its own stagger. Tiles leave and return **bottom-right first**; the app list keeps top-to-bottom order. The tapped tile starts leaving well after the others.

![Start to Settings: tiles feather out, the tapped tile last, then Settings feathers in](assets/strips/launch.jpg)

| Value | Microsoft name | Value | Source |
|---|---|---|---|
| Delay across the screen's height | `TileFeatherDelay_Y` | up to 145 ms (about 0.18 ms per px) | Fitted on 8.1 footage |
| Delay across its width | `TileFeatherDelay_GridX` | up to 120 ms (about 0.25 ms per px) | Fitted on 8.1 footage |
| Extra delay for the tapped tile | — | 150 ms after the last other tile | Fitted on 8.1 footage |

For tiles the delay is `(1 − y/height) × 145 + (1 − x/480) × 120`; for the app list it is `y/height × 145 + x/480 × 120`. The names (and a third, `TileFeatherDelay_YMax`) are **Decoded** from strings in `startmenu.dll`; their values are not.

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

Fitted to the WP8 Games hub (YouTube `38SziMGTUiw`) and the WP8.1 Office hub. Fit results are in [`docs/evidence/fits`](../evidence/fits); which clip the stored samples came from is an [open question](14-evidence.md#open-questions). **Provisional**: the recreation trails the WP8 footage by one or two frames between 200 and 500 ms ([side by side](../evidence/footage/hub-intro-compare.jpg)). Nothing is clipped during the swing, so the layers and the wrapped-around last section show on the tilted plane, as on the phone.

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
| Message boxes | Swivel as above, origin top centre; scrim fades | Swivel; scrim 200 ms in, 250 ms out | Estimated |
| Phone keypad sheet (`[data-sheet]`) | Slides up from the bottom | 400 ms in, 270 ms out, `EXPO_OUT_6` | Estimated |
| Pivot swipe | Items and headers snap | 300 ms `EXPO_OUT_6` | Estimated |
| Pivot content cascade | Each row after the first starts 32 px further along | with the snap | Estimated from 8.1 footage |
| Pivot header opacity | Unselected ↔ selected | 200 ms linear | Estimated |
| Panorama snap | Sections settle on a section | 450 ms `EXPO_OUT_6`; title and background glide 600 ms | Estimated |
| Start ↔ app list | Pane slides | 350 ms `EXPO_OUT_6` | Estimated |
| App bar | Expands up / collapses | 250 ms `EXPO_OUT_6` / 200 ms `EXPO_IN_6` | Estimated |
| Volume band | Drops in / slides out | 300 ms `EXPO_OUT_6` / 200 ms `EXPO_IN_6`; hides 3 s after the last touch | Estimated |
| List picker | Grows to its full height | 250 ms `EXPO_OUT_6` | Estimated |
| Toggle switch | Thumb and fill slide | 500 ms `EXPO_OUT_15` | Toolkit |
| Looping selector | Spins to the nearest item; other items fade in when touched | 320 ms cubic ease-out; fade 200 ms linear | Estimated |
| Live tile flip, cell flip, cycle | See [Start and live tiles](10-start-and-live-tiles.md#flip-motion) | | Decoded and Estimated |

![Pivot: tapping the next header](assets/strips/pivot-swipe.jpg)

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
- The speed is kept in `sessionStorage` (`wp8.motionSpeed`).

## Rules

- Use the helpers in `motion.ts` and the [authoring contract](08-navigation.md#authoring-contract). Don't write new curves or durations inline; if a new motion needs a value, add it to `motion.ts` with a source comment and to this page.
- Animate `transform`, `translate` and `opacity` only.
- Outgoing animations keep their final frame (`fill: 'forwards'`) until the element is hidden; cancelling early flashes the old content. Incoming animations are cancelled once they finish, so they don't pin styles.
- Check `prefersReducedMotion()` before starting any motion that moves content across the screen.
