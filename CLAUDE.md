# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository. Everything
below is verified against the code, not aspirational.

`README.md` is the human-facing entry point: setup steps, commands, and troubleshooting.
This file is the reasoning behind them, so the two overlap deliberately but do not
duplicate. When something structural changes, check whether both need updating.

## What this is

**Decode Academy Demo**, a teaching boilerplate for academy final projects, now being built
out into **Scene**, a movie and watchlist tracker (see `docs/project-management/`, Jira
project `FIL`). A Next.js frontend talks to a NestJS backend over HTTP.

One thing works end to end: accounts, through Neon Auth, with the backend verifying the
caller's JWT on `GET /api/me`. Persistence is Neon Postgres via Prisma. The frontend has its
app shell, a fixed sidebar with four placeholder views beside it. `GET /api/hello` still
exists but nothing calls it any more: the page that fetched a greeting was replaced by the
dashboard route. Everything else is scaffolding for you to build on.

Because this is a starting point rather than a finished app, the "Not yet built"
section at the bottom is load-bearing. Read it before assuming a feature exists.

## Repository layout

This is a **multi-app repo, not a workspace-managed monorepo**. There is no npm
workspaces, turbo, or nx setup. The root `package.json` owns only repo-wide dev tooling
(Husky, commitlint, lint-staged, Prettier) and does **not** manage the two apps.

```text
backend/          NestJS 11 API, port 3000, its own package.json + node_modules
  prisma/         schema.prisma and committed migrations
  prisma.config.ts  Prisma 7 CLI config. Excluded from tsconfig.build.json
  src/prisma/     PrismaService, global
  src/auth/       NeonAuthGuard, @CurrentUser, GET /api/me
frontend/         Next.js 16 + React 19, port 4200, its own package.json + node_modules
  src/lib/auth/   Neon Auth server and client instances
  src/app/api/auth/[...path]/  Proxies auth calls to Neon, server-side
.claude/          Skills, agents and permissions for Claude Code (see below)
.github/workflows/ci.yml
.husky/           pre-commit and commit-msg hooks
```

Two consequences that trip people up:

- There are **three** `package.json` files and each is installed separately. Run
  `npm install` inside each app, and run it at the root too. The root install is
  **mandatory, not a convenience**: its `prepare` script is what sets `core.hooksPath` to
  `.husky/_`. Skip it and both hooks are simply absent, so any commit message shape is
  accepted and staged files are never linted. The failure is silent locally and only
  surfaces when the `conventions` job fails on the PR. Verify with
  `git config core.hooksPath`.
- Run app commands from inside that app's directory (`cd backend`, `cd frontend`). This
  matters for ESLint especially, whose config and plugins resolve from the app's own
  `node_modules`.

Node version comes from `.nvmrc` (currently **24**). CI reads that same file, so bump it
there and CI follows. Use `nvm use`, which reads `.nvmrc` and needs no version argument;
avoid `nvm install --lts`, which installs whatever LTS happens to be current. The hard
floor is **v20.9.0**, declared by `next` in its `engines` field, and all three
`package.json` files now carry that same `engines` constraint so npm warns on a mismatch.

## Common commands

Backend, from `backend/`:

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `npm run start:dev`  | Nest in watch mode on :3000                               |
| `npm run build`      | Compile to `dist/`. Doubles as the typecheck gate (`tsc`) |
| `npm run lint`       | ESLint with `--fix`                                       |
| `npm test`           | Jest unit tests (`*.spec.ts` under `src/`)                |
| `npm run test:watch` | Same, in watch mode                                       |
| `npm run test:e2e`   | Supertest e2e (`test/`, uses `test/jest-e2e.json`)        |
| `npm run test:cov`   | Coverage                                                  |

Database, also from `backend/`. All of these go through the Prisma CLI, which reads
`prisma.config.ts` and therefore the **direct** connection string:

| Command                     | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `npm run db:migrate`        | Create and apply a migration in development               |
| `npm run db:migrate:deploy` | Apply existing migrations without creating one (CI, prod) |
| `npm run db:migrate:status` | Which migrations have been applied                        |
| `npm run db:generate`       | Regenerate Prisma Client. Also runs on `npm install`      |
| `npm run db:studio`         | Data browser GUI                                          |

Prisma Client is generated, not committed. A `postinstall` hook regenerates it, so a fresh
clone gets a working client from `npm install` alone.

Frontend, from `frontend/`:

