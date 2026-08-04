# Decode Academy Demo

A starter repo for Decode Academy final projects: a **Next.js** frontend talking to a
**NestJS** backend, with the tooling you are expected to use on a real team already wired
up (git hooks, Conventional Commits, CI, per-app linting and tests).

Take a copy, build your project in it. It is deliberately small: an app shell, accounts, a
database and one example endpoint, and the rest is yours.

## Getting your own copy

**Do not fork and do not clone this repo directly.** Use the template, so you get a
repository that is genuinely yours: your own history, no `forked from` label, and it
stays with you after the academy ends.

```bash
# 1. Create your own repo from this template, and clone it.
#    Replace <your-project-name>. The owner is YOUR personal account, not the org.
gh repo create <your-project-name> \
  --template DECODE-Agentic-Academy/decode-academy-demo \
  --private --clone

# 2. Give your mentor read access, so they can review your work.
gh api -X PUT repos/<your-username>/<your-project-name>/collaborators/mselendic \
  -f permission=pull
```

Prefer the browser? Hit **`Use this template`** at the top of this page, then
`Create a new repository`. In the **Owner** dropdown pick **your own account**, not
`DECODE-Agentic-Academy`. Then add the mentor under `Settings` → `Collaborators`.

Step 2 is not optional. Without it nobody can see your work or help you when you are
stuck.

Your repo starts private. You are free to switch it to public whenever you want it in
your portfolio: `Settings` → `General` → `Danger Zone` → `Change visibility`. Before you
do, check that no real secret ever got committed; `.env` files are gitignored precisely
so this stays safe.

## What works today

**The frontend app shell.** A fixed sidebar with the four views beside it, at `/`
(Dashboard), `/library`, `/picker` and `/settings`. The pages themselves are placeholders;
the sidebar is real, including the active-route highlight and the profile footer. Start at
[`frontend/src/components/sidebar/sidebar.tsx`](frontend/src/components/sidebar/sidebar.tsx)
and [`frontend/src/app/(shell)/layout.tsx`](<frontend/src/app/(shell)/layout.tsx>).

The footer profile is still mocked, in one place only:
[`frontend/src/lib/current-user.ts`](frontend/src/lib/current-user.ts). Accounts now exist
(see below), so wiring it to the real signed-in user is a small change confined to that
file.

**The greeting.** The simplest possible path from browser to API, and the shortest code to
read first if you want to see how a Nest controller and service fit together
([`backend/src/app.controller.ts`](backend/src/app.controller.ts)):

```text
curl http://localhost:3000/api/hello  ->  { "message": "..." }
```

Note that nothing in the frontend calls it any more: the page that did was replaced by the
dashboard route. Wiring the frontend to a real endpoint is your job, and
[`frontend/src/app/(shell)/layout.tsx`](<frontend/src/app/(shell)/layout.tsx>) shows where a
server-side read belongs.

**Accounts, and a database.** Sign-up and sign-in run on Neon Auth, and the API verifies
who you are without ever seeing your session cookie:

```text
browser  ->  Next.js (:4200)  ->  /api/auth/*  ->  Neon Auth
                                                   sets a session cookie
             Next.js server    ->  /api/auth/token
                                                   mints a short-lived JWT
                              ->  NestJS (:3000)   Authorization: Bearer <jwt>
                                  GET /api/me      verifies it against Neon's JWKS
```

Why the extra hop: auth lives in the frontend, but the API is a **separate origin** on
another port, so it never receives the cookie. The frontend exchanges the session for a
JWT and sends that instead. The backend trusts nothing but a signature it can check
against Neon's public keys.

Try it: **<http://localhost:4200/auth/sign-up>**, then **<http://localhost:4200/me>**. That
page shows the user id, email, and a live database ping, all returned by NestJS after it
verified your token. See [`backend/src/auth/neon-auth.guard.ts`](backend/src/auth/neon-auth.guard.ts)
and [`frontend/src/app/me/page.tsx`](frontend/src/app/me/page.tsx).

## Prerequisites

| Tool    | Version                                   | Note                                                        |
| ------- | ----------------------------------------- | ----------------------------------------------------------- |
| Node.js | see [`.nvmrc`](.nvmrc) (currently **24**) | `nvm use` picks it up automatically. CI uses this same file |
| npm     | 10+                                       | Ships with Node 24                                          |
| git     | any recent                                |                                                             |

