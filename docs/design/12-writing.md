# 12 · Writing

> **Status** Draft · **Baseline** Windows Phone 8.0, US English · **Last reviewed** 2026-10-19
> **Code** [`src/pages/items.ts`](../../src/pages/items.ts) (Settings titles), [`src/format.ts`](../../src/format.ts) and each app's `format.ts` or `dates.ts`, app bar and message box labels in each app
> **Sources** en-US string tables (`*.mui`) from the emulator image, summarised in [`docs/evidence/strings/casing.txt`](../evidence/strings/casing.txt); emulator screenshots

Metro text is short, plain and mostly lower case. The phone's words are part of its look, so the recreation copies them where it can and follows their pattern where it can't.

UI text is US English, because the recreation copies the en-US phone ("color", "favorites"). These docs are written in British English ("colour"). Don't "fix" one to match the other.

## Casing

Case depends on where the text sits, not on the word. The phone's own string tables hold the same name in several cases: `ZuneRes.dll.mui` has both `music+videos` and `Music+Videos`, and `DataSmartRes.dll.mui` has `data sense`, `Data Sense` and `DATA SENSE`.

| Where | Case | Examples | How | Source |
|---|---|---|---|---|
| App title above a pivot or page | Upper case | SETTINGS, PHOTOS | CSS (`text-transform: uppercase` on `.pivot-title` and the apps' page titles). Write the source text in its normal case | Estimated, from screenshots |
| Pivot headers, page headers, panorama titles and section headers | Lower case | theme, airplane mode, music+videos, history | Written lower case | Decoded (Settings titles) |
| Settings list items | Lower case, except names | lock screen, tap+send, Wi-Fi, Bluetooth, Internet Explorer | Written as shown | Decoded |
| Settings subtitles | Lower case, except names | turned on, set up email, contacts, and others | Written as shown | Decoded |
| App names on tiles and in the app list | Built-in features lower case; products keep their capitals | alarms, messaging, people; Data Sense, Games, Music+Videos, Office, OneNote, Store | Written as shown in [`src/start/apps.ts`](../../src/start/apps.ts) | Decoded for Music+Videos and Data Sense; the rest Estimated |
| App bar labels and menu items | Lower case | new, search, delete thread | CSS (`text-transform: lowercase`); write them lower case anyway | Estimated, from screenshots |
| Buttons, picker options | Lower case | ok, cancel, delete, done, my contacts | Written lower case | Estimated |
| Toggle switch state | Capitalised | On, Off | `ToggleSwitch` defaults | Toolkit |
| Message box titles | Sentence case, as the app's own string table has it. Most built-in apps capitalise; Email and Phone don't | Delete contact?, Delete thread?, Can't attach; delete message? (Email) | Written as shown | Decoded (`ContactsRes`, `MessagingRes`, `OnmUiRes`, `EmailRes`, `PhoneRes`) |
| Message box text, empty states, help paragraphs | Sentence case, full sentences with a full stop | No contacts yet. Tap new to add someone. | Written as shown | Estimated |

### Names

- Join paired features with `+` and no spaces: tap+send, date+time, ringtones+sounds, email+accounts, language+region, photos+camera, music+videos. All **Decoded** from Settings titles.
- Keep the phone's spelling: kid's corner, Wi-Fi, Internet Explorer.
- When you mention an app in running text, write its name the way its tile does.

## Voice

These are the project's rules, drawn from the phone's own strings. All **Estimated**.

- Use as few words as the phone would. A page header is one or two words; a subtitle is a short phrase with no full stop.
- Speak to the user as "you". Contractions are fine ("There's no contact info yet").
- When an empty screen needs an action, name the button in the case it shows: "Tap new to add an alarm."
- Ask a question in a confirmation title ("Delete contact?") and put the consequence in the text ("Your whole call history will be deleted."). The confirm button repeats the verb (delete), not "ok" or "yes".
- Say plainly when something is simulated: "These are sample posts. No social networks are connected."
- No exclamation marks and no "please" in UI text. Sample content written as if by people (posts, message replies) can use them.

## Dates and times

All en-US, as the emulator's region is. All **Estimated** unless marked.

| What | Format | Example | Helper |
|---|---|---|---|
| Time of day | 12-hour, no leading zero, AM/PM | 3:04 PM | `formatTimeOfDay` in [`src/format.ts`](../../src/format.ts) |
| System tray clock | 12-hour, no AM/PM | 3:04 | `useClock` in `App.tsx` |
| Short date | M/D/YYYY | 10/19/2026 | `formatShortDate` in `src/format.ts` |
| Long date | Weekday, month and day; add the year where the item could be old | Monday, October 19; Monday, October 19, 2026 | `longDate` (Calendar), `formatTakenDate` (Photos), `longDate` (OneNote, with the time after two spaces) |
| When something happened, in lists | The time today, "yesterday", the weekday within a week, then the short date | 3:04 PM, yesterday, monday, 10/12/2026 | `whenLabel` (People), `listDate` (OneNote) |
| Messaging thread list | As above, but a three-letter weekday and no "yesterday" | 3:04 PM, Mon, 10/12/2026 | `listTime` |
| Calendar agenda headers | Lower-case relative day, then the long date in lower case | today, tomorrow, tuesday, october 20 | `relativeDay` |
| Time ranges | "to" between times | 3:00 PM to 4:00 PM, all day | `timeRange` |
| Durations | Words, largest unit first | 30 minutes, 1 hour, 1.5 hours; 8 hours 5 minutes (alarm set) | `durationLabel`, `durationText` |
| Call and track lengths | Clock style | 05:42, 1:05:42 (calls); 3:42 (tracks) | `formatDuration` in `data/calls.ts` and `data/music.ts` |
| Photo months | Lower-case month and year | october 2026 | `monthLabel` |

Use the helpers in `src/format.ts` for times and short dates. `toLocaleTimeString` depends on the browser's locale data: some versions (Chrome 110, Node 20) put a narrow no-break space (U+202F) before AM/PM, so it isn't guaranteed to match `formatTimeOfDay`.

The phone's tables have "yesterday" only in lower case (`ContactsRes`, `OnmUiRes`) and "Tomorrow" mostly capitalised (`CalendarRes`, `CommsTimeUtilRes`). **Decoded.**

## Accessible names

`aria-label` text is spoken, not shown, so it follows a different rule:

- If the control shows a label, its accessible name is that label, verbatim (app bar buttons pass `label` straight through). This keeps voice control working.
- Otherwise write it in sentence case: "Take photo", "Navigation bar", "More options".

## Known inconsistencies

Places where the recreation's text disagrees with the phone or with the rules above. They are to be fixed in code; they're listed here so nobody copies them in the meantime.

| Where | Recreation says | Should say | Why |
|---|---|---|---|
| Messaging: delete confirmation | delete thread?, delete 3 threads? | Delete thread?, Delete threads? | `MessagingRes` |
| Messaging: attach notice | can't attach | Can't attach | `MessagingRes` |
| People: delete confirmation | delete contact? | Delete contact? | `ContactsRes` |
| Photos: delete confirmation | delete photo? | Delete? | `PhotoRes` |
| Phone: clear history confirmation | delete all? | delete the entire call history list? | `PhoneRes` |
| Calendar: delete confirmations | delete appointment?, delete task? | Delete appointment?, Delete task? | `CalendarRes` has "Delete appointment"; tasks follow it |
| Messaging: day separators in a thread | Today, Yesterday | Not known; the tables searched have only lower-case "yesterday" | Needs footage or a device |
| OneNote: list dates | yesterday, then a capitalised weekday (Monday) | One case for both; People lower-cases the weekday | One helper gives two cases |
| Calendar and Photos times | `toLocaleTimeString` (`formatTime`, `formatTakenTime`) | `formatTimeOfDay` | Locale data varies by browser (see above) |
| App titles passed to `SettingsPage` | Mixed in source: `'SETTINGS'`, `'PHOTOS'`, `'phone'`, `'music+videos'`, `'OneNote'` | Normal case in source (Settings, Photos, Phone); CSS upper-cases it | Screen readers read the source text, and some spell out capitals |
| Accessible names that aren't visible text | typing, position, search people, up next | Typing, Position, Search people, Up next | The rule above |
| Volume band | The group is "Volume", its slider "volume" | Name the slider by its visible "volume" label with `aria-labelledby` | The rule above |

OneNote's "Delete page?" already matches `OnmUiRes`.