| Command              | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Next dev server on :4200                        |
| `npm run build`      | Production build. Doubles as the typecheck gate |
| `npm start`          | Serve the production build on :4200             |
| `npm run lint`       | ESLint (`eslint-config-next`)                   |
| `npm test`           | Jest + React Testing Library (jsdom)            |
| `npm run test:watch` | Same, in watch mode                             |

Single test in either app: `npm test -- sidebar` filters by path,
`npm test -- -t "keyboard"` filters by test name.

Neither app has a standalone `typecheck` script. `npm run build` is the typecheck.

To run the whole thing locally, start both in separate terminals: backend on 3000,
frontend on 4200. The frontend calls the backend, never the reverse.

## Architecture

**Ports are fixed and asymmetric.** Backend API on **3000**, frontend on **4200**. Both
are wired into code and config, so do not swap them.

**The `/api` prefix lives in one place.** `backend/src/main.ts` sets a global `api`
prefix, so a controller mapped to `hello` is served at `GET /api/hello`. Note the
consequence: `GET http://localhost:3000/` returns 404, which is normal, not a broken
server. The e2e test re-applies the same prefix manually to match production, so if you
change the prefix you must change it in both places.

**Frontend app shell.** Routes that sit beside the sidebar live in the
`frontend/src/app/(shell)/` route group, whose layout renders `Sidebar` and the routed view.
The dashboard is the index route (`/`), then `/library`, `/picker` and `/settings`. The
sidebar is a Client Component because the active item comes from `usePathname()`, but it
stays a leaf: page content arrives through the layout's `children`, so nothing else is
pulled into the client bundle.

**Do not move the sidebar into the root layout.** The parentheses make `(shell)` a route
group, so it adds no URL segment (`(shell)/page.tsx` serves `/`, not `/shell`) but it does
add a layout level. That level exists because the sign in and create account screens are
specified as a centred card on the canvas **outside the app shell** (spec SGN-1, REG-1), so
they must not inherit the sidebar. They belong in a sibling group, `(auth)/`, when FIL-15 and
FIL-17 build them. A root-level layout would wrap them too.

**The signed-in profile is mocked in exactly one place.** `frontend/src/lib/current-user.ts`
holds `getCurrentUser()` and a fixed profile, because the sidebar (Jira `FIL-27`) shipped
before the sign in endpoint (`FIL-12`). The layout reads it on the server and hands it to
`ProfileProvider`, which keeps it in client state so the footer name and avatar initials can
change without a reload. When auth lands, only that one function changes. Do not read the
mock anywhere else.

**Frontend to backend data flow.** There is no live example right now. When you add one,
fetch in an async Server Component with `cache: 'no-store'`, which is what the removed demo
page did: no CORS is involved and there is no client-side loading state. CORS is enabled on
the backend anyway (`main.ts`) for genuinely client-side fetches, allowing origin
`FRONTEND_URL`.

**Configuration goes through ConfigService.** `ConfigModule.forRoot({ isGlobal: true })`
is registered in `backend/src/app.module.ts`, so it reads `backend/.env` at startup and
`ConfigService` is injectable everywhere without re-importing the module. Read values
through `ConfigService`, as `main.ts` does, rather than scattering `process.env` through
the code.

**API response contract is hand-mirrored, and that is a known wart.** `MeResponse` is
declared in `backend/src/auth/auth.controller.ts` (the source of truth) and copied by hand
into `frontend/src/app/me/page.tsx`. Change a response shape and you must edit both. The
intended fix is generating frontend types from an OpenAPI spec, but the backend does not
expose one yet. `HelloResponse` in `backend/src/app.service.ts` no longer has a frontend
mirror, because the page that held one was replaced by the dashboard route.

**Neon gives two connection strings and mixing them up is the classic failure.**
`DATABASE_URL` is pooled (its host carries `-pooler`) and serves request paths;
`DATABASE_URL_UNPOOLED` is direct and is what migrations and bulk import scripts must use.
The pooled endpoint runs PgBouncer in transaction mode, which discards prepared statements
between transactions, so migrating over it fails as apparently random SQL errors rather
than a clear config error. `backend/prisma.config.ts` pins Migrate to the direct URL;
`PrismaService` uses the pooled one.

**Prisma owns `public`; Neon Auth owns `neon_auth`.** `neon_auth` holds `user`, `session`,
`account`, `jwks` and more, managed by Neon itself, and is deliberately absent from
`schema.prisma` so no migration can create or drop it. This is why `Profile.userId` is a
plain string and not a foreign key: the user row lives in a schema Prisma does not manage,
and the verified JWT already carries the caller's identity, so no join is needed to know
who is asking. Note the table is `neon_auth."user"`, **not** `users_sync`; that name
belongs to the older Stack Auth integration and does not exist here.