The hard floor is **v20.9.0**, which is what `next` declares in `engines`. All three
`package.json` files carry that constraint, so npm warns with `EBADENGINE` if you are below
it.

**Check in a terminal you opened yourself**, not through an editor extension or an AI
assistant:

```bash
node --version
npm --version
```

If that says `command not found`, you have no Node and nothing below will work. Note that
Claude Code can be installed without a system Node and carries its own bundled runtime, so
a version check that succeeds _inside_ the assistant can still mean your own terminal has
nothing. The terminal you type in is the one that counts.

### Installing Node on macOS or Linux

Use [nvm](https://github.com/nvm-sh/nvm), which reads `.nvmrc`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# reopen the terminal, then from the repo root:
nvm install    # reads .nvmrc
nvm use        # reads .nvmrc
```

### Installing Node on Windows

`nvm` is macOS/Linux only. Use [fnm](https://github.com/Schniz/fnm), which also reads
`.nvmrc`:

```powershell
winget install Schniz.fnm
# reopen the terminal, then from the repo root:
fnm install
fnm use
```

Add fnm's [shell hook](https://github.com/Schniz/fnm#shell-setup) so the version switches
per directory. Alternatives: [nvm-windows](https://github.com/coreybutler/nvm-windows)
(does not read `.nvmrc`, so pass `24` explicitly), `winget install OpenJS.NodeJS.LTS` for a
plain install with no switching, or WSL2 plus the macOS/Linux steps inside it.

## Quick start

This is a **multi-app repo**, not an npm-workspaces monorepo. There are three
`package.json` files and each one is installed separately.

```bash
# 1. Repo tooling. Do not skip this: it activates the git hooks.
npm install

# 2. Backend
cd backend && npm install && cp .env.example .env && cd ..

# 3. Frontend
cd frontend && npm install && cp .env.example .env.local && cd ..
```

> **Why step 1 matters.** The root `package.json` holds only Husky, commitlint,
> lint-staged and Prettier, and its `prepare` script is what installs the hooks. Skip it
> and your commits silently bypass every check the project relies on.

> **The `.env` files are no longer optional.** They used to be, back when the only
> variables were ports. The backend now needs real Neon connection strings and the
> frontend needs the Neon Auth base URL, so **go and fill them in now**: see
> [Database and auth](#database-and-auth) below. Without them the backend fails on its
> first database call and sign-in does not work at all.

Now run both apps, each in its **own terminal**:

```bash
# Terminal 1
cd backend && npm run start:dev     # http://localhost:3000
```

```bash
# Terminal 2
cd frontend && npm run dev          # http://localhost:4200
```

Open <http://localhost:4200>. You should see the Scene sidebar on the left with
"Dashboard" highlighted, and a placeholder dashboard beside it. Clicking through Library,
Picker and Settings moves the highlight.

### Verify the backend directly

```bash
curl http://localhost:3000/api/hello
# {"message":"Welcome friend, hello from the NestJS API 👋"}
```

Note the `/api` part. `http://localhost:3000/` on its own returns **404**, and that is
correct, not a broken server. See "Gotchas" below.

## Database and auth

The database is **Neon** (serverless Postgres), the ORM is **Prisma**, and authentication
is **Neon Auth**, which is Neon's managed [Better Auth](https://www.better-auth.com/). All
three live in one Neon project, so setting up the database sets up auth too.

### Getting the credentials

Everything below is read-only against Neon and safe to re-run.

```bash
# Log in (opens a browser).
npx neonctl auth

# Find the project id.
npx neonctl projects list

# The two connection strings. NEVER paste these into a tracked file.
npx neonctl connection-string --project-id <project-id> --pooled   # -> DATABASE_URL
npx neonctl connection-string --project-id <project-id>            # -> DATABASE_URL_UNPOOLED

# The auth endpoints.
npx neonctl neon-auth status --project-id <project-id>
```

That last command prints a **JWKS URL**. Put it in `backend/.env` as
`NEON_AUTH_JWKS_URL`, and the **Base URL** in `frontend/.env.local` as
`NEON_AUTH_BASE_URL`. Then generate a cookie secret, which must be at least 32
characters:

```bash
openssl rand -base64 32     # -> NEON_AUTH_COOKIE_SECRET in frontend/.env.local
```

### Two connection strings, and why you cannot mix them up

This is the single most common way to break a Neon setup.

| Variable                | Endpoint                   | Used by                         |
| ----------------------- | -------------------------- | ------------------------------- |
| `DATABASE_URL`          | pooled, host has `-pooler` | the running application         |
| `DATABASE_URL_UNPOOLED` | direct, host has no suffix | migrations, bulk import scripts |

The pooled endpoint goes through PgBouncer in transaction mode, which **discards prepared
statements between transactions**. Migration tooling depends on them, so migrating over the
pooled URL fails in ways that look like random SQL errors rather than a config mistake.
[`backend/prisma.config.ts`](backend/prisma.config.ts) points Prisma Migrate at the direct
URL for exactly this reason.

### Applying migrations

From `backend/`:

```bash
npm run db:migrate                 # create + apply a migration in development
npm run db:migrate -- --name add_titles   # name it
npm run db:migrate:status          # what has been applied
npm run db:migrate:deploy          # apply existing migrations without creating one (CI, prod)
npm run db:studio                  # browse the data in a GUI
```

`npm install` runs `prisma generate` automatically via `postinstall`, so the Prisma Client
is always present after an install. You never commit generated client code.

### What Prisma does and does not own

Prisma manages the **`public`** schema only. Neon Auth owns the **`neon_auth`** schema
(`user`, `session`, `account`, `jwks`, and more) and manages it itself, so it is
deliberately absent from
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). A migration must never try
to create or drop those tables.

