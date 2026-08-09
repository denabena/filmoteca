# Movie / Watchlist Tracker: tech spec

This spec turns the Figma design into buildable requirements. Every requirement references the screen it comes from. If a requirement has no screen behind it, it doesn't belong here.

> **Source:** Figma file [Movie / Watchlist Tracker](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=1-4), page "Screens" (25 frames). Frame names and UI copy are quoted as designed, except that long dashes are written as hyphens per DECODE writing rules.
>
> **Frames 18 to 25 were added after the first version of this spec.** They design sign in and account creation, including eight field-level error states. That retires assumption A1 (no authentication) and A30 (no error visuals anywhere), and it makes this a multi-user app. Sections 1, 3, 4, 5, 2.1 and 6 were revised accordingly, and sections 2.14 and 2.15 are new.
>
> **How to read requirement IDs:** each screen has a code (WEL, GOL, GNR, SGN, REG, SHL, DSH, LIB, GEN, DET, ADD, EDT, MNU, DEL, PIC, SET). "LIB-3" means requirement 3 of the Library screens. Careful with the two similar codes: GNR is the onboarding genres step (03), GEN is the library Genres tab (12). Use these IDs when you write Jira tasks so every task traces back here.
>
> **For students:** read the brief first, then work through this spec screen by screen. Every bolded ID is one requirement your Jira tasks must reference. Section 6 records working decisions where the design is ambiguous: challenge an assumption with your teacher if you disagree, don't silently change it. When the design and your instinct conflict, the design wins.

## 1. Overview

**Platform:** desktop web app. Every frame is 1440x1024 with a fixed left sidebar, which is a desktop-first web layout. No mobile or tablet frames exist.

**Suggested architecture:** a single-page web app with four routed views (Dashboard, Library, Picker, Settings) behind a shared app shell, plus modals for title create, edit, and delete, plus sign in and account creation screens that sit **outside** the shell. Data is a store of users, profiles, titles, genres, and picks. The only asynchronous operation the design shows is pick generation, with a visible skeleton loading state (15).

**This build has accounts.** Frames 18 to 25 design email and password sign in, account creation with a Terms consent checkbox, and Google as an alternative provider. A local-only store therefore no longer satisfies the design: there is a real backend with a user record, a session, and per-user data scoping. Every title, preference, and derived view belongs to exactly one account, which is why the operations in section 4 are all implicitly per-user.

**Terms used in this spec:**