**Auth lives in the frontend, and the backend only verifies.** Next.js owns the sign-in UI
and the session cookie. Because the API is a separate origin it never receives that cookie,
so the frontend mints a short-lived JWT at `/api/auth/token` and sends it as a bearer
token. `NeonAuthGuard` verifies it against Neon's JWKS and pins `iss` and `aud` to the auth
instance origin, derived from `NEON_AUTH_JWKS_URL` so there is one variable rather than
three that could drift.

**Both halves of auth read their config lazily, and skipping that breaks CI in two
different ways.** `NeonAuthGuard` builds its verifier on first use because Nest constructs
every provider at module init, so an eager read made the app unbootable wherever the
variable was absent. On the frontend, `getAuth()` in `src/lib/auth/server.ts` is a lazy
singleton and the `/api/auth/[...path]` handlers are thin wrappers rather than
`export const { GET, POST } = auth.handler()`, because **`next build` collects page data for
every route** and would otherwise construct the auth instance at build time. Both mistakes
pass locally, since a developer machine has real `.env` files, and fail only in CI. Test the
real condition: move `backend/.env` or `frontend/.env.local` aside and re-run the build.

**Three Prisma 7 details that will confuse you if you know Prisma 6.** Connection URLs are
no longer allowed in `schema.prisma` and live in `prisma.config.ts`, which must import
`dotenv/config` itself because Prisma 7 stopped loading `.env`. The generator is pinned to
`prisma-client-js` rather than the new default `prisma-client`, because the new one emits
ESM relying on `import.meta.url`, which cannot compile to CommonJS and so breaks every Jest
suite. And `prisma.config.ts` is excluded in `tsconfig.build.json`: it sits at the package
root, so including it makes tsc infer that root as the common root and emit
`dist/src/main.js` instead of `dist/main.js`, silently breaking `start:prod`.

**`jose` ships ESM only, and that breaks two different things.** For Jest, both jest configs
carry `transformIgnorePatterns` exempting it plus an inline `module: commonjs` tsconfig. For
production, `NeonAuthGuard` must load it with `await import('jose')` rather than a static
import: this backend compiles to CommonJS, a static import becomes `require()`, and Vercel's
Node loader cannot `require()` an ES module, so every request died with `ERR_REQUIRE_ESM`.
**It works locally only because Node 24 supports `require(esm)` and the deployed loader does
not**, which makes this invisible until deploy. Keep the `jose` import type-only and dynamic;
verify with `grep "import('jose')" backend/dist/auth/neon-auth.guard.js` after building.

The e2e suite also overrides `PrismaService` and `NeonAuthGuard`, which is what lets it run
with no `backend/.env` at all. Verify that by moving `.env` aside and re-running, because
CI has no `.env`.

**A pattern worth internalising from all of this: local success proves very little about
deployment here.** Three separate bugs shipped green locally and failed only in CI or on
Vercel: eager config reads (fine with a real `.env`, fatal without), the missing services
`entrypoint` (fine standalone, fatal in services mode), and this ESM require (fine on Node
24, fatal on the deployed loader). Test the actual failing condition, not the happy one.

