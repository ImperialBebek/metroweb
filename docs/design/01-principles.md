# 01 · Principles

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-19
> **Code** the whole of [`packages/metroweb/`](../../packages/metroweb) and [`apps/web/`](../../apps/web) · **Sources** Microsoft's Metro design language as shipped on the phone

Metro is a small set of strong ideas. These are the ones the recreation depends on, each with what it means in this codebase.

## 1. Content is the interface

There are no borders, shadows, gradients or rounded corners around content. Text, pictures and solid colour are the interface. Chrome only appears where the system needs it: the system tray, the app bar, message boxes and the volume band, all painted in `PhoneChromeColor`.

*In code:* new components should not add decoration. If something needs to stand apart, use space (the [12 px grid](03-layout.md)) or type size, not a box.

## 2. Type does the hierarchy

Big, light Segoe WP headings, lowercase labels and generous left alignment carry the structure of every screen. A pivot header is 72 px SemiLight; a list item title is 42.667 px SemiLight; body text is 20 px.

*In code:* use the [type ramp](04-typography.md) sizes and the four family variables. Do not introduce new sizes without a source.

## 3. Motion explains where you are

Every page change turns on a hinge at the left edge of the screen. Going forward, content swings away and the new page swings in; going back reverses it. Rows leave one after another from the top, and the item you tapped leaves last, so your eye follows it into the next page.

*In code:* pages use the [feathered turnstile](07-motion.md#turnstile-feather) through `PageStack`. Mark rows with `data-feather` and the tapped label with `data-continuum` (see [Navigation model](08-navigation.md#authoring-contract)).

## 4. Personal and flat

Tiles are flat squares in the user's accent colour. Changing the accent recolours Start, toggles, selections and pressed states at once. White text sits on accent colour regardless of the theme.

*In code:* use `var(--wp-accent)` for anything that should follow the accent. Never hard-code an accent hex.

## 5. Alive in motion

Live tiles flip and cycle on their own, at random intervals, so Start never looks frozen but never moves in lockstep either.

*In code:* live behaviour only runs while Start is visible, never on small tiles, and never under reduced motion. See [Start and live tiles](10-start-and-live-tiles.md).

## 6. Touch first

Everything responds to the finger. Pressed items tilt toward the touch point and sink in. Lists scroll vertically; pivots, panoramas and Start pan horizontally. Taps that drift more than a few pixels become pans instead.

*In code:* interactive items use `useTilt`. Gestures lock to one axis after 14 px.

## Rules this project adds

These are not Metro rules; they keep the recreation honest.

1. **Source everything.** A value comes from Microsoft material when we have it, and says where it came from in a code comment and in these docs, with a [source label](README.md#source-labels).
2. **The phone wins.** When phone behaviour and web convention disagree, follow the phone and add the exception to [the deviations list](13-web-and-accessibility.md).
3. **One logical screen.** Everything is laid out at the phone's 480 px logical width and scaled as a whole. See [Canvas](02-canvas.md).
4. **No Microsoft assets in the build.** Fonts, icons and images are substituted with openly licensed equivalents.
