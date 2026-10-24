# metroweb

Windows Phone 8's Metro design for React: the pivot, the panorama, toggle switches, pickers, the app bar and message boxes; the turnstile, feather and continuum page transitions and the tilt on press; the type ramp, the light and dark themes and the 20 accents. The values come from the phone wherever they could: its theme files and compiled markup, the Windows Phone Toolkit's source, and frame-by-frame measurements of real phones.

- **See it:** [wp8.vercel.app](https://wp8.vercel.app) is a whole phone built with it.
- **The spec:** [wp8.vercel.app/design](https://wp8.vercel.app/design) says what each component does, which value the code uses and how sure we are of it, with live demos.
- **Start an app:** copy the [starter template](https://github.com/ImperialBebek/metroweb/tree/main/templates/starter).

## Install

```sh
npm install metroweb
```

It needs React 19 (`react` and `react-dom` are peer dependencies) and a bundler that imports CSS, such as Vite. The package is ES modules with TypeScript types.

## Quick start

```tsx
// main.tsx
import { createRoot } from 'react-dom/client'
import 'metroweb/styles.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

```tsx
// App.tsx
import { useState } from 'react'
import { ListItem, Paragraph, PhoneFrame, Pivot, SettingsPage, ToggleSwitch, useNavigation } from 'metroweb'

function Home() {
  const { navigate } = useNavigation()
  return (
    <Pivot
      title="my app"
      items={[
        {
          key: 'settings',
          header: 'settings',
          content: (
            <div className="list">
              <ListItem title="sync" subtitle="every hour" onTap={() => navigate('sync')} />
            </div>
          ),
        },
        { key: 'about', header: 'about', content: <Paragraph>Built with metroweb.</Paragraph> },
      ]}
    />
  )
}

function Sync() {
  const [on, setOn] = useState(true)
  return (
    <SettingsPage app="my app" title="sync">
      <ToggleSwitch header="Sync automatically" checked={on} onChange={setOn} />
    </SettingsPage>
  )
}

export function App() {
  return <PhoneFrame initialRoute="home" render={(route) => (route === 'sync' ? <Sync /> : <Home />)} />
}
```

`PhoneFrame` is the root of an app, as `PhoneApplicationFrame` is on the phone. It fills its container (`styles.css` makes `html`, `body` and `#root` full height), draws the phone's 480 px logical screen, scaled down when the container is narrower, and holds the page stack, the layer that popups open in, and the navigation bar. Escape, and Backspace outside a text field, work as the Back key.

## Pages and navigation

- `render(route)` returns the page for a route. Routes are strings your app parses itself, such as `'note:42'`.
- In a page, `useNavigation()` gives `navigate(route)`, `back()` and `registerBackHandler(handler)`. Back on the first page does nothing unless you pass `onExit`.
- Pages under the top one stay mounted and hidden, so Back returns to a page as it was left: its scroll position, pivot item and state.
- Pages turn with the feather transition: the elements marked `data-feather` (list items, paragraphs and the titles already are) turnstile one after another. Pass `transition="turnstile"` to turn whole pages instead. The [authoring contract](https://wp8.vercel.app/design/navigation#authoring-contract) lists the attributes, including continuum.

A page with an app bar is an `.app-page`, with its content in an `.app-page-body` and the `AppBar` last:

```tsx
function NotePage({ onDelete }: { onDelete: () => void }) {
  const { back, navigate } = useNavigation()
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="app-page">
      <div className="app-page-body">
        <SettingsPage app="notes" title="shopping">
          <Paragraph>Milk, eggs, coffee.</Paragraph>
        </SettingsPage>
      </div>
      <AppBar
        buttons={[{ icon: 'delete', label: 'delete', onTap: () => setConfirming(true) }]}
        menu={[{ label: 'rename', onTap: () => navigate('rename') }]}
      />
      {confirming && (
        <MessageBox
          caption="Delete note?"
          message="This note will be deleted."
          buttons={[
            {
              label: 'delete',
              onTap: () => {
                onDelete()
                back()
              },
            },
            { label: 'cancel' },
          ]}
          onDismissed={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
```

The message box, the pickers and the expanded app bar register for Back themselves, so Back closes them before it leaves the page.

## Components

| Export | What it is | On the phone |
|---|---|---|
| `PhoneFrame` | The app's root: the screen, page stack, popup layer and navigation bar | `PhoneApplicationFrame` |
| `PageStack`, `useNavigation` | The page stack on its own, for a shell of your own | `NavigationService` |
| `NavigationBar` | The Back, Start and Search keys | 8.1 on-screen navigation bar |
| `Pivot` | Pages under one title, switched by swiping or tapping the headers | UIX `Pivot` |
| `SettingsPage` | A single-page pivot: the app's title and one page header | UIX `SinglePivotPage` |
| `Panorama` | Wide sections under a big title and a background picture, both moving slower than the sections; wraps after the last | UIX `Panorama` |
| `ListItem` | A list row with a title and an optional subtitle; put rows in a `.list` | UIX `DoubleLineListItem` |
| `Paragraph` | Body text, normal or subtle | `PhoneTextNormalStyle` |
| `Button` | The outlined button | `PhoneButtonBase` |
| `ToggleSwitch` | An on/off switch under a header | Toolkit `ToggleSwitch` |
| `ListPicker` | One choice from a short list; expands in place, or opens a full-mode picker | Toolkit `ListPicker` |
| `AccentPicker` | The full-mode grid of the 20 accents | Settings' theme page |
| `DatePicker`, `TimePicker` | A field that opens full-screen spinning columns | Toolkit `DatePicker`, `TimePicker` |
| `LoopingSelector` | One spinning column, for pickers of your own | Toolkit `LoopingSelector` |
| `TextBox` | A single- or multi-line text field with a header | `PhoneTextBox` |
| `AppBar` | Up to four round buttons, the ellipsis and a menu | Shell `ApplicationBar` |
| `MessageBox` | A caption, a message and one or two buttons over a dimmed screen | Shell `MessageBox` |
| `FullScreenPopup` | A page that swivels in over the current one; close it from inside with `usePopupClose()` | Toolkit full-mode picker page |
| `useTilt` | The tilt for anything pressable | Toolkit `TiltEffect` |
| `PhIcon`, `ph`, `GLYPHS` | Phosphor icons standing in for the phone's glyphs; `GLYPHS` names the app bar's | |

The props are in the TypeScript types. The [components page](https://wp8.vercel.app/design/components) has each one's metrics, states and behaviour, with live demos.

## Theme

`PhoneFrame` takes `background` (`'dark'` or `'light'`) and `accent`, an index into `ACCENTS`, the phone's 20 accents in its own order. The defaults are the emulator's: dark, and red (`DEFAULT_ACCENT`, 11).

It sets the theme's colours on its root as CSS variables, which your styles should use rather than hex values:

- `--wp-foreground`, `--wp-background`, `--wp-subtle`, `--wp-disabled`, `--wp-chrome`, `--wp-border`, and the rest of the phone's `Phone*Brush` resources.
- `--wp-accent`, with `--wp-button-base-pressed-foreground` for text on it.

`tokens.css` adds the type and spacing tokens on `:root`: the font families `--font-light`, `--font-semilight`, `--font-normal` and `--font-semibold`, the type ramp from `--size-small` (18.667 px) to `--size-extra-extra-large` (72 px), and `--wp-margin`, the 12 px unit the layout is built on. For a shell of your own, `themeVariables(background, accent)` returns the colour variables as an object for a `style` attribute.

## Keeping it Metro

The [design docs](https://wp8.vercel.app/design) are the full spec. The short version:

- **Lower case** for titles, page and pivot headers, list items, buttons and app bar labels; sentence case for message box captions and messages. Use the phone's own words where it has them. See [Writing](https://wp8.vercel.app/design/writing).
- **Colour from the variables.** One accent, used sparingly; everything else is foreground, subtle or chrome.
- **The grid.** Space in multiples of `--wp-margin`, and use the type ramp's sizes and the four weights.
- **Anything pressable is a `button` with `useTilt`.** `useTilt(onTap)` fires on release; handle Enter and Space with `onClick={(e) => { if (e.detail === 0) onTap() }}`.
- **Back closes things.** Don't draw back or close buttons on pages; register a back handler for anything Back should close, and put cancel in the app bar of forms and pickers.
- **Motion from the package.** Use the easings and transitions it exports (`EXPO_OUT_6`, `turnstile`, `swivel` and the rest), and skip animations when `prefersReducedMotion()` is true. The components already do.

## Styles

`metroweb/styles.css` is four files in this order, and each can be imported on its own:

| Import | What it holds |
|---|---|
| `metroweb/fonts.css` | `@font-face` rules for the four weights of Metroweb Sans (Segoe WP or Segoe UI when installed) |
| `metroweb/tokens.css` | The type and spacing variables on `:root` |
| `metroweb/base.css` | Page-wide rules: border-box sizing, a full-height page that doesn't scroll, unstyled buttons and the dashed accent focus ring |
| `metroweb/components.css` | The components' own classes |

To put an app inside a page that has other content, import the fonts, tokens and components without `base.css`, and give the `PhoneFrame`'s container a height.

`PhoneFrame` renders an empty frame on the server and draws the screen once it has measured its container.

## Fonts and icons

Text is set in Metroweb Sans: [Selawik](https://github.com/microsoft/Selawik), Microsoft's open-source metric match for Segoe UI, modified and renamed as its licence requires. Icons are a set of [Phosphor](https://phosphoricons.com) glyphs; an app bar button also takes an SVG fragment on its 48-unit grid. None of the phone's own fonts, icons, sounds or images are in the package.

## Licences

metroweb is under the [MIT License](LICENSE). Metroweb Sans is under the SIL Open Font License, Phosphor under the MIT License, and `useTilt` is a port of the Windows Phone Toolkit's `TiltEffect` (Microsoft Public License). [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) has the details.

metroweb is an independent fan project. It is not affiliated with, endorsed by or sponsored by Microsoft. Windows and Windows Phone are trademarks of the Microsoft group of companies.