That is why `Profile.userId` is a plain string rather than a foreign key: the user lives in
another schema Prisma does not manage, and the verified JWT already tells us who is asking,
so no join is needed to know the caller's identity.

## Project structure

```text
backend/                  NestJS 11 API on :3000
  prisma/
    schema.prisma         Models. Prisma owns `public`, never `neon_auth`
    migrations/           Generated SQL, committed, applied in order
  prisma.config.ts        Prisma 7 CLI config: points Migrate at the DIRECT URL
  src/
    main.ts               Bootstrap: global 'api' prefix, CORS, port
    app.module.ts         Root module: ConfigModule, PrismaModule, AuthModule
    app.controller.ts     GET /api/hello, GET /api/health/db
    app.service.ts        Business logic + the HelloResponse contract
    app.controller.spec.ts
    prisma/               PrismaService (global): the client, plus ping()
    auth/                 NeonAuthGuard (JWT via JWKS), @CurrentUser, GET /api/me
  test/                   Supertest e2e specs
  .env.example

frontend/                 Next.js 16 (App Router) + React 19 on :4200
  src/
    lib/
      auth/
        server.ts         Server-side Neon Auth. Holds the cookie secret
        client.ts         Browser auth client
      current-user.ts     The mocked signed-in profile, isolated here
    components/
      profile-provider.tsx  Client-side profile state
      sidebar/            Sidebar, icons, React Testing Library example
    app/
      layout.tsx          Root layout: fonts, Providers, html/body
      providers.tsx       Client boundary for NeonAuthUIProvider
      globals.css         Tailwind v4 entry + Scene design tokens
      (shell)/            Route group sharing the sidebar shell
        layout.tsx        Sidebar + routed view
        page.tsx          Dashboard (/)
        library/, picker/, settings/
      api/auth/[...path]/  Proxies every auth call to Neon, server-side
      auth/[path]/        Sign-in, sign-up and the rest, one dynamic route
      me/                 Proves the whole auth chain end to end
  .env.example

.claude/                  Claude Code skills, agents and permissions
.github/workflows/ci.yml  Backend, frontend and commit-convention jobs
.husky/                   pre-commit and commit-msg hooks
CLAUDE.md                 Deeper architecture notes (also read by Claude Code)
```

New backend features go in their own module folder under `backend/src/`. New frontend
routes that belong inside the sidebar shell are folders under `frontend/src/app/(shell)/`
containing a `page.tsx`. Shared components go in `frontend/src/components/`.

## Commands

Run these from inside the app directory, never from the repo root.

