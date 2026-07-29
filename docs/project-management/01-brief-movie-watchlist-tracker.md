# Movie / Watchlist Tracker: app brief

**One-line pitch:** Scene is a desktop web app where a film lover keeps every movie and show in one library, rates and annotates what they've watched, and lets Scene Picker decide what to watch tonight.

> **Source:** Figma file [Movie / Watchlist Tracker](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=1-4), page "Screens", 17 frames in 5 sections (Onboarding, Dashboard, Library, Picker, Account). Everything in this brief comes from those frames. Inferences are labeled as inferences.
>
> **Notation:** Figma frame names and some UI copy contain a long dash character. Per DECODE writing rules, these documents write it as a hyphen (so the frame is referenced as "05 · Dashboard - Empty"). Everything else is quoted exactly as designed.

## Problem and target users

The design shows a single-user tracker for movies and TV series under the product name Scene ("Every movie and show, in one place.", 01). Every title is typed in by hand through the "Add title" modal (08); nothing plays inside the app, even though the dashboard hero shows a "Resume" button and episode progress (04). The welcome screen offers a "Sign in" link, but no sign-in screen exists anywhere in the file.

**Inferred problem:** people who watch a lot lose track of what they've seen, what they thought of it, and what to watch next, especially across services. Scene gives them one manual log with ratings, notes, and favorites (06, 07), plus an assistant that ends the "what are we watching tonight" debate (14).

**Inferred target users:** individual film and series enthusiasts. The welcome footer literally says "Made for film lovers" (01), onboarding asks for favorite genres from a 12-genre list (03), and the detail screen supports per-title notes like "Rewatch before Part Three." (07).

## Core value proposition

Track everything you watch (the welcome overline says exactly that: "TRACK EVERYTHING YOU WATCH", 01), see your month at a glance (watched count, average rating, top genre, 04), and get told what to watch next: "Build your watchlist, rate what you've seen, and let Scene Picker tell you exactly what to watch next." (01). Picks are "Personalized from your watchlist, ratings & favorite genres." (14).

## Key user flows

1. **Onboarding:** Welcome → Setup - Monthly goal → Setup - Favorite genres → Dashboard - Empty
2. **Add a title:** Dashboard (or Library) → Add title (modal) → save → Dashboard / Library, updated
3. **Review the library:** Dashboard ("View all") → Library → Title detail → back to Library ("Library" breadcrumb)
4. **Manage a title:** Library → Row menu → Edit title (modal) or Delete confirmation → Library, updated
5. **Get tonight's pick:** Dashboard ("Open Picker") → Picker → pick moods → "Surprise me" → Picker - Generating → Picker → "Add to watchlist" → Library, updated
6. **Update profile and preferences:** Settings → edit profile, monthly goal, default type, reminders → "Save changes"

## Screen inventory

| Screen name | Figma frame (linked) | Purpose |
|---|---|---|
| Welcome | [01 · Welcome](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3030-1041) | Pitch the product and start setup ("Get started") |
| Setup - Monthly goal | [02 · Setup - Monthly goal](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3031-1042) | Set how many titles to watch per month with a stepper (default 15) |
| Setup - Favorite genres | [03 · Setup - Favorite genres](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3032-1044) | Pick favorite genres that tune the dashboard and Scene Picker |
| Dashboard | [04 · Dashboard](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3011-2) | Continue-watching hero, monthly stats, up-next rail, watch activity, tonight's pick |
| Dashboard - Empty | [05 · Dashboard - Empty](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3027-987) | First-run dashboard with zeroed stats and a locked Picker card |
| Library | [06 · Library](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3020-57) | Searchable, sortable table of every tracked title with status, rating, favorite |
| Title detail | [07 · Title detail](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3021-159) | One title in full: rating, note, details list, genres and lists |
| Add title (modal) | [08 · Add title](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3023-222) | Form to log a movie or show: type, genre, status, date, rating, note, favorite |
| Edit title (modal) | [09 · Edit title](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3023-637) | Same form prefilled to change an existing title, plus "Delete title" |
| Row menu | [10 · Row menu](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3023-1059) | Per-row menu with "Edit details", "Mark as watched", "Delete title" |
| Delete confirmation | [11 · Delete confirmation](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3023-1434) | Modal that confirms permanent deletion of a title |
| Genres | [12 · Genres](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3024-682) | Genre cards with title counts and one-line descriptors |
| Library - Empty | [13 · Library - Empty](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3024-851) | Library before any title exists, with a single call to action |
| Picker | [14 · Picker](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3025-778) | Mood chips plus three AI picks with match scores and reasons |
| Picker - Generating | [15 · Picker - Generating](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3025-904) | Loading state with skeleton cards while picks generate |
| Picker - Empty | [16 · Picker - Empty](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3025-1057) | Picker before enough titles exist to generate picks |
| Settings | [17 · Settings](https://www.figma.com/design/i6yFe3BHJaGOe8MSK9BtTK/Movie---Watchlist-Tracker?node-id=3026-922) | Edit profile, monthly goal, default type, reminders, genres entry point |

The file also contains Cover, Introduction, Foundations (color, type, spacing, radius tokens), and Components (component library) pages. Those support the Screens page and don't add screens.

## In scope

Exactly what the 17 frames show:

- A marketing-style welcome screen and a two-step setup (monthly watch goal, favorite genres)
- A dashboard with a "CONTINUE WATCHING" hero, three monthly stat cards (watched count, average rating, top genre), an "Up next in your watchlist" poster rail, a "Watch activity" weekly bar chart, and a "TONIGHT'S PICK" teaser card, each with a designed empty variant
- Manual title logging, editing, and deleting via modals, with a confirmation before delete and a quick "Mark as watched" action in the row menu
- A library table with live search, a status filter, a sort control, favorite hearts, and per-row actions, plus a Genres tab of per-genre cards
- A title detail page with rating, personal note, a details list (type, genre, status, rating, watch date, runtime, added), and "Genres & lists" chips
- Scene Picker: mood chips, asynchronous generation with skeleton cards, three picks with match percentages and personalized reasons, "Add to watchlist" and "Not for me" actions, plus empty and locked states
- Settings for profile fields, monthly watch goal, default type, a "New release reminders" toggle, and a genres summary card
- Empty states for Dashboard, Library, and Picker

## Out of scope

Commonly expected but absent from the design, so not part of this build:

- Accounts and authentication: the "Sign in" link on Welcome has no designed screen, and there's no sign-up, password, or sign-out anywhere
- Playback: "Resume", play glyphs, and "NOW WATCHING" imply video, but no player exists in the file; Scene tracks watching, it doesn't stream
- Genre management: "New genre" (12), the genre-card kebab menu (12), and "Manage genres" (17) have no designed destinations or flows
- Photo upload: "Change photo" (17) has no designed flow; avatars stay initials
- Notifications: the "New release reminders" toggle stores a preference, but no notification UI or streaming-service integration is designed
- External catalogs: no movie-database search or import; every field is typed by hand
- Month navigation: the dashboard month dropdown shows only "October"; no other month is designed
- Episode tracking: season and episode progress appears on the hero (04) but is never captured in any form
- Pagination or infinite scroll on the library table
- Mobile or tablet layouts: every frame is 1440x1024 desktop
- Light mode: the Foundations page is explicitly "dark theme" only
- Sharing, social features, multi-user support, and data export or import
- Error, offline, and form-validation states (no error visuals exist anywhere in the file)

Where the design is ambiguous or self-contradictory, the tech spec records the working decision in its assumptions log (A1 to A30).
