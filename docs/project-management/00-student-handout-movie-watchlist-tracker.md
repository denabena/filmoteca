# Movie / Watchlist Tracker: student handout

You have three inputs: the **app brief** (what the app is), the **tech spec** (what to build, screen by screen), and the **Figma design** (what it looks like). You'll turn them into a Jira board: **8 epics** and roughly **30 to 40 tasks**. This handout is the whole method on a few pages, with one finished example to copy.

Companion documents, next to this one: `01-brief-movie-watchlist-tracker` and `02-tech-spec-movie-watchlist-tracker`. Figma: [Movie / Watchlist Tracker](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=1-4), page "Screens".

> **The design grew from 17 frames to 25.** Frames 18 to 25 add sign in and account creation, so there is now an eighth epic and a real backend to build. The numbers above changed with it: the original exercise targeted 7 epics and 20 to 30 tasks.

## The six words you need

| Word | Meaning |
|---|---|
| Epic | A large container ticket that groups related work. This project has exactly 8 |
| Task | One unit of work a pair can finish in 1 to 3 days. Every task lives inside exactly one epic |
| Requirement ID | Codes like LIB-3 in spec section 2. Every task must cite at least one |
| Acceptance criteria | The checks that prove a task is done, written as Given/When/Then |
| Story points | The relative size of a task (1, 2, 3, 5, 8). Points compare tasks to each other, they are not hours |
| Assumption | A numbered working decision (A1 to A36, spec section 6) where the design left a gap. A1, A2 and A30 are retired, the design answered them |

## Step by step

1. **Read the brief.** About 10 minutes. You're done when you can say what the app does in one sentence.
2. **Open the tech spec.** You need section 1 (overview and terms), section 2 (requirements per screen), and section 6 (assumptions). Sections 3 and 4 now matter too, because the app has a backend: they tell you what data exists and which operations each screen needs. Keep Figma open next to the spec, every requirement links to its frame.
3. **Create the eight epics** from the table below. In Jira: Create, issue type "Epic". Copy the names as written.
4. **Write tasks** by walking through spec section 2, subsection by subsection. Group related requirements into one task (for example, ADD-1 to ADD-8 is one task). In Jira: Create, issue type "Task", and set the epic as parent. Use the recipe below for every task.
5. **Track coverage** with the checklist at the end of this handout. Cross off each requirement ID once a task covers it. You're done when all 97 are crossed off. Note that an ID with both a frontend and a backend half will appear on two tasks: the rule is that every ID is covered by at least one task, and the visible acceptance criterion belongs to the frontend one.
6. **Set priority, points, and due dates last**, in one pass over the whole board. It's much easier once every task exists.

## Your eight epics

Deriving epics is normally the product manager's job. For this exercise they're given, so you can spend your energy on writing good tasks.

| Epic name | Spec sections | Figma screens | Component |
|---|---|---|---|
| Authentication and account access | 2.14, 2.15 | 18 to 25 | `auth` |
| Onboarding | 2.1, 2.2, 2.3 | 01, 02, 03 | `onboarding` |
| App shell and navigation | SHL-1 and SHL-2 (in 2.4) | sidebar and header, on every screen | `shell` |
| Dashboard | 2.4 (the rest) | 04, 05 | `dashboard` |
| Library browsing | 2.5, 2.6, 2.7 | 06, 12, 13, 07 | `library` |
| Title management | 2.8 to 2.11 | 08, 09, 10, 11 | `titles` |
| Scene Picker | 2.12 | 14, 15, 16 | `picker` |
| Settings | 2.13 | 17 | `settings` |

Most epics end up with 3 to 6 tasks. If one of yours has 10, your tasks are too small. If it has 1, too big.

## The task recipe

| Field | How to fill it |
|---|---|
| Summary | Verb first, specific, under 10 words. Good: "Implement Add title modal with validation". Bad: "Library stuff" |
| Description | Always the four-part template below |
| Priority | Use the priority table below |
| Story points | Compare to the anchor table below |
| Component | From the epic table above |
| Labels | The technical layer your task belongs to, `frontend` or `backend`. Add `design-review` when your context cites an assumption (A1 to A36), it means a designer still owes an answer |
| Due date | From the sprint calendar your teacher shares. Epics end with their sprint, tasks fit inside theirs. Never invent a date |

### Description template

```
As a user, I want [goal], so that [benefit].

Context: [1-2 sentences from the tech spec, with requirement IDs]
Figma: [link to the exact frame]

Acceptance criteria:
1. Given [starting situation], when [action], then [result you can see]
2. ...
(3 to 5 criteria per task)
```

Given/When/Then is a test in plain words. If you can't see the result on the screen, the criterion isn't testable, so rewrite it.

### Priority

| Priority | Use it when | Example from this app |
|---|---|---|
| Critical | Nothing works without it | The database and the sign in endpoint, then saving a title (ADD-2, ADD-3): dashboard, library, genres, and Picker all feed off titles |
| High | Core flow, but a workaround exists | Search, filter, and sort (LIB-3): the default newest-first list already works |
| Medium | Important, blocks nothing | Genres tab cards (GEN-2, GEN-3) |
| Low | Polish | Genre descriptors and the stubbed "New genre" button (GEN-4, GEN-5) |

Rule of thumb: if you marked everything Critical, you haven't prioritized.

### Story points

Don't guess hours. Ask: "is this bigger or smaller than the anchors?"