|                     | Backend (`cd backend`) | Frontend (`cd frontend`) |
| ------------------- | ---------------------- | ------------------------ |
| Dev server          | `npm run start:dev`    | `npm run dev`            |
| Production build    | `npm run build`        | `npm run build`          |
| Lint                | `npm run lint`         | `npm run lint`           |
| Unit tests          | `npm test`             | `npm test`               |
| Tests in watch mode | `npm run test:watch`   | `npm run test:watch`     |
| E2E tests           | `npm run test:e2e`     | not set up               |
| Coverage            | `npm run test:cov`     | not set up               |

Database commands, backend only:

| Command                     | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `npm run db:migrate`        | Create and apply a migration in development               |
| `npm run db:migrate:deploy` | Apply existing migrations without creating one (CI, prod) |
| `npm run db:migrate:status` | Show which migrations have been applied                   |
| `npm run db:generate`       | Regenerate Prisma Client (also runs on `npm install`)     |
| `npm run db:studio`         | Browse and edit data in a GUI                             |

Both apps use Jest, so `npm test` runs once and exits. To filter:
`npm test -- sidebar` by path, `npm test -- -t "keyboard"` by test name.

Neither app has a `typecheck` script. `npm run build` is the typecheck, because it runs
`tsc` (backend) or `next build` (frontend). Run it before you push.

## Environment variables

Nest reads `backend/.env`, Next.js reads `frontend/.env.local`. Both are gitignored and
must never be committed. Only the `.env.example` templates are.

**Backend** (`backend/.env`, from `backend/.env.example`):

| Variable                | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `PORT`                  | API port, default 3000                                       |
| `FRONTEND_URL`          | CORS origin, default `http://localhost:4200`                 |
| `DATABASE_URL`          | Neon **pooled** connection string. The application uses this |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string. Migrations use this       |
| `NEON_AUTH_JWKS_URL`    | Public keys the API verifies bearer tokens against           |
| `TMDB_API_READ_TOKEN`   | TMDB v4 read token, for the Scene Picker catalogue import    |

**Frontend** (`frontend/.env.local`, from `frontend/.env.example`):

| Variable                  | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `BACKEND_URL`             | Where to reach the API, default `http://localhost:3000` |
| `NEON_AUTH_BASE_URL`      | Your Neon Auth instance                                 |
| `NEON_AUTH_COOKIE_SECRET` | Signs session cookies. **32+ characters**               |

**One rule worth memorising:** in Next.js, a variable prefixed `NEXT_PUBLIC_` is inlined
into the JavaScript sent to the browser, so it is public forever. Nothing in either table
above carries that prefix, and `NEON_AUTH_COOKIE_SECRET` and `TMDB_API_READ_TOKEN` are the
two where a slip would matter most. Never put a secret behind `NEXT_PUBLIC_`.

There is no config validation yet, so a missing variable fails when it is first used
rather than at startup. `NEON_AUTH_JWKS_URL` is the clearest example: the API boots fine
without it and only fails on the first authenticated request.

## Git workflow

**Never commit or push directly to `main`.** Branch first:

```bash
git switch -c feat/DEMO-123-short-description
```

Branch format is `{type}/DEMO-{number}-{slug}`.

**Commit messages must follow Conventional Commits**, enforced by a `commit-msg` hook. If
the message does not match, the commit is rejected.