**Deployment is one Vercel project, two services, one domain.** `vercel.json` uses
[Vercel Services](https://vercel.com/docs/services). Two decisions in it are non-obvious and
JSON cannot explain itself, so: the **frontend owns every public path** because Next.js
serves `/api/auth/*` and routing into a service is final, so a top-level `/api/*` rewrite to
NestJS would swallow every auth request with no fallback. And the **backend has no public
route**, only a service binding, because every backend call is server-side from a Server
Component. The binding injects `BACKEND_URL`, which is already the variable the frontend
reads, so no code differs between local and deployed. Never set `BACKEND_URL` manually in
Vercel; a hardcoded value breaks preview deployments. Full reasoning in README's Deployment
section.

**Services mode needs an explicit `entrypoint`, even where the framework is zero-config
standalone.** Vercel's NestJS page advertises zero configuration, which holds for a
standalone project but not inside `services`: the build fails with `must specify an
"entrypoint" for runtime "node"`. The backend therefore declares
`"entrypoint": "src/main.ts"`, relative to the service's own `root`, not the repo root.

Two deployment steps have no automation and fail quietly: the deployed domain must be added
to Neon Auth (`neonctl neon-auth domain add`) or sign-in redirects fail, and migrations must
be applied by hand with `npm run db:migrate:deploy`.

**The Scene Picker catalogue comes from TMDB, and the data does not match our types.** Read
the `tmdb-catalogue` skill before writing import or pick-generation code. The four facts
that catch people, in descending order of pain:

1. **TMDB has two different genre vocabularies**, 19 for movies and 16 for TV, and they are
   not subsets of each other. All twelve of our onboarding genres exist for movies (one
   rename: `Science Fiction` to `Sci-Fi`), but TV has **no Thriller, Romance, Horror or
   Fantasy at all** and fuses Sci-Fi with Fantasy. Series therefore cover only eight of
   twelve.
2. **There is no TMDB dataset to download.** It is an API only. The daily ID export carries
   no genre, runtime or date, so it cannot build a catalogue.
3. **`runtime` is not on `/discover`**, only on the detail endpoint, so the import is two
   passes. For series it is `episode_run_time`, which is **per episode**, not a total.
4. **`type` has no TMDB field.** It comes from which endpoint you called. It is also purely
   descriptive: nothing in the design filters, groups or sorts by it.

Related design gap: per A17, `year`, `runtime` and `director` are displayed on the title
detail screen but no form captures them, so **the catalogue is the only source of runtime and
year in the entire app**. That is a larger role than "picker feed".

## Environment variables

Copy the templates, then fill in values. Both real files are gitignored.

| App      | Template                | Real file             | Variables                                                                                                                                                                  |
| -------- | ----------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `backend/.env.example`  | `backend/.env`        | `PORT` (default 3000), `FRONTEND_URL` (CORS origin, default `http://localhost:4200`), `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_JWKS_URL`, `TMDB_API_READ_TOKEN` |
| Frontend | `frontend/.env.example` | `frontend/.env.local` | `BACKEND_URL` (default `http://localhost:3000`), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars)                                                               |

**A missing `.env` used to be harmless and no longer is.** The ports still default, but
there is no default for a Neon connection string or an auth instance, so the database and
sign-in simply do not work without real values. Get them with
`npx neonctl connection-string` and `npx neonctl neon-auth status`, and generate the cookie
secret with `openssl rand -base64 32`.

Note the filename difference: Nest reads `.env`, Next.js reads `.env.local`.

**Never give a server-only secret a `NEXT_PUBLIC_` prefix.** `BACKEND_URL` deliberately
has no prefix because it is read server-side only; a `NEXT_PUBLIC_` variable is inlined
into the browser bundle and is therefore public forever. `NEON_AUTH_COOKIE_SECRET` and
`TMDB_API_READ_TOKEN` are the two where a slip would do real damage: the first signs every
session, the second is a credential tied to a personal TMDB account.

There is **no config validation**: `ConfigModule` is registered without a
`validationSchema`, so a missing variable surfaces at first use rather than at boot.

## What is in `.claude/`

This repo ships Claude Code configuration. Knowing what is there prevents both
reinventing it and being surprised by it.

**Skills.** A skill is invoked by its own name, so the slash command is the full name in
the left column (`/repo-dev-setup`). You do not have to remember them: each skill's
description also matches plain requests, so "set me up locally" reaches `repo-dev-setup`
on its own. The short forms quoted inside the descriptions (`/dev-setup`, `/commit`) are
matching phrases, not registered commands.