- **Modal:** a dialog that opens on top of the page and blocks it until closed.
- **Empty state:** what a screen shows before any data exists.
- **Overline:** the small caption text sitting above a page title.
- **Breadcrumb:** a small link at the top of a page that leads back to the parent page.
- **Kebab menu:** a three-dot button that opens a small menu of actions.
- **Badge (or chip):** a small rounded label that shows a status, like "Watched".
- **Skeleton:** gray placeholder bars shown in place of content while it loads.
- **Tab:** one of a joined pair of buttons that switches the content below it ("All titles" / "Genres").
- **Stepper:** a value with minus and plus buttons on either side.
- **Toggle:** an on/off switch, like "Mark as favorite".
- **Star rating:** a row of five stars used to display or enter a score.
- **Match badge:** the small percentage chip on a pick, like "96% match".
- **Hero card:** the large banner card at the top of a page (the dashboard's "CONTINUE WATCHING").

## 2. Functional requirements per screen

### 2.1 Welcome

**Figma frame:** [01 · Welcome](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3030-1041). **Purpose:** pitch the product and start setup.

UI elements and behavior:

- **WEL-1.** Show the Scene logo (top left), the overline "TRACK EVERYTHING YOU WATCH", the heading "Every movie and show, in one place.", and the intro "Build your watchlist, rate what you've seen, and let Scene Picker tell you exactly what to watch next."
- **WEL-2.** Primary button "Get started" opens Setup - Monthly goal (02).
- **WEL-3.** Caption "Already have an account?" with the link "Sign in", which opens Sign in (18). This requirement previously recorded the link as a dead end; frame 18 now supplies its destination.
- **WEL-4.** Right panel is decorative: three tilted poster cards with play glyphs, a "4.5 rated" chip with a star icon, and a "NOW WATCHING / Severance · S2 E4" card with a progress bar. Display only, no interactions designed.
- **WEL-5.** Footer: "© 2025 Scene · Made for film lovers".

States: default only. No loading, error, or filled variants are designed.

Navigation: entry point is first app launch. Exits: "Get started" → Create account (21) per A31; "Sign in" → 18.

Edge cases: onboarding itself captures no identity, but account creation (21) now does, so the name behind "Welcome back, Mara" and the sidebar profile comes from the signed-in account rather than from a preexisting default. That retires A2.

### 2.2 Setup - Monthly goal

**Figma frame:** [02 · Setup - Monthly goal](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3031-1042). **Purpose:** set the monthly watch goal the profile stores.

UI elements and behavior:

- **GOL-1.** Centered Scene logo above two progress dots (first active). Card overline "STEP 1 OF 2", heading "Set your monthly watch goal", supporting copy "How many movies or shows do you want to watch each month? You can change this anytime."
- **GOL-2.** Goal control: minus and plus stepper buttons around the large readout "15" with the caption "titles / month". Default shown: 15.
- **GOL-3.** Secondary button "Back" returns to Welcome (01), primary button "Continue" saves the goal and opens Setup - Favorite genres (03) (A3).
- **GOL-4.** Stepper bounds and step size aren't designed. Working decision: whole numbers, 1 to 99, step 1 (A4).
- **GOL-5.** The same stored value appears in Settings as "Monthly watch goal" ("15 titles", 17). One value, two editors.

Validation implied by the design: a whole number of titles within the stepper bounds (A4).

States: default only.

Navigation: entry from 01. Exits: "Back" → 01, "Continue" → 03.

Edge cases: no screen ever compares progress against this goal. The dashboard's "WATCHED IN OCTOBER" card shows a plain count ("12 titles", 04) with no "of 15". Build what's designed and flag the gap (A5).

### 2.3 Setup - Favorite genres

**Figma frame:** [03 · Setup - Favorite genres](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3032-1044). **Purpose:** capture favorite genres for personalization.

UI elements and behavior:

- **GNR-1.** Overline "STEP 2 OF 2" (second progress dot active), heading "Pick a few favorite genres", supporting copy "We'll use these to personalize your dashboard and Scene Picker suggestions."
- **GNR-2.** Twelve genre chips: "Sci-Fi", "Drama", "Comedy", "Thriller", "Action", "Romance", "Documentary", "Horror", "Animation", "Fantasy", "Mystery", "Crime". Unselected chips show a colored dot; selected chips show a check mark and an accent border (mock: Sci-Fi, Drama, Thriller, Documentary selected).
- **GNR-3.** Chips are multi-select toggles (four are selected at once in the mock).
- **GNR-4.** Secondary button "Back" returns to 02 with the entered goal kept (A3). Primary button "Finish setup" stores the selection and opens the dashboard, which for a brand-new user is Dashboard - Empty (05).
- **GNR-5.** "A few" sets no minimum or maximum. Working decision: no selection count is enforced and "Finish setup" is always enabled (A6).

Validation implied by the design: none beyond GNR-5.

States: default only.

Navigation: entry from 02. Exits: "Back" → 02, "Finish setup" → 05.

Edge cases: onboarding offers 12 genres but the library's Genres tab shows only 8 cards (12). The genre set and card derivation are assumption A7.

### 2.4 Dashboard (filled and empty)

**Figma frames:** [04 · Dashboard](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3011-2), [05 · Dashboard - Empty](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3027-987). **Purpose:** show the month at a glance and route to logging, the library, and the Picker.

Shared shell (also applies to Library, Picker, Settings):

- **SHL-1.** Fixed dark sidebar: Scene logo, section "MENU" with "Dashboard" and "Library", section "ASSISTANT" with "Picker", section "ACCOUNT" with "Settings". The active item is highlighted. Footer shows avatar initials ("MK"), name "Mara K." and email "mara@email.com" from the profile (17).
- **SHL-2.** Page header pattern: overline, title, and page actions. On the dashboard: overline "Welcome back, Mara" (first name from the profile, static otherwise, A13), title "Dashboard", a month dropdown showing "October" (A8), and a primary "Add title" button that opens the Add title modal (08).

Hero card:

- **DSH-1.** Filled (04): overline "CONTINUE WATCHING", title "Severance", meta "2022 · Sci-Fi · Series", amber badge "Watching", a progress bar with the caption "Season 2 · Episode 4 of 10 · 60%", buttons "Resume" and "Details", and poster art. The slot shows the current "Watching" title (A9); episode progress is display-only because no form captures it (A9); "Resume" has no designed destination, "Details" opens Title detail (07) (A10).
- **DSH-2.** Empty (05): overline "NOTHING IN PROGRESS", heading "Nothing playing right now", copy "Start a movie or show and you'll pick up right where you left off - right here.", button "Browse watchlist" → Library (06, or 13 when empty), and an empty poster placeholder.

Stat cards:

- **DSH-3.** Card "WATCHED IN OCTOBER": value "12 titles" with the green trend caption "+3 vs September". Empty (05): "0 titles" and "No titles this month". Scoped to the header month (A8); the mock's 12 conflicts with the activity card's 14 (A29).
- **DSH-4.** Card "AVERAGE RATING": "4.2 / 5" with a five-star row (four filled). Empty (05): a dash in place of the value ("- / 5") and five gray stars.
- **DSH-5.** Card "TOP GENRE": "Sci-Fi" with a genre dot and the caption "8 titles this month". Empty (05): a dash and "No data yet".

Main content:

- **DSH-6.** Section "Up next in your watchlist" with action "View all" → Library (06). Seven poster cards, each with a name and the caption "{year} · {type}": "Dune: Part Two 2024 · Movie", "Oppenheimer 2023 · Movie", "Poor Things 2023 · Movie", "Shōgun 2024 · Series", "Past Lives 2023 · Movie", "The Bear 2022 · Series", "Anatomy of a Fall 2023 · Movie". The rail is the want-to-watch queue (A11); the mock's contents conflict with those titles' statuses in 06 (A29). Empty (05): a dashed-border box with "Nothing queued yet", "Titles you add to your watchlist will line up here.", and button "Add your first title" → 08.
- **DSH-7.** Card "Watch activity": green badge "14 this month" (up arrow), four weekly bars valued 3, 5, 2, 4 and labeled "W1", "W2", "W3", "This week", with the current week's bar highlighted in accent red. Empty (05): badge "No activity yet" and zeroed bars labeled "W1" to "W4" (label conflict, A12; total 14 vs stat 12, A29). Display only, no designed interactions.
- **DSH-8.** Picker card (right column). Filled (04): overline "TONIGHT'S PICK" with a sparkle icon, pick "Arrival" with poster thumbnail, meta "2016 · Sci-Fi · Movie", reason "Because you loved Dune and rate Sci-Fi 4.5★ on average.", and link "Open Picker →" → Picker (14). The teaser shows the current top pick with a shortened reason (the full reason is on 14). Locked (05): overline "PICKER LOCKED", heading "No pick yet", caption "Add titles to unlock", copy "Scene Picker suggests what to watch once you've added and rated a few titles.", and link "Add a title →" → 08.

States: filled (04) and empty (05). No loading or error states are designed.

Navigation: entry after onboarding (03 → 05) and from the sidebar. Exits: "Add title" and "Add your first title" and "Add a title" → 08, "Browse watchlist" and "View all" → 06, "Details" → 07, "Open Picker" → 14, sidebar → 06/14/17.

Edge cases visible or implied: dash placeholders when no ratings exist (05), the month dropdown designed only for October (A8), the monthly goal never displayed here (A5).

### 2.5 Library - List and empty state

**Figma frames:** [06 · Library](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3020-57), [13 · Library - Empty](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3024-851). **Purpose:** the full log of tracked titles.

Header and controls:

- **LIB-1.** Page header: overline "Your watchlist", title "Library", primary "Add title" button → modal (08).
- **LIB-2.** Tabs "All titles" (default) and "Genres" switch between the table (06) and the genre cards (12).
- **LIB-3.** Controls right of the tabs: a search input with placeholder "Search titles", a "Status" dropdown, and a "Sort: Recent" dropdown. Only the closed controls are designed: search filters rows live by title, the status filter offers the three designed statuses, and sort is by added date, newest first, with at least a reverse option (A14).

Table (06):

- **LIB-4.** Columns: TITLE, GENRE, STATUS, RATING, FAV, plus a kebab (three-dot) action button per row.
- **LIB-5.** Each row: a colored poster tile with play glyph, the title name, and the caption "{year} · {type}" ("Dune: Part Two, 2024 · Movie"); a genre dot plus name ("Sci-Fi"); a status chip "Watched" (green), "Watching" (amber), or "Want to watch" (neutral); a five-star rating or a dash when unrated; a favorite heart (filled or outline); the kebab. The mock lists 10 rows, from "Dune: Part Two" to "The Zone of Interest". Genre dot colors come from the Foundations genre palette, one color per genre; the mock's conflicting dots are assumption A29.
- **LIB-6.** Clicking the FAV heart toggles favorite on and off in place (Favorite On/Off component).
- **LIB-7.** Clicking a row opens Title detail (07) (A15). The kebab opens the Row menu (10).
- **LIB-8.** No pager or scroll indicator is designed, so the table scrolls vertically as one page (A16).

Empty state (13):

- **LIB-9.** Play icon in a circle, heading "Your watchlist is empty", copy "Add your first movie or show to start tracking what you watch, rate, and want to see next.", button "Add your first title" → 08. The tabs, search, status, and sort controls remain visible, as designed.

States: populated (06), empty (13). No loading, error, or no-results states are designed (A14).

Navigation: entry from sidebar "Library", dashboard "View all" and "Browse watchlist". Exits: row → 07, kebab → 10, tabs → 12, "Add title" → 08.

Edge cases: a search with zero matches has no designed state (A14); the same genre appears with different dot colors in the mock (A29).

### 2.6 Library - Genres tab

**Figma frame:** [12 · Genres](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3024-682). **Purpose:** the library grouped by genre.

- **GEN-1.** Same page header; "Genres" tab active. The search, status, and sort controls are replaced by a secondary "New genre" button on the right of the tab row.
- **GEN-2.** Eight genre cards in two columns, each with a colored icon tile, name, title count, a kebab, and a one-line descriptor: "Sci-Fi, 8 titles, Space, time, and everything after."; "Drama, 6 titles, Character-driven, awards-season bait."; "Comedy, 5 titles, Light watches for tired nights."; "Action, 5 titles, Explosions, chases, and set-pieces."; "Thriller, 4 titles, Edge-of-seat, twist-heavy plots."; "Romance, 3 titles, Love stories and slow burns."; "Documentary, 3 titles, Real stories worth knowing."; "Horror, 2 titles, Watch with the lights on."
- **GEN-3.** Cards and counts derive from the library: a card appears once a genre has at least one title (A7). The mock's counts (36 titles across cards vs 10 rows in 06) are illustrative (A29).
- **GEN-4.** The card kebab has no designed menu and the card itself has no designed destination; both stay non-functional until designed (A24). Descriptors are static default copy (A24).
- **GEN-5.** "New genre" has no designed flow anywhere in the file; the button stays non-functional until designed (A24).

States: default only. A genres-empty variant isn't designed.

Navigation: entry via the "Genres" tab on 06. Exits: "All titles" tab → 06, "Add title" → 08.

Edge cases: what happens to a card when its last title is deleted follows A7 (card disappears).

### 2.7 Title detail

**Figma frame:** [07 · Title detail](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3021-159). **Purpose:** one title in full, with the route to editing.

- **DET-1.** Breadcrumb "Library / Dune: Part Two" with a back arrow returns to Library (06). Header action "Edit details" opens the Edit title modal (09).
- **DET-2.** Main card: poster, overline "SCI-FI · MOVIE", title "Dune: Part Two", meta "2024 · 2h 46m · Directed by Denis Villeneuve", a green "Watched" badge next to a filled favorite heart, and the rating row "4.5 / 5" with five stars.
- **DET-3.** Section "YOUR NOTE" with the note text: "Villeneuve sticks the landing - the Arrakis worldbuilding and the score are staggering on a big screen. Rewatch before Part Three."
- **DET-4.** Details card, seven label-value rows: "Type Movie", "Genre Sci-Fi", "Status Watched" (green), "Rating ★ 4.5", "Watch date Oct 12, 2024", "Runtime 2h 46m", "Added Sep 28, 2024".
- **DET-5.** Card "Genres & lists" with chips "Sci-Fi", "Epic", "Rewatch", "2024 favorites". No screen captures these list chips, so beyond the genre they're display-only (A17).
- **DET-6.** Data gap to resolve: year, runtime, and director appear here but are never captured in Add or Edit (08, 09). "Added" is set automatically at creation. Until the designer answers, uncaptured fields stay empty for user-created titles (A17).
- **DET-7.** There is no Delete button on this screen. Deletion goes through the Row menu (10) or the Edit modal (09).

States: default only. A title without a note or rating isn't designed here (A18).

Navigation: entry from a library row (LIB-7). Exits: breadcrumb → 06, "Edit details" → 09.

Edge cases: hide the note section when a title has no note and show the dash pattern from 06 for missing ratings (A18).

### 2.8 Add title (modal)

**Figma frame:** [08 · Add title](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3023-222). **Purpose:** log a movie or show manually.

- **ADD-1.** Modal over the current page (mocked over Library) titled "Add title" with an X close button.
- **ADD-2.** Fields, top to bottom: "Title" (text, filled "Dune: Part Two" in the mock), "Type" (select, "Movie") and "Genre" (select, "Sci-Fi") side by side, "Status" (select, "Watched") and "Watch date" (date, "Oct 12, 2024") side by side, "Rating" (five-star input showing "4.5 / 5"), "Note" (textarea, placeholder "Add a note or first impression..."), and a "Mark as favorite" toggle with the caption "Show this title in your favorites" (on in the mock).
- **ADD-3.** Buttons: "Cancel" (closes without saving) and primary "Add title" (creates the title, closes the modal, refreshes the underlying page).
- **ADD-4.** Type options: only "Movie" and "Series" appear anywhere in the file (06, 07 metas). The default comes from Settings "Default type" (17).
- **ADD-5.** Genre is a single select here, while 07 shows extra list chips. The form wins: one genre per title (A19).

Validation implied by the design:

- **ADD-6.** Required fields: Title, Type, Genre, Status (none carries an "(optional)" marker; the Note placeholder implies Note is optional). No error states are designed (A20, A30).
- **ADD-7.** "Watch date" and "Rating" only make sense for watched titles; the mock shows them filled with status "Watched". Working decision: both stay optional and editable regardless of status (A20).
- **ADD-8.** The Rating component on the Components page defines whole stars 0 to 5, but mocks display "4.5 / 5". Working decision: half-star input is allowed (A21).

States: default only.

Navigation: opens from the header "Add title" (SHL-2, LIB-1), the dashboard empty queue and locked Picker card (DSH-6, DSH-8), the library empty state (LIB-9), and the Picker empty state (PIC-2). Closes via Cancel, X, or "Add title".

Edge cases: a title with watch date in a previous month must land in that month's dashboard stats, not the current month's (04 is month-scoped, A8).

### 2.9 Edit title (modal)

**Figma frame:** [09 · Edit title](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3023-637). **Purpose:** correct an existing title.

- **EDT-1.** Same form as Add title, titled "Edit title", prefilled with the title's values (mock: "Dune: Part Two", "Movie", "Sci-Fi", "Watched", "Oct 12, 2024", "4.5 / 5", favorite on).
- **EDT-2.** Footer adds a danger text action "Delete title" with a trash icon on the left, which opens Delete confirmation (11). Buttons: "Cancel" and primary "Save changes" (persists edits, closes, refreshes list, detail, dashboard, and genre counts).
- **EDT-3.** All Add title validation rules apply (ADD-4 to ADD-8).
- **EDT-4.** Copy conflict: the Note field is empty here (placeholder showing) while 07 shows a saved note for the same title. Flag with the designer (A29).

Navigation: opens from the Row menu "Edit details" (10) and from Title detail "Edit details" (DET-1).

### 2.10 Row menu

**Figma frame:** [10 · Row menu](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3023-1059). **Purpose:** quick actions on one title without opening it.

- **MNU-1.** The kebab button on a library row opens a small menu anchored to the row with three items: "Edit details" (pencil icon), "Mark as watched" (check-circle icon), and "Delete title" (trash icon, danger color).
- **MNU-2.** "Edit details" opens the Edit title modal (09) for that title. "Mark as watched" sets the title's status to "Watched" and refreshes the row chip and dashboard stats; the menu is mocked on a "Watching" row and the same menu on an already-watched row is assumption A22. "Delete title" opens Delete confirmation (11). The menu closes on outside click or Escape (A22).

### 2.11 Delete confirmation

**Figma frame:** [11 · Delete confirmation](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3023-1434). **Purpose:** prevent accidental permanent deletion.

- **DEL-1.** Modal with a coral trash icon, title "Delete this title?", and body copy quoting the title name: "'Dune: Part Two' and its rating, note, and watch history will be permanently removed. This can't be undone."
- **DEL-2.** Buttons: "Cancel" (closes, nothing happens) and danger primary "Delete title" (deletes the title, closes, refreshes the list).
- **DEL-3.** "Permanently" and "can't be undone" rule out an undo or trash feature. Deletion must also recompute every derived view: dashboard stats, watch activity, genre counts, and Picker gating (A23).

Navigation: opens from the Row menu (10) and from the Edit modal's "Delete title" (EDT-2). After deleting, land back on Library - List.

### 2.12 Scene Picker (empty, generating, picks)

**Figma frames:** [14 · Picker](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3025-778), [15 · Picker - Generating](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3025-904), [16 · Picker - Empty](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3025-1057). **Purpose:** turn the library, ratings, and tonight's mood into three picks.

Header:

- **PIC-1.** Overline "AI assistant", title "Scene Picker". No page-level primary button.

Empty state (16):

- **PIC-2.** Hero card with a sparkle icon, heading "The Picker needs a few titles first", copy "Add and rate some movies or shows, and Scene Picker will learn your taste and suggest exactly what to watch next.", and button "Add your first title" → Add title modal (08). The mood card is not shown in the empty state.

Mood card (14, 15):

- **PIC-3.** Dark card: sparkle overline "SCENE PICKER", heading "What are you in the mood for tonight?", six mood chips: "Something light", "Mind-bender", "Edge of seat", "Feel-good", "Short & sweet", "Critically loved" (mock: "Mind-bender" and "Critically loved" selected), caption "Personalized from your watchlist, ratings & favorite genres.", and primary button "Surprise me".
- **PIC-4.** Mood chips are multi-select with no designed limit (A25).
- **PIC-5.** "Surprise me" starts generation (15): the button becomes "Generating...", the section below shows the heading "Finding your next watch...", the sparkle caption "Analyzing your ratings, favorites, and tonight's mood...", and three skeleton pick cards. No cancel control exists (A27).

Picks (14):

- **PIC-6.** Section "Tonight's picks for you" with three pick cards. Each has a poster thumbnail, name, match badge, meta "{year} · {genre} · {type}", and a reason line: "Arrival, 96% match, 2016 · Sci-Fi · Movie, Because you loved Dune and rate Sci-Fi 4.5★ on average - cerebral, patient, gorgeous."; "The Menu, 91% match, 2022 · Thriller · Movie, Dark and twisty with a short runtime - a lot like Anatomy of a Fall, which you rated highly."; "Everything Everywhere All at Once, 89% match, 2022 · Sci-Fi · Movie, High-concept sci-fi with real heart - matches three of your favorite titles."
- **PIC-7.** Pick actions: primary "Add to watchlist" (creates the title in the library with status "Want to watch", A25) and text action "Not for me" (dismisses the card; no replacement behavior is designed, A25).
- **PIC-8.** Data gap to resolve: nothing in the file says where candidate titles come from (no external search or catalog exists). Working decision: a bundled sample catalog until the designer and PM answer (A26).
- **PIC-9.** When generation finishes, show the new picks (14). Failure isn't designed: on failure keep the previous picks (A27). The unlock threshold ("a few titles" on 16, "added and rated a few titles" on 05) isn't designed either; working decision in A27.

States: empty (16), generating (15), results (14).

Navigation: entry from sidebar "Picker" and dashboard "Open Picker" (DSH-8). Exits: "Add your first title" → 08; "Add to watchlist" and "Not for me" stay on the page; the dashboard teaser (DSH-8) shows the top pick.

Edge cases: regenerating replaces all three picks; the dashboard teaser must always match the current top pick (DSH-8).

### 2.13 Settings

**Figma frame:** [17 · Settings](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3026-922). **Purpose:** edit the profile and watch preferences.

- **SET-1.** Header: overline "Account", title "Settings".
- **SET-2.** Card "Profile": avatar circle with initials "MK" and a "Change photo" button (no upload flow is designed, A28); inputs "First name" ("Mara"), "Last name" ("Kovač"), "Email" ("mara@email.com").
- **SET-3.** Card "Watch preferences": input "Monthly watch goal" ("15 titles", the value from 02, bounds per A4) and select "Default type" ("Movie"), which prefills the Add title Type field (ADD-4).
- **SET-4.** Toggle "New release reminders" with caption "Notify me when titles on my watchlist start streaming" (on in the mock). A stored preference only: no notification UI or streaming data exists in the design (A28).
- **SET-5.** Card "Genres": summary "8 genres · organize how your library is grouped" and button "Manage genres". Its destination isn't designed; working decision: it opens the library Genres tab (12) (A28).
- **SET-6.** Primary button "Save changes" persists everything silently; no success or unsaved-changes state is designed (A28). Changing names must update the sidebar footer, avatar initials, and the dashboard greeting (SHL-1, SHL-2).

Validation implied: email format, names non-empty, goal within the stepper bounds (A4, A30).

States: default only.

Navigation: entry from sidebar "Settings". No exit button; navigation happens via the sidebar.

### 2.14 Sign in

**Figma frames:** [18 · Sign in](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3069-1082), [19 · Sign in - Wrong password](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3072-1090), [20 · Sign in - Email not found](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3072-1113). **Purpose:** let a returning person back into their account.

UI elements and behavior:

- **SGN-1.** Centred card on the canvas background, outside the app shell: Scene logo, heading "Sign in", supporting copy "Pick up where you left off.", and labelled Email and Password fields. The password is masked.
- **SGN-2.** Primary button "Sign in" authenticates and opens the Dashboard.
- **SGN-3.** Link "Forgot password?", right-aligned under the Password field. No reset screen exists anywhere in the file, so the link stays non-functional until designed (A32).
- **SGN-4.** Wrong password (19): the Password field takes a danger border and the message "Wrong password. Try again or reset it." appears directly below it.
- **SGN-5.** Email not found (20): the Email field takes a danger border and the message "No account found for this email." appears directly below it.
- **SGN-6.** An "or" divider, then the secondary button "Continue with Google" (A33).
- **SGN-7.** Footer caption "New here?" with the link "Create an account" → 21.
- **SGN-8.** Signing out returns here. No sign-out control is designed anywhere in the file (A36).

Validation implied by the design: both fields are required. The two failure modes are deliberately distinguishable, because SGN-4 and SGN-5 specify different copy. That discloses whether an email is registered, which is a security trade-off to confirm with the designer rather than silently collapse into one generic message.

States: default (18), wrong password (19), email not found (20). No loading state is designed.

Navigation: entry from Welcome "Sign in" (WEL-3) and from Create account "Sign in" (REG-10). Exits: successful sign in → 04/05, "Create an account" → 21.

Edge cases: a signed-in person opening this screen directly should land on the Dashboard rather than see the form again. Not designed; working decision.

### 2.15 Create account

**Figma frames:** [21 · Create account](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3073-1106), [22 · Email registered](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3074-1117), [23 · Weak password](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3074-1156), [24 · Terms not accepted](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3074-1195), [25 · Name missing](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3074-1234). **Purpose:** create the account every other screen depends on.

UI elements and behavior:

- **REG-1.** Centred card outside the app shell: Scene logo, heading "Create your account", supporting copy "Start tracking what you want to watch.", and labelled Name, Email and Password fields.
- **REG-2.** Helper text "At least 8 characters." in muted style below the Password field.
- **REG-3.** Consent checkbox reading "I agree to the Terms and Privacy Policy", with Terms and Privacy Policy styled as links. Neither has a designed destination (A34).
- **REG-4.** Primary button "Create account" creates the account and enters onboarding (A31).
- **REG-5.** Email already registered (22): the Email field takes a danger border and "This email is already registered. Sign in instead?" appears below it.
- **REG-6.** Password too short (23): the Password field takes a danger border and "Password must be at least 8 characters." **replaces** the REG-2 helper text rather than stacking under it.
- **REG-7.** Terms not accepted (24): the checkbox is unchecked and "Please accept the Terms to continue." appears below the consent row.
- **REG-8.** Name missing (25): the Name field takes a danger border and "Enter your name." appears below it.
- **REG-9.** An "or" divider, then the secondary button "Continue with Google" (A33).
- **REG-10.** Footer caption "Already have an account?" with the link "Sign in" → 18.
- **REG-11.** This screen captures a single **Name** field, while Settings (17) has separate First name and Last name. The two disagree (A35).

Validation implied by the design: Name, Email, Password and the consent checkbox are all required. Password minimum is 8 characters, taken from REG-2 and REG-6. No other password rule is designed, so complexity requirements must not be invented. Errors attach to the specific field that failed; each of frames 22 to 25 mocks one error alone, so the several-errors-at-once case is a working decision.

States: default (21), plus the four error states (22 to 25). No loading state is designed.

Navigation: entry from Welcome "Get started" (A31) and from Sign in "Create an account" (SGN-7). Exits: success → Setup - Monthly goal (02), "Sign in" → 18.

Edge cases: whether a person arriving through Google still walks through the two Setup steps is not designed (A33).

## 3. Data model

Entities and fields implied by the screens. Names are suggestions, fields are evidence-based.

**Everything below belongs to exactly one User.** Titles, profile data and picks are all per-account, and no query may reach across accounts.

**User** (implied by 18 to 25)

| Field | Type | Evidence |
|---|---|---|
| email | string, unique | 18 "Email", 21 "Email", REG-5 rejects duplicates |
| passwordHash | string | 18 and 21 Password fields; never stored in plain text |
| authProvider | enum: password, google | "Continue with Google" (18, 21), A33 |
| termsAcceptedAt | timestamp | REG-3 consent checkbox, REG-7 blocks without it |
| createdAt | timestamp | implied by account creation |

**Profile** (implied by 17, 02, 03, 21, sidebar and greeting on every view)

| Field | Type | Evidence |
|---|---|---|
| firstName | string | 17 "First name", "Welcome back, Mara" (04/05); derived from the single Name field on 21 per A35 |
| lastName | string | 17 "Last name", "Mara K." sidebar footer; see A35 |
| email | string | 17 "Email", sidebar footer, 18 and 21; the same value the account signs in with |
| avatarInitials | derived from names | "MK" avatar (17, sidebar); photo upload isn't designed (A28) |
| monthlyWatchGoal | number | 02 stepper "15 titles / month", 17 "Monthly watch goal" |
| defaultType | enum: movie, series | 17 "Default type" |
| newReleaseReminders | boolean | 17 toggle |
| favoriteGenres | list of genre references | 03 chips, "favorite genres" caption (14) |

**Title** (implied by 06, 07, 08, 09)

| Field | Type | Evidence |
|---|---|---|
| name | string | 08 "Title", TITLE column (06) |
| type | enum: movie, series | 08 "Type", "2024 · Movie" metas (06, 07) |
| genre | genre reference, single | 08 "Genre", GENRE column (06), A19 |
| status | enum: watched, watching, want to watch | 08 "Status", STATUS chips (06) |
| watchDate | date, optional | 08 "Watch date", "Watch date Oct 12, 2024" (07) |
| rating | 0 to 5 stars, optional | 08 "Rating", RATING column (06), "4.5 / 5" (07), A21 |
| note | string, optional | 08 "Note", "YOUR NOTE" (07) |
| favorite | boolean | 08 toggle, FAV hearts (06), heart badge (07) |
| addedAt | timestamp, set automatically | "Added Sep 28, 2024" (07), "Sort: Recent" (06) |
| year | display-only, no input | "2024" metas (06, 07), A17 |
| runtime | display-only, no input | "2h 46m" (07), A17 |
| director | display-only, no input | "Directed by Denis Villeneuve" (07), A17 |
| progress | display-only, no input | "Season 2 · Episode 4 of 10 · 60%" (04), A9 |
| listChips | display-only, no editor | "Epic", "Rewatch", "2024 favorites" (07), A17 |

**Genre** (implied by 03, 06, 12, 17)

| Field | Type | Evidence |
|---|---|---|
| name | string | chips (03), GENRE column (06), cards (12) |
| colorSlot | one of the 8 palette slots | genre dots (06), card tiles (12), Foundations "Genre" palette |
| descriptor | string, static copy | card taglines (12), A24 |
| titleCount | derived | "8 titles" (12), "8 genres" (17) |

**Pick** (implied by 14, 04)

| Field | Type | Evidence |
|---|---|---|
| titleName, year, genre, type | strings | pick cards (14) |
| matchPercent | number | "96% match" (14) |
| reason | string | reason lines (14), shortened teaser (04) |
| state | enum: suggested, added, dismissed | "Add to watchlist", "Not for me" (14), A25 |
| moods | selected mood chips | 14 |
| generatedAt | timestamp | implied by regeneration (15) |

Aggregates (all derived from titles, never stored): monthly watched count and delta vs the previous month (04), monthly average rating (04), top genre per month (04), weekly watch-activity buckets (04/05), the up-next queue (04), the continue-watching slot (04), genre title counts (12, 17), and the Picker unlock state (05/16).

## 4. API surface

Functional operations each screen needs. Not final API design. **Every operation below is scoped to the signed-in account**, and every one of them requires an authenticated session except the three sign-in and sign-up operations themselves.

| Operation | Kind | Used by |
|---|---|---|
| signIn(email, password) | create session | 18 (SGN-2) |
| signUp(name, email, password, consent) | create | 21 (REG-4) |
| signInWithGoogle() | create session | 18, 21 (SGN-6, REG-9) |
| signOut() | delete session | sidebar footer (SGN-8, A36) |
| getProfile() | read | shell (SHL-1), greeting (SHL-2), 17 |
| updateProfile(fields) | update | 17 |
| setMonthlyGoal(titlesPerMonth) | update | 02, 17 |
| setFavoriteGenres(genres) | update | 03 |
| createTitle(fields) | create | 08 |
| listTitles(search?, status?, sort) | read | 06 |
| getTitle(id) | read | 07 |
| updateTitle(id, fields) | update | 09 |
| markAsWatched(id) | update | 10 (MNU-2) |
| toggleFavorite(id) | update | 06 (LIB-6) |
| deleteTitle(id) | delete | 11 |
| listGenresWithCounts() | read | 12, 17 genres card |
| getDashboardSummary(month) | read | 04/05 (hero, stats, queue, activity, teaser) |
| generatePicks(moods) | async create | 14/15 ("Surprise me" → skeletons → picks) |
| addPickToWatchlist(pickId) | create | 14 (PIC-7) |
| dismissPick(pickId) | update | 14 (PIC-7) |

Operations that deliberately do not exist: password reset ("Forgot password?" is a dead end, A32), any playback operation ("Resume" has no player, A10), createGenre and editGenre ("New genre" and the card kebab are dead ends, A24), uploadAvatar ("Change photo" is a dead end, A28), and notification delivery (A28). Derived views recompute whenever createTitle, updateTitle, markAsWatched, toggleFavorite, or deleteTitle succeed: dashboard stats and activity, the up-next queue, genre counts, and Picker gating (A23).

## 5. Non-functional notes

Only what the design implies:

- **Localization:** English only, one language across all frames. US date formats ("Oct 12, 2024"). Runtimes as "2h 46m".
- **Async and loading:** the only designed loading state is pick generation (15: "Generating...", skeleton cards). No spinner is designed for sign in, account creation or the Google redirect, even though all three are network round trips. Screen loads are otherwise expected to be instant.
- **Error handling:** the authentication screens (19, 20, 22 to 25) are the only designed error visuals in the file, and they establish the pattern for the whole app: a danger border on the offending field plus a short message directly below it. Every other form (Add title, Edit title, Settings) reuses that treatment rather than inventing one. No page-level or network-failure state is designed anywhere.
- **Security observations:** sign in is by email, so changing an email in Settings changes a credential (A35 area, see section 2.13). SGN-4 and SGN-5 deliberately reveal whether an email is registered. Neither reauthentication nor email verification is designed.
- **Accessibility observations:** status is never encoded by color alone (chips carry text plus a dot); genre dots are always paired with the genre name. The FAV column is icon-only hearts and needs an accessible label. Form fields all have visible labels, including on 18 and 21. Field errors must be programmatically associated with their field. Focus, hover, and keyboard states aren't designed; the star-rating input (08), toggles (08, 17, 21), and mood chips (14) need keyboard support decisions.
- **Responsiveness:** all frames are fixed 1440x1024 desktop. No breakpoints designed.
- **Visual system:** the Foundations page is explicitly dark theme only, with surface tokens (canvas #0F1216, sidebar, card, raised, elevated, muted), a crimson accent, status tones (success green, warning amber, danger red, each with text and soft variants), and an eight-slot genre palette (crimson, amber, green, teal, blue, indigo, purple, pink). The Components page defines Button (primary/secondary/danger), Tag/Status, Section header, Input and Select fields, Stat, List row, Rating (0 to 5), Progress bar, Favorite toggle, Genre chip, Mood chip, and the Sidebar. Build these as shared components, they repeat across screens.

### 5.1 Confirmed token values

Read out of the design while building the sidebar (SHL-1) and the auth card (2.14, 2.15), so this is the subset those parts use, not the whole Foundations page. Treat a token name as the thing to reference in code; the hex is here so nobody has to eyedrop a screenshot.

| Token | Value | Seen on |
|---|---|---|
| Canvas | `#0F1216` | page background, every frame |
| Surface/Sidebar | `#0B0E12` | sidebar column |
| Surface/Card | `#181C22` | auth card |
| Surface/Card Raised | `#1F242B` | active nav item, input fields, secondary button |
| Surface/Elevated | `#262C34` | avatar circle |
| Border/Default | `#262C34` | card border, divider lines |
| Border/Strong | `#353D48` | input and secondary-button border |
| Brand/Accent | `#F0455F` | logo tile, active nav icon, links, primary button |
| Text/Primary | `#F4F6F8` | headings, active nav label, field values |
| Text/Secondary | `#A6ADB8` | inactive nav labels, field labels, body copy |
| Text/Tertiary | `#6C7480` | section overlines, inactive nav icons, captions, helper text |
| Text/On Accent | `#FFFFFF` | primary button label |
| Status/Danger Text | `#F08A83` | all field error messages (19, 20, 22 to 25) |

Note that **Border/Default and Surface/Elevated are the same hex**, `#262C34`. Two names, one value: keep them distinct in code, because either could be re-themed independently.

Type styles, all Inter unless stated:

| Style | Definition | Used for |
|---|---|---|
| Brand/Wordmark | Space Grotesk Bold 20, letter-spacing -1% | "Scene" in the sidebar |
| Display/M | Space Grotesk Bold 24, line-height 1.16, letter-spacing -1% | auth card headings |
| Body/M | Regular 14, line-height 1.5 | supporting copy, field values |
| Body/S | Regular 13, line-height 1.5 | helper text, error messages, "or" |
| Label/L | Medium 14 | nav item labels |
| Label/M | Medium 13 | form field labels |
| Label/S | Medium 12 | avatar initials |
| Strong/M | Semi Bold 14 | button labels, footer links |
| Strong/S | Semi Bold 13 | "Forgot password?", profile name |
| Overline | Medium 11, letter-spacing 8% | sidebar section labels, card overlines |
| Caption | Regular 11.5, line-height 1.4 | profile email |

## 6. Assumptions log

Numbered so teachers can review each one. Three are **retired**: they were written when the file had 17 frames and frames 18 to 25 answered them.

- **A1. RETIRED.** Said "Sign in" (01) had no designed screen and this build had no authentication. Frame 18 exists, so it does. See sections 2.14 and 2.15.
- **A2. RETIRED.** Said a default local profile had to exist from first launch, because nothing captured identity. Account creation (21) captures it. The name in the greeting and the sidebar comes from the signed-in account.
- **A3.** "Back" moves one step (02 → 01, 03 → 02) and preserves values already entered.
- **A4.** The goal stepper (02) has no designed bounds. Working decision: whole numbers 1 to 99, step 1, default 15; Settings (17) uses the same bounds.
- **A5.** The monthly goal is never compared to progress anywhere: the "WATCHED IN OCTOBER" card (04) shows a plain count. Build as designed and flag the gap with the designer.
- **A6.** "Pick a few favorite genres" (03) enforces no minimum or maximum; "Finish setup" is always enabled.
- **A7.** Onboarding offers 12 genres (03), the Genres tab shows 8 cards (12), and Settings says "8 genres" (17). Working decision: the 12 onboarding genres are the app's genre set, and a card appears once a genre has at least one title, with counts derived from the library.
- **A8.** The "October" dropdown (04/05) scopes the stat cards and watch activity to a month. Only October is designed; assume the list offers the current and past months.
- **A9.** The continue-watching hero (04) shows the most recently updated title with status "Watching". Season, episode, and percent progress are displayed but never captured anywhere, so they stay display-only and hidden for titles without them.
- **A10.** "Resume" (04) has no designed destination and no player exists in the file; it stays non-functional until designed. "Details" opens Title detail (07).
- **A11.** "Up next in your watchlist" (04) lists titles with status "Want to watch", newest first.
- **A12.** Weekly bars are labeled "W1, W2, W3, This week" when filled (04) but "W1 to W4" when empty (05). Working decision: label the current week "This week" whenever the month has activity.
- **A13.** The greeting "Welcome back, Mara" is static apart from the first name (no time-of-day variants are designed).
- **A14.** Only the closed search, "Status", and "Sort: Recent" controls are designed (06). Working decisions: search filters by title as you type, the status filter offers the three designed statuses, sort is by added date newest first plus a reverse option, and a no-results state uses a simple "no matches" message; confirm the pattern with the designer.
- **A15.** Clicking a library row opens Title detail (07), implied by that screen's "Library" breadcrumb.
- **A16.** The library table scrolls vertically with no pagination (10 rows shown, no pager designed).
- **A17.** Year, runtime, director, and the "Genres & lists" chips (07) are shown but never captured; "Added" is set automatically at creation. Uncaptured fields stay empty for user-created titles until the designer answers how they're entered.
- **A18.** A title without a note or rating isn't designed on Title detail (07). Working decision: hide the note section and show the dash pattern from 06 for the rating.
- **A19.** Genre is single-select in the form (08) while 07 shows multiple chips. The form wins: one genre per title.
- **A20.** In Add and Edit title, required fields are Title, Type, Genre, and Status; Note is optional by placeholder; "Watch date" and "Rating" stay optional and editable regardless of status, since no rule is designed.
- **A21.** The Rating component defines whole stars 0 to 5, but "4.5 / 5" appears on 06, 07, and 08. Working decision: half-star input is allowed; confirm with the designer.
- **A22.** The row menu (10) is mocked on a "Watching" row. The same menu shows on every row; "Mark as watched" is a no-op on already-watched titles until the designer specifies a variant. The menu closes on outside click or Escape.
- **A23.** Deleting a title recomputes every derived view: dashboard stats, watch activity, genre counts, and Picker gating.
- **A24.** "New genre", the genre-card kebab, and the genre card itself (12) have no designed flows or destinations; all three stay non-functional until designed. Card descriptors are static default copy, since nothing captures them.
- **A25.** Mood chips (14) are multi-select with no designed limit. "Add to watchlist" creates the pick as a "Want to watch" title and the card stays put (no after-state is designed); "Not for me" removes the card with no designed replacement.
- **A26.** Nothing in the file says where pick candidates come from (no external catalog or search exists). Working decision: a bundled sample catalog until the designer and PM answer.
- **A27.** Generation (15) has no cancel and no designed failure state: on failure keep the previous picks. The unlock threshold ("a few titles", 16; "added and rated a few titles", 05) isn't designed; working decision: the Picker unlocks once 3 titles are rated; confirm with the designer.
- **A28.** Settings dead ends (17): "Change photo" has no upload flow (initials remain); "Manage genres" is assumed to open the Genres tab (12); "New release reminders" is a stored preference with no notification system behind it; "Save changes" persists silently with no designed success state.
- **A29.** Where screens conflict, each follows its own mock until the designer resolves it: "14 this month" activity vs "12 titles" watched (04); watched titles sitting in the up-next rail (04 vs 06); the saved note on 07 vs the empty Note field on 09; the same genre with different dot colors on 06 (Comedy amber vs pink, Drama blue vs teal); and genre-card counts totaling 36 (12) vs the 10-row list (06). Mock numbers are illustrative: displayed values must be computed from real data.
- **A30. RETIRED.** Said no form error or validation visuals existed anywhere in the file. Frames 19, 20 and 22 to 25 design eight of them, and they set the pattern every other form reuses: danger border on the field plus a message directly below it. See "Error handling" in section 5.
- **A31.** The design never shows how Welcome (01) reaches account creation. "Get started" goes to Setup (02) and "Sign in" goes to 18, but nothing points at 21. Working decision: "Get started" opens Create account (21), and the two Setup steps follow successful creation. This changes the first thing every new user sees, so confirm it.
- **A32.** "Forgot password?" (18) has no designed screen. The link stays non-functional until designed, exactly as "Sign in" used to be.
- **A33.** "Continue with Google" (18, 21) has no designed consent screen, no callback screen and no loading state. Two open questions: what the user sees while the redirect resolves, and whether a Google user still walks through the two Setup steps.
- **A34.** The "Terms" and "Privacy Policy" links in the consent row (21) have no destinations anywhere in the file.
- **A35.** Create account captures one **Name** field (REG-11) while Settings has **First name** and **Last name** (SET-2). Working decision: split the entered name on the first space and store two values. Confirm, since the alternative is one name field everywhere.
- **A36.** No sign-out control is designed anywhere: Settings (17) has no such button and the sidebar profile footer has no menu. The app can be entered but not left, which makes authentication untestable end to end. Working decision: put the control in the sidebar profile footer. This is the one place in the build not backed by a frame.
