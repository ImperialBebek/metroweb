# 01 · Principles

> **Status** Draft · **Baseline** 8.0 · **Last reviewed** 2026-10-26
> **Code** the whole of [`packages/metroweb/`](../../packages/metroweb) and [`apps/web/`](../../apps/web) · **Sources** Microsoft's Metro design language as shipped on the phone; Microsoft's Metro booklet and Windows Phone 7 design guidance (see [Design guidance](14-evidence.md#design-guidance))

Metro is a small set of strong ideas. This page says where they come from, what each one means in this codebase, and how to check a screen against them.

## Where Metro comes from

Microsoft named the design language after the signs of public transport: station signs, airport departure boards, the numbers on a bus stop. Those signs are made for people on the move. Big, plain type and a few pictograms tell you where you are and where to go at a glance, with nothing drawn around them. The phone takes on the same job, which is why its type is big, its labels are short and its screens hold little else.

Microsoft's own booklet on Metro sums it up in one line: "It's modern and clean. It's fast and in motion. It's about content and typography. And it's entirely authentic." Windows Phone 7 was presented as "designed to get you in and out and back to life". The phone is a tool for busy people: they should find what they came for, do it, and put the phone away.

### Who it is for

The booklet designs for people it calls Life Maximizers: busy at home and at work, juggling priorities, and "valuing technology as a means to an end, a way to get things done". Three guiding principles, which Microsoft calls the Red Threads, follow from that.

| Red Thread | Microsoft's line | What it asks of a screen |
|---|---|---|
| Personal | Your day, your way. | Lead with the user's own people, things and colour: the tiles they pinned, their accent, their photos. |
| Relevant | Your people, your location. | Show what matters now, "just when you need it", rather than everything: a count, the next appointment, the latest message. |
| Connected | Your stuff, your peace of mind. | Bring other services' content and actions to where the user already is, instead of sending them to another app: the People hub gathers every account, and Photos shares from its own app bar menu. |

## Microsoft's five principles

Microsoft's Windows Phone 7 guidance lists five principles, each with a few objectives. The numbered sections below restate them for this codebase.

| Principle | Microsoft's objectives | Here |
|---|---|---|
| Clean, light, open, fast | Feels fast and responsive. Focus on primary tasks. Do a lot with very little. Fierce reduction of unnecessary elements. Delightful use of white space. Full-bleed canvas. | [7](#7-clean-light-open-fast) |
| Celebrate typography | Type is beautiful, not just legible. Clear, straightforward information design. Uncompromising sensitivity to weight, balance and scale. | [2](#2-type-does-the-hierarchy) |
| Alive in motion | Feels responsive and alive. Creates a system. Gives context to improve usability. Transition between UI is as important as the design of the UI. Adds dimension and depth. | [3](#3-motion-explains-where-you-are), [5](#5-alive-in-motion) |
| Content, not chrome | Delight through content instead of decoration. Reduce visuals that are not content. Content is the UI. Direct interaction with the content. | [1](#1-content-is-the-interface), [6](#6-touch-first) |
| Authentically digital | Design for the form factor. Don't try to be what it's not. Be direct. | [8](#8-authentically-digital) |

## 1. Content is the interface

There are no borders, shadows, gradients or rounded corners around content. Text, pictures and solid colour are the interface. Chrome only appears where the system needs it: the system tray, the app bar, message boxes and the volume band, all painted in `PhoneChromeColor`.

*In code:* new components should not add decoration. If something needs to stand apart, use space (the [12 px grid](03-layout.md)) or type size, not a box.

## 2. Type does the hierarchy

Big, light Segoe WP headings, lowercase labels and generous left alignment carry the structure of every screen. A pivot header is 72 px SemiLight; a list item title is 42.667 px SemiLight; body text is 20 px. Microsoft asks for "sensitivity to weight, balance and scale": each level of the hierarchy should differ clearly from the next in size, weight or colour, never by a pixel or two.

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

Everything responds to the finger. Pressed items tilt toward the touch point and sink in. Lists scroll vertically; pivots, panoramas and Start pan horizontally. Taps that drift more than a few pixels become pans instead. Content is touched directly: you tap the name to open the contact, and swipe the pivot itself to change views.

*In code:* interactive items use `useTilt`. Gestures lock to one axis after 14 px.

## 7. Clean, light, open, fast

Each screen does one job. Start from the primary task, take away whatever doesn't serve it, and give what's left room. The white space that remains isn't empty: it groups. Things that belong together sit close, and a bigger gap starts a new group. Pictures and panoramas run to the edges of the screen. Fast means the screen answers at once: the tilt starts as the finger lands, and the page turns as soon as it lifts.

*In code:* before adding an element, ask what it does for the screen's task. Group with multiples of the 12 px grid, not with lines or boxes.

## 8. Authentically digital

Metro doesn't imitate physical things: no leather, paper, stitching, glass or bevels. It is designed for its form factor, a 480 px screen held in one hand, not a desktop shrunk to fit. And it is direct: the shortest path to the action, with no layers of menus in between.

*In code:* no textures or imitation materials. Don't bring in desktop patterns such as hover menus, rows of small toolbar buttons, nested menus or multi-column forms. An app bar menu is a short, flat list of lower-case actions, with no submenus.

## Where Metro can go too far

Early critics of Windows Phone 7 said it sometimes took reduction too far: screens where a huge header left the content little room, mail with nothing to separate one message from the next, and a keyboard whose keys had no visible edges. The recreation copies the phone anyway, because [the phone wins](#rules-this-project-adds). For new apps built on metroweb, the lesson is that reduction serves the content. Remove decoration, not structure. Where people need an edge to act, the phone draws one: text boxes are filled, and buttons and keys are outlined.

## Checking a screen

Ways to review a screen against these principles. They are judgements, not measurements.

- **Glance.** What would someone learn in two seconds? Start should say who called and what's next without opening anything, and a page should make its one task obvious.
- **Blur.** Blur a screenshot. Headers, counts and blocks of colour should still read. If the structure disappears, the hierarchy is in the detail instead of the scale.
- **Scale steps.** A header and the items under it should differ as clearly as the pivot's 72 px headers over 42.667 px list items. Two levels in neighbouring sizes on the [type ramp](04-typography.md#type-ramp), such as 20 and 22.667, also need a different weight or colour. Critics singled out WP7 screens where a header and its list were too close in size to tell apart.
- **Grouping.** With no boxes, space has to show what belongs together. If the gap between groups is the same as the gap within them, the screen reads as one long list.
- **Pictures behind text.** A background picture must not compete with the text over it, which is why the panorama dims its background.
- **Daylight.** A phone is read outdoors. Pale accents such as Yellow, Lime and Amber wash out on white; see [Contrast](13-web-and-accessibility.md#contrast).

## Rules this project adds

These are not Metro rules; they keep the recreation honest.

1. **Source everything.** A value comes from Microsoft material when we have it, and says where it came from in a code comment and in these docs, with a [source label](README.md#source-labels).
2. **The phone wins.** When phone behaviour and web convention disagree, follow the phone and add the exception to [the deviations list](13-web-and-accessibility.md).
3. **One logical screen.** Everything is laid out at the phone's 480 px logical width and scaled as a whole. See [Canvas](02-canvas.md).
4. **No Microsoft assets in the build.** Fonts, icons and images are substituted with openly licensed equivalents.
