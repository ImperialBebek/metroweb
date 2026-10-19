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
| App title above a pivot or page | Upper case | SETTINGS, PHOTOS, NEW TO-DO | CSS (`text-transform: uppercase` on `.pivot-title`, `.dt-page-title` and the apps' page titles). Write the source text in lower case, as for a header, with names keeping their capitals: `settings`, `new to-do`, `OneNote` | Decoded: the tables store these titles in capitals (`CalendarRes` CALENDAR, NEW TO-DO; `PhoneRes` PHONE). Lower case in source is a [web exception](13-web-and-accessibility.md#rendering) |
| Pivot headers, page headers, panorama titles and section headers | Lower case | theme, airplane mode, music+videos, history | Written lower case | Decoded (Settings titles; `PhoneRes` history) |
| Settings list items | Lower case, except names | lock screen, tap+send, Wi-Fi, Bluetooth, Internet Explorer | Written as shown | Decoded |
| Settings subtitles | Lower case, except names | turned on, set up email, contacts, and others | Written as shown | Decoded |
| App names on tiles and in the app list | Built-in features lower case; products keep their capitals | alarms, messaging, people; Data Sense, Games, Music+Videos, Office, OneNote, Store | Written as shown in [`src/start/apps.ts`](../../src/start/apps.ts) | Decoded for Music+Videos and Data Sense; the rest Estimated |
| App bar labels and menu items | Lower case | new, search, delete thread, delete all | CSS (`text-transform: lowercase`); write them lower case anyway | Decoded for Phone's delete all (`PhoneRes`); the rest Estimated, from screenshots |
| Buttons, picker options | Lower case | ok, cancel, delete, done, my contacts | Written lower case | Decoded for delete and cancel (`PhoneRes`, `OnmUiRes`); the rest Estimated |
| Toggle switch state | Capitalised | On, Off | `ToggleSwitch` defaults | Toolkit |
| Message box titles | Sentence case. Usually a question; Calendar and Phone use a bare phrase | Delete contact?, Delete?, Delete appointment, Delete call history | Written as shown. See [Confirmations](#confirmations) | Decoded. Every delete title in the tables is sentence case |
| Message box text and help paragraphs | Sentence case, full sentences with a full stop | This picture will be deleted. | Written as shown | Decoded where the app has the string; Estimated otherwise |
| Empty states | Sentence case. A bare phrase has no full stop; a sentence that names an action does | No appointments; No to-dos. Tap new to add one. | Written as shown | Decoded for the phrases (`CalendarRes`); the action sentence Estimated |

### Names

- Join paired features with `+` and no spaces: tap+send, date+time, ringtones+sounds, email+accounts, language+region, photos+camera, music+videos. All **Decoded** from Settings titles.
- Keep the phone's spelling: kid's corner, Wi-Fi, Internet Explorer.
- Calendar's tasks are to-dos: the to-do pivot, NEW TO-DO, No to-dos. **Decoded** (`CalendarRes`).
- When you mention an app in running text, write its name the way its tile does.

## Voice

These are the project's rules, drawn from the phone's own strings. All **Estimated**.

- Use as few words as the phone would. A page header is one or two words; a subtitle is a short phrase with no full stop.
- Speak to the user as "you". Contractions are fine ("There's no contact info yet").
- When an empty screen needs an action, name the button in the case it shows: "Tap new to add an alarm."
- Name the action in a confirmation title ("Delete contact?") and put the consequence in the text ("This picture will be deleted."). The confirm button repeats the verb (delete), not "ok" or "yes". The phone's own confirmations do all three; see [Confirmations](#confirmations).
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

As whole strings, the phone's tables have "yesterday" only in lower case (`ContactsRes`, `SPWUiRes`). "Today" and "Tomorrow" come in both cases in `CalendarRes` and capitalised in `OnmUiRes`; which one each screen shows isn't known. **Decoded.**

## Accessible names

`aria-label` text is spoken, not shown, so it follows a different rule:

- If the control shows a label, its accessible name is that label, verbatim (app bar buttons pass `label` straight through). This keeps voice control working.
- Otherwise write it in sentence case: "Take photo", "Navigation bar", "More options".

## Confirmations

Each delete confirmation and where its words come from. The buttons are delete and cancel, as in `PhoneRes` and `OnmUiRes`. String IDs are from [`casing.txt`](../evidence/strings/casing.txt).

| App | Title | Text | Source |
|---|---|---|---|
| Messaging, one thread | Delete thread? | All the messages in this thread will be deleted from your phone. | Decoded (`MessagingRes` 1300, 1301) |
| Messaging, several threads | Delete threads? | All the messages in these threads will be deleted from your phone. | Decoded (`MessagingRes` 1302, 1303) |
| People | Delete contact? | *Name* will be deleted from your phone. | Decoded (`ContactsRes` 12340, 12346) |
| Photos | Delete? | This picture will be deleted. | Decoded (`PhotoRes` 1037, 1058) |
| Phone | Delete call history | Are you sure you want to delete the entire call history list? | Decoded (`PhoneRes` 10066, 10065) |
| Calendar, appointment | Delete appointment | This appointment will be deleted. | Decoded (`CalendarRes` 9023, 9024) |
| Calendar, to-do | Delete to-do | This to-do will be deleted. | Estimated, from the appointment strings |
| OneNote | Delete page? | "*Title*" will be deleted from *notebook*. | Title Decoded (`OnmUiRes` 10035). Text Estimated: the table has only the plural, "These pages will be deleted." |

Messaging's attach notice, "Can't attach", is the recreation's own: attachments aren't built. The nearest phone string is "Can't attach video" (`MessagingRes` 11024), for a different failure. **Estimated.**
## Known inconsistencies

Places where the recreation's text may disagree with the phone. They're listed here so nobody copies them in the meantime.

| Where | Recreation says | Should say | Why |
|---|---|---|---|
| Messaging: day separators in a thread | Today, Yesterday | Not known; the tables have "yesterday" only in lower case | Needs footage or a device |