| Skill             | What it does                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo-dev-setup`  | First-time local setup, both apps. Start here on a fresh clone                                                                                                     |
| `repo-commit`     | Analyses changes, runs per-app lint/test, writes Conventional Commit messages, guards against committing to `main`                                                 |
| `repo-secrets`    | Manages `.env` files from templates, explains where real secrets live                                                                                              |
| `repo-jira`       | Creates/estimates/transitions Jira issues over MCP. Needs a Jira MCP server; see `.claude/skills/repo-jira/references/jira-access.md` for the two supported setups |
| `repo-review-prs` | Fetches open PRs via `gh` and reviews unreviewed ones                                                                                                              |
| `backend-nestjs`  | Passive reference library, 12 NestJS rules across 7 categories. Consulted when writing backend code                                                                |
| `frontend-nextjs` | Passive reference library, 16 Next.js/React rules. Consulted when writing frontend code                                                                            |
| `tmdb-catalogue`  | Passive reference. Where the TMDB data disagrees with our types, and which catalogue decisions are settled. Read it before touching the Scene Picker catalogue     |

**Agents** (delegated subtasks with their own context): `code-reviewer`, `debugger`,
`test-automator`, `nestjs-specialist` and `nextjs-specialist` (these two fetch and
synthesise the live official docs, which is different from the passive rule libraries
above), and `linus-reviewer` (a deliberately blunt review persona; it has no tools, so
paste the diff into the prompt).

**Permissions.** `.claude/settings.json` is committed and applies to everyone. Notably,
`Edit` and `Write` are **not** pre-approved, so Claude asks before every file change and
you see the diff before it lands. Every decision in that file is explained in
`.claude/SETTINGS.md`, because JSON cannot hold comments. Personal preferences belong in
`.claude/settings.local.json`, which is gitignored.

`.claude/commit-checks.md` is a generated cache read by `repo-commit`. Regenerate it
with `/repo-commit refresh-checks` when it goes stale.

## Git workflow

**HARD RULE: never commit or push directly to `main`.** Branch first. `settings.json`
puts `git push` behind a confirmation prompt to give this rule a real barrier rather
than just an instruction.

Branch format: `{type}/DEMO-{number}-{slug}`, for example
`feat/DEMO-160-user-profile-card`.

**Conventional Commits are enforced** by a `commit-msg` hook running commitlint. The
allowed types are restricted (see `commitlint.config.js`): `build`, `chore`, `ci`,
`docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`. Anything else is
rejected, including a bare description with no type.

**pre-commit** runs `lint-staged` (`.lintstagedrc.js`): per-app `eslint --fix`, then
Prettier. ESLint is invoked from each app's own directory so its config and plugins
resolve correctly, which is why you should not try to lint one app from the other's cwd.

Note the patterns are all prefixed `backend/` or `frontend/`, so **nothing at the repo
root is touched by the hook**: `README.md`, this file, `.lintstagedrc.js` and the docs
under `docs/` are never auto-formatted on commit. Format them yourself if you want to.
`.lintstagedrc.js` quotes every path before interpolating it into a command string,
because a clone directory with a space in it or an App Router route group like
`src/app/(shell)/` would otherwise abort the command with a bash syntax error.

**Backend tests are not run on commit.** The hook prints a reminder only, because they
are slow. CI runs them on every PR, but run them locally before pushing backend changes.

Prettier config is per app and **there is none at the root**: only `.prettierignore` lives
there. `frontend/package.json` carries `printWidth: 100` with `singleQuote`, and the
backend has its own `backend/.prettierrc`. Root-level files are written single-quoted by
hand but nothing enforces it, so running bare `npx prettier --write` on one from the root
applies library defaults and will double-quote it. Pass `--config frontend/package.json`
or leave those files alone.

## CI

`.github/workflows/ci.yml` runs three jobs in parallel on every PR and on pushes to
`main`:

- **backend**: lint, build, unit tests, e2e
- **frontend**: lint, unit tests, build
- **conventions**: commitlint over the PR's commit range

A repo-wide `prettier --check` step exists but is **intentionally commented out**: 55
files predate the Prettier config and the step would fail immediately on a fresh clone.
To enable it, run `npx prettier --write .` once, commit the result, then uncomment.

## Not yet built

Treat these as planned, not available. This section exists so you do not build on
something that is not there.

- **The frontend `/api/chat` route handler.** No route handler exists, and the env
  template deliberately declares no model-provider key. Add whichever variable your
  provider needs when you build the route, server-side only and never behind
  `NEXT_PUBLIC_`. Related: `@google/genai` was once present in `frontend/node_modules`
  while absent from `package.json`, so a clean install removes it. Declare any SDK
  properly rather than relying on a leftover install.
- **Generated API types.** No OpenAPI spec, so `MeResponse` is hand-mirrored between the two
  apps as described under Architecture.
- **Config validation.** No `validationSchema` on `ConfigModule`. This now bites harder
  than it used to: the app boots fine without `NEON_AUTH_JWKS_URL` and only fails on the
  first authenticated request.
- **Route protection.** Auth exists, but nothing stops a signed-out visitor reaching a
  `(shell)` route, and the sidebar profile is still mocked in
  `frontend/src/lib/current-user.ts`. Those are FIL-29 and FIL-83.
- **The rest of the Scene UI.** Only the sidebar is real. The four routed views are
  placeholders, and there is no page header pattern, no shared Button/Input/Tag components
  and no genre palette yet, though the design defines all of them.

`backend/README.md` is the stock NestJS starter README. Ignore it as a source of truth
for this project.