```text
feat(backend): add orders module
fix(frontend): handle empty product list
docs: explain the env setup
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
`revert`, `style`, `test`. Scope is usually `backend` or `frontend`, and can be omitted
for repo-level changes.

Two hooks run automatically:

- **pre-commit** runs `lint-staged`: ESLint `--fix` then Prettier, on staged files only,
  invoked from each app's own directory so the right config loads.
- **commit-msg** runs commitlint on your message.

**Backend tests are not run on commit** because they are slow; the hook only prints a
reminder. CI runs them on every PR, so run them locally before pushing backend changes.

## GitHub CLI (`gh`)

`gh` is GitHub's official command-line tool. It is **optional** for building the project
and **required** for anything involving pull requests from the terminal, including the
`repo-review-prs` Claude Code skill.

Why bother instead of using the website: opening a PR becomes one command, and you never
paste a personal access token anywhere, because `gh` stores an OAuth token in your OS
keychain and can act as git's credential helper.

### 1. Install

```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux (Debian/Ubuntu)
sudo apt install gh
```

Other distributions and installers: <https://github.com/cli/cli#installation>

Check it landed:

```bash
gh --version
```

### 2. Log in

```bash
gh auth login
```

It asks a short series of questions. The answers you want, matched on meaning rather than
position, since the wording and order shift between `gh` versions:

| Prompt                                         | Answer                       |
| ---------------------------------------------- | ---------------------------- |
| Which account or host                          | **GitHub.com**               |
| Preferred protocol for Git operations          | **HTTPS**                    |
| Authenticate Git with your GitHub credentials? | **Yes**                      |
| How would you like to authenticate?            | **Login with a web browser** |

It then shows a one-time code, opens your browser, and you paste the code there.

**HTTPS** plus **Yes** to the credential question is the combination that matters: it
makes `gh` act as git's credential helper, which is why git stops asking for a password
on every push. SSH works too, but then you manage keys yourself.

### 3. Verify

```bash
gh auth status
```

You want a green check, your username, and a scopes line. The default scopes
(`repo`, `read:org`, `gist`) are enough for everything in this repo: `repo` covers
reading and writing pull requests and review comments, `read:org` matters only if the
repository lives in an organisation rather than your personal account.

If you ever need to add a scope later, you do not start over:

```bash
gh auth refresh -s read:project
```

### 4. Commands you will actually use

```bash
gh pr create --fill                # open a PR from the current branch
gh pr list                         # open PRs in this repo
gh pr view 12                      # read PR #12
gh pr diff 12                      # its diff
gh pr checks                       # CI status for the current branch
gh repo view --web                 # open the repo in a browser
```

`gh pr create` reads the branch you are on, so commit and push first. Since this repo
forbids committing to `main`, the normal flow is: branch, commit, push, `gh pr create`.

### Troubleshooting

| Symptom                               | Fix                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `gh: command not found`               | Install step above. On macOS restart the terminal after `brew install`                     |
| `gh auth status` says not logged in   | Run `gh auth login`. In a container or over SSH, add `--web` or use a token via `GH_TOKEN` |
| `HTTP 403` when posting a review      | Your token lacks `repo`, or you lack write access to that repository                       |
| git still asks for a password on push | You answered "No" to the credential-helper prompt. Re-run `gh auth login` and answer Yes   |
| Two accounts, wrong one is used       | `gh auth switch`                                                                           |

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three jobs in parallel on
every pull request and on pushes to `main`:

| Job           | Steps                                  |
| ------------- | -------------------------------------- |
| `backend`     | lint, build, unit tests, e2e           |
| `frontend`    | lint, unit tests, build                |
| `conventions` | commitlint over every commit in the PR |

The Node version comes from `.nvmrc`, so bump it there and CI follows.

A repo-wide `prettier --check` step exists but is commented out: 55 files predate the
Prettier config and it would fail on a fresh clone. To turn it on, run
`npx prettier --write .` once, commit that, then uncomment the step.

## Deployment

Both apps deploy to **one Vercel project** on **one domain** using
[Vercel Services](https://vercel.com/docs/services), configured in
[`vercel.json`](vercel.json). JSON cannot hold comments, so the reasoning lives here, the
same arrangement as `.claude/settings.json` and `.claude/SETTINGS.md`.

> **Services is a gated feature.** Vercel's own docs mark it "Permissions Required:
> Services". If your account cannot use it, the fallback is two separate Vercel projects
> with Root Directory set to `frontend` and `backend`, and `BACKEND_URL` pointed at the
> backend project's URL by hand.

### What the config does

```text
public internet
      |
      v
  /(.*)  ->  frontend service (Next.js)
                   |
                   | service binding, private, never leaves Vercel
                   v
             backend service (NestJS)