| Points | Feels like | Anchor from this app |
|---|---|---|
| 1 | Static screen, no logic | Picker empty state (PIC-2) |
| 2 | One small interaction | Delete confirmation (DEL-1 to DEL-3) |
| 3 | A form with validation | Favorite genres step (GNR-1 to GNR-5) |
| 5 | Screen with data, states, and interactions | Library list with search, filters, and row menu (LIB-1 to LIB-9) |
| 8 | Complex flow across screens | Scene Picker: moods, generate, skeletons, picks (PIC-3 to PIC-9) |

Example out loud: "Bigger than the delete dialog (2), smaller than the library list (5), so it's a 3." Anything that feels bigger than 8 gets split into two tasks.

## One finished example

Your teacher builds this live in class. Keep it open while you work, it's the model for every task you write.

**The epic**

- **Name:** Title management
- **Description:** Everything that lets a user create, correct, quick-update, and remove titles. Covers spec sections 2.8 to 2.11. Success: a user can go from an empty library to a maintained, accurate log without leaving the Library area.
- **Component:** `titles`

**One task under it**

- **Summary:** Add delete title flow with confirmation dialog
- **Description:**

  As a user, I want a warning before a title is removed, so that I don't lose my ratings and notes by accident.

  Context: modal "Delete this title?" quotes the title name and says the rating, note, and watch history "will be permanently removed. This can't be undone." (DEL-1). "Delete title" deletes and refreshes, "Cancel" does nothing (DEL-2). Deletion recomputes dashboard stats, activity, genre counts, and Picker gating (DEL-3). Opens from the row menu and the Edit modal.

  Figma: [11 · Delete confirmation](https://www.figma.com/design/drANL1Q2GjcKiLQ5hDwaRP/Movie-Watchlist-Tracker?node-id=3023-1434)

  Acceptance criteria:
  1. Given the row menu on "Dune: Part Two", when I click "Delete title", then a dialog shows "Delete this title?" and the text quotes "Dune: Part Two"
  2. Given the dialog, when I click "Delete title", then the row disappears from the library list
  3. Given the dialog, when I click "Cancel", then the title remains unchanged
  4. Given the deleted title was the only Sci-Fi one, when deletion completes, then the Sci-Fi card no longer appears on the Genres tab

- **Priority:** Medium (important, doesn't block logging or tracking)
- **Story points:** 2 (one dialog, one operation, matches the 2-point anchor)
- **Component and label:** `titles`, `frontend` (no assumption cited, so no `design-review`)
- **Due date:** from the sprint calendar, inside the sprint that finishes the Title management epic

## Check before you call it done

1. Every task has a verb-first summary, cites at least one requirement ID, and belongs to exactly one epic.
2. Every task has a user story and 3 to 5 Given/When/Then criteria you could check by looking at the screen. Backend tasks are the exception: their criteria describe observable behaviour of the operation, not of a screen.
3. All 97 requirement IDs on the checklist are crossed off.
4. No task is bigger than 8 points, and you used at least three priority levels.
5. Every task that cites an assumption (A1 to A36) carries the `design-review` label.

## Four traps

1. **Inventing features.** No password reset, no video player, no genre editor, no mobile layout: the design has none of these. If it has no screen and no requirement ID, it's not a task. Park it for the designer. The one sanctioned exception is sign-out (A36), which has no frame but has to exist for the app to be usable, and it is labelled as such.
2. **Pasting spec text as the description.** The spec gets cited, not cloned. Write your own story and criteria.
3. **Estimating in hours.** "6 hours" fails the exercise. Compare to the anchors instead.
4. **Skipping designed states.** The designer drew empty and generating states on purpose (screens 05, 13, 15, 16). Each one needs its own criterion or task.

## Appendix: requirement checklist

Print this, cross off each ID when a task covers it. 97 in total.

| Screen | Requirement IDs |
|---|---|
| Sign in (2.14) | SGN-1, SGN-2, SGN-3, SGN-4, SGN-5, SGN-6, SGN-7, SGN-8 |
| Create account (2.15) | REG-1, REG-2, REG-3, REG-4, REG-5, REG-6, REG-7, REG-8, REG-9, REG-10, REG-11 |
| Welcome (2.1) | WEL-1, WEL-2, WEL-3, WEL-4, WEL-5 |
| Setup - Monthly goal (2.2) | GOL-1, GOL-2, GOL-3, GOL-4, GOL-5 |
| Setup - Favorite genres (2.3) | GNR-1, GNR-2, GNR-3, GNR-4, GNR-5 |
| App shell (2.4) | SHL-1, SHL-2 |
| Dashboard (2.4) | DSH-1, DSH-2, DSH-3, DSH-4, DSH-5, DSH-6, DSH-7, DSH-8 |
| Library - List, empty (2.5) | LIB-1, LIB-2, LIB-3, LIB-4, LIB-5, LIB-6, LIB-7, LIB-8, LIB-9 |
| Library - Genres (2.6) | GEN-1, GEN-2, GEN-3, GEN-4, GEN-5 |
| Title detail (2.7) | DET-1, DET-2, DET-3, DET-4, DET-5, DET-6, DET-7 |
| Add title (2.8) | ADD-1, ADD-2, ADD-3, ADD-4, ADD-5, ADD-6, ADD-7, ADD-8 |
| Edit title (2.9) | EDT-1, EDT-2, EDT-3, EDT-4 |
| Row menu (2.10) | MNU-1, MNU-2 |
| Delete confirmation (2.11) | DEL-1, DEL-2, DEL-3 |
| Scene Picker (2.12) | PIC-1, PIC-2, PIC-3, PIC-4, PIC-5, PIC-6, PIC-7, PIC-8, PIC-9 |
| Settings (2.13) | SET-1, SET-2, SET-3, SET-4, SET-5, SET-6 |
