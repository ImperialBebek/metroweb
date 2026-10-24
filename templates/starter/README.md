# metroweb starter

A small app in the style of Windows Phone 8, built on [metroweb](https://github.com/ImperialBebek/metroweb/tree/main/packages/metroweb): a to-do list in a pivot, an editor with an app bar and a delete confirmation, and a page that sets the background and accent. Vite, React 19 and TypeScript.

## Start

```sh
npx degit ImperialBebek/metroweb/templates/starter my-app
cd my-app
npm install
npm run dev
```

`npm run build` type checks and builds to `dist/`.

## What's where

- `src/App.tsx`: the app's state, its routes, and the `PhoneFrame` that holds the pages.
- `src/pages/Home.tsx`: a pivot of active and completed to-dos, with **new** in the app bar and **settings** in its menu.
- `src/pages/TodoEditor.tsx`: a form, with save and cancel (or delete) in the app bar and a message box to confirm a delete.
- `src/pages/Settings.tsx`: the background and accent pickers.
- `src/todos.ts`: the to-dos and how their due dates read.

## Going further

- [The package README](https://github.com/ImperialBebek/metroweb/tree/main/packages/metroweb#readme) lists every component and the rules that keep an app looking and behaving like the phone.
- [The design docs](https://wp8.vercel.app/design) are the full spec, with live demos.
- [The phone](https://wp8.vercel.app) is a larger example: Start, Settings and ten apps on the same components ([source](https://github.com/ImperialBebek/metroweb/tree/main/apps/web)).

Inside the metroweb repository, build the package before running the starter: `npm run build -w metroweb`, then `npm run dev -w metroweb-starter`.