```

**The frontend owns every public path.** That is deliberate rather than lazy. The Next.js
app already serves `/api/auth/*` for Neon Auth, and **routing into a service is final**: if
a top-level rewrite sent `/api/*` to NestJS, every auth request would hit the backend and
404 with no fallback. One catch-all to the frontend avoids the whole class of problem.

**The backend has no public route at all.** It does not need one. Every backend call in this
app is made server-side from a Server Component, never from the browser, so a binding is
enough:

```json
"bindings": [
  { "type": "service", "service": "backend", "format": "url", "env": "BACKEND_URL" }
]
```

Vercel injects the backend's URL as `BACKEND_URL`, which is **the exact variable the
frontend already reads**, so no application code changes between local and deployed. The
value is deployment-aware, so a preview deployment's frontend talks to that same preview's
backend. Internal calls also skip CORS entirely, since they never touch the public edge.

**NestJS must declare its entrypoint, despite the zero-config docs.** Vercel's
[NestJS page](https://vercel.com/docs/frameworks/backend/nestjs) says deployment is zero
configuration, and that is true for a **standalone** project. In **services** mode it is
not: the build fails with

```text
Error: Service "backend" detected framework "nestjs" in "backend" and must
specify an "entrypoint" for runtime "node".
```

Hence `"entrypoint": "src/main.ts"`. The schema defines it as "relative to the workspace
directory", meaning relative to the service's own `root`, so it is `src/main.ts` and not
`backend/src/main.ts`. `framework` is pinned to `"nestjs"` too, because Vercel otherwise
re-detects it on every build.

No application code changed. Our `main.ts` already has the conventional `bootstrap()`
calling `app.listen()`, which is what Vercel turns into a single Function.

### Environment variables in Vercel

Set these in the Vercel project's settings, not in the repo:

| Variable                  | Service  | Note                                          |
| ------------------------- | -------- | --------------------------------------------- |
| `DATABASE_URL`            | backend  | Neon **pooled**                               |
| `DATABASE_URL_UNPOOLED`   | backend  | Neon **direct**, for migrations               |
| `NEON_AUTH_JWKS_URL`      | backend  | Token verification                            |
| `TMDB_API_READ_TOKEN`     | backend  | Catalogue import                              |
| `FRONTEND_URL`            | backend  | CORS origin. Set to the deployed domain       |
| `NEON_AUTH_BASE_URL`      | frontend | Your Neon Auth instance                       |
| `NEON_AUTH_COOKIE_SECRET` | frontend | 32+ chars. Use a **different** one from local |

**Do not set `BACKEND_URL`.** The binding generates and injects it. Setting it by hand is
the one mistake that will quietly break preview deployments, because a hardcoded value
cannot point at the right preview.

### Two steps that are easy to forget

**1. Add the deployed domain to Neon Auth.** Sign-in redirects fail until you do, and the
error does not obviously point at this:

```bash
npx neonctl neon-auth domain add <your-app>.vercel.app --project-id <project-id>
npx neonctl neon-auth domain list --project-id <project-id>
```

**2. Run migrations against production yourself.** Nothing on Vercel applies them. From
`backend/`, with `DATABASE_URL_UNPOOLED` pointing at production:

```bash
npm run db:migrate:deploy
```

Use `db:migrate:deploy`, never `db:migrate`, which is for development and can prompt or
reset.

### Local parity

`vercel dev` runs both services together with bindings injected, which is the only way to
exercise the binding locally. The two-terminal setup in [Quick start](#quick-start) is still
the normal loop; `vercel dev` is for checking the deployment shape.

### If you want the backend publicly reachable

You would add a top-level rewrite for a distinct prefix such as `/api/backend/(.*)`, but be
aware of the trap: **a service receives the original path.** A request to
`/api/backend/hello` arrives at NestJS as `/api/backend/hello`, which matches nothing,
because the global prefix means the route is `/api/hello`. The destination's `path` field
does not help, as it selects which route runs without changing the path your code sees.
Fixing it needs a `request.path` transform in the service's own `routes`, or a configurable
Nest prefix. Not done here because nothing needs it.

## Working with Claude Code

This repo ships [Claude Code](https://claude.com/claude-code) configuration in
`.claude/`. It is optional, but if you use Claude Code these are already set up for you:

| Skill                                | What it does                                                             |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `repo-dev-setup`                     | Walks the setup above and tells you what is missing                      |
| `repo-commit`                        | Runs the right lint and tests, then writes a Conventional Commit message |
| `repo-secrets`                       | Manages `.env` files from the templates                                  |
| `repo-jira`                          | Creates, estimates and transitions Jira issues over MCP                  |
| `repo-review-prs`                    | Reviews open pull requests                                               |
| `backend-nestjs` / `frontend-nextjs` | Rule libraries consulted automatically while writing code                |

Invoke a skill by its full name (`/repo-dev-setup`), or just describe what you want:
descriptions are matched automatically.

Two things to know about the setup:

- **Claude asks before editing files.** `Edit` and `Write` are deliberately not
  pre-approved, so you see every diff before it lands. Reading diffs is a large part of
  what you are here to learn. Turn it off with Shift+Tab once it slows you down, not
  before.
- **`.claude/settings.json` is committed and shared**, so personal preferences go in
  `.claude/settings.local.json`, which is gitignored. Every choice in the shared file is
  explained in [`.claude/SETTINGS.md`](.claude/SETTINGS.md).

Using Jira needs an MCP server; see
[`.claude/skills/repo-jira/references/jira-access.md`](.claude/skills/repo-jira/references/jira-access.md)
for the two supported setups and their trade-offs.

## Gotchas

| Symptom                                                         | Cause                                                                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http://localhost:3000/` returns 404                            | Correct. A global `api` prefix means the route is `/api/hello`. The prefix is set once in `backend/src/main.ts`                                                 |
| A fetch from the frontend fails                                 | The backend is not running, or not on 3000                                                                                                                      |
| `node: command not found`, but it worked via the AI agent       | Claude Code can ship its own bundled Node, which your terminal does not see. Install Node yourself, see [Prerequisites](#prerequisites)                         |
| Servers die as soon as the AI assistant finishes                | Expected. Processes an assistant starts belong to its session. Start `npm run start:dev` and `npm run dev` in your own terminals and leave them open            |
| Commits go through with no lint or message check                | You skipped the root `npm install`, so the hooks were never installed. Check with `git config core.hooksPath`, which should print `.husky/_`                    |
| ESLint cannot find its config                                   | You ran it from the repo root. Each app's ESLint runs from that app's directory                                                                                 |
| Ports look backwards                                            | They are asymmetric on purpose: backend **3000**, frontend **4200**. Both are wired into code and config, so do not swap them                                   |
| Port already in use                                             | A dev server from an earlier session. `lsof -nP -iTCP:3000 -sTCP:LISTEN` on macOS/Linux, `netstat -ano \| findstr :3000` on Windows                             |
| Migrations fail with odd SQL or prepared-statement errors       | You are migrating over the **pooled** URL. Migrations need `DATABASE_URL_UNPOOLED`. See [Database and auth](#database-and-auth)                                 |
| First database query takes over a second                        | Neon scales to zero, so an idle branch cold-starts. Normal. Never write a test that assumes a fast first connection                                             |
| `Cannot find module '@prisma/client'` or missing types          | The client is generated, not committed. Run `npm run db:generate` in `backend/`                                                                                 |
| 401 from `/api/me` with a token that looks fine                 | Either the token expired (they last ~15 minutes) or `NEON_AUTH_JWKS_URL` is wrong. The guard logs the real reason; the response deliberately does not           |
| Sign-in does nothing, no error                                  | `NEON_AUTH_COOKIE_SECRET` is missing or under 32 characters                                                                                                     |
| Vercel build: `must specify an "entrypoint" for runtime "node"` | Services mode needs an explicit entrypoint even for frameworks that deploy with zero config standalone. Set it relative to the service `root`, so `src/main.ts` |
| Sign-in works locally but redirects fail on the deployed URL    | The deployed domain is not a Neon Auth trusted domain yet. `npx neonctl neon-auth domain add <domain> --project-id <id>`                                        |

## Where to go from here

Things this boilerplate deliberately does not decide for you:

- **A database.** Nothing is wired up. Pick your own (Prisma or TypeORM with Postgres is
  a reasonable default) and add a `docker-compose.yml` if you want it containerised.
- **Auth.** Not present. NestJS guards are the place for it; see the `backend-nestjs`
  rules.
- **Shared types between the apps.** `HelloResponse` is declared in
  `backend/src/app.service.ts` and nothing on the frontend mirrors it yet. The moment you
  wire a real endpoint up you will be tempted to hand-copy the type; generating types from
  an OpenAPI spec is the better answer.
- **A chat feature.** There is no `/api/chat` route yet, and the env template ships no
  model-provider key. Add the variable your provider needs when you build the route,
  server-side only.

[`CLAUDE.md`](CLAUDE.md) has the deeper architectural notes: why the ports are what they
are, how the request flows through the Server Component, and what else is not built yet.
Read it when you want the reasoning rather than the steps.
