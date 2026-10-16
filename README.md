# CoreDesk

A unified workspace for organising work, developing ideas, sharing knowledge and keeping private documents apart — built as an interactive **front-end prototype**.

CoreDesk has exactly four top-level spaces:

| Space | What it is |
| --- | --- |
| **Projects** | Structured work. Each project has five views over the same data: **Sections**, **Files**, **Tasks** (À faire / En cours / Terminé), **Notes** and a spatial **Map**. |
| **Board** | Freeform brainstorming canvas: idea cards, positions, colours and connections. |
| **Work Sharing** | Share projects and boards with collaborators (viewer / editor), plus **Teacher** — courses, lessons, resources, sessions, learners and publication. Limited and Pro plans. |
| **Private Vault** | A discreet document space behind a demo PIN gate. |

> **This is a prototype.** There is no backend, account system, real sharing, payment, or encryption. See [What is simulated](#what-is-simulated).

---

## Quick start

Requirements: **Node.js 18+** (20 recommended) and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck    # TypeScript, no emit
npm run build        # typecheck + production build → dist/
npm run preview      # serve dist/ at http://localhost:4173/coredesk/
```

No API keys or environment variables are needed.

---

## Deploying to GitHub Pages

The app uses **hash routing** (`/coredesk/#/projects/p_atelier/tasks`), so refreshing any nested route works on GitHub Pages with no 404 workaround.

### 1. Set the repository name (base path)

Project sites are served from `https://<user>.github.io/<repo>/`, so the build needs the repo name. Open `vite.config.ts`:

```ts
const REPO_NAME = 'coredesk';   // ← change to your repository name
```

- The included GitHub Actions workflow sets `BASE_PATH` from the repository name automatically, so the constant is only a fallback for local/manual builds.
- For a **user or organisation site** (`<user>.github.io` repository), the base must be `/`: change the workflow's `BASE_PATH` to `/` in `.github/workflows/deploy.yml`.

### 2a. Deploy with GitHub Actions (recommended)

1. Push the project to a GitHub repository, on the `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The site appears at `https://<user>.github.io/<repo>/`.

### 2b. Deploy manually

```bash
npm run build
```

Publish the contents of `dist/` to a `gh-pages` branch (for example with `npx gh-pages -d dist`), then set **Settings → Pages → Source: Deploy from a branch → gh-pages / (root)**. `public/.nojekyll` is included so GitHub serves the files as-is.

---

## What works

- **Shell** — persistent sidebar with the four destinations, recent projects/boards, settings; compact top bar with breadcrumbs and **global search** (`Ctrl/⌘ K`). Responsive: full sidebar → icon rail (≤1100px) → slide-out drawer (≤720px).
- **Projects** — overview with search, status filter, progress and counts; create / edit / delete (with confirmation).
  - **Sections**: blocks with tags, favourites, tag filter, create / edit / delete.
  - **Files**: folder browser with breadcrumbs, new folder / document entry, rename, delete (recursive), search, sort, drag rows onto folders to move, and a **simulated upload** (button or drag-and-drop — only name and size are recorded).
  - **Tasks**: three-column Kanban with native drag-and-drop *and* move buttons/menus, priority, due dates, filters.
  - **Notes**: list + editor that saves as you type, tags, dates.
  - **Map**: canvas of nodes referencing real project items. Drag to move, drag the square handle to connect, click a node to inspect, double-click / "Open" to jump to the item. **Removing a node never deletes the item**; deleting an item removes its node.
- **Board** — multiple boards; cards with colour, inline editing (double-click), duplicate, connected-idea shortcut, links, delete; double-click empty space to add; pan / zoom / fit; keyboard (`Delete`, `Esc`, `+`, `-`, `0`).
- **Work Sharing**
  - **Projects & Boards**: shares reference existing items (never copies); general access (restricted / link), viewer / editor roles, add / remove collaborators with validation, revoke / restore, delete, and a read-only **collaborator preview**.
  - **Teacher** (inside Work Sharing, not a separate app): courses with overview stats, curriculum (modules, lessons, reorder, resources), session planning, learner list with illustrative progress, publication (draft / unlisted / published, enrolment, readiness checklist), and a **learner preview**.
  - **Plans**: subtle plan indicator, comparison dialog, limits enforced in the UI. Limits live in [`src/config/plans.ts`](src/config/plans.ts).
- **Private Vault** — PIN screen (demo PIN shown on screen), simulated unlock, folders, add / rename / move / remove placeholder entries, search and sorting, explicit **Lock**, auto-lock after 5 minutes idle and when you leave the Vault.
- **Feedback & data** — dialogs with validation, confirmation for destructive actions, toasts, empty states, context menus (right-click rows/cards), and localStorage persistence. **Settings → Reset** restores the sample data.

## What is simulated

| Area | Reality in this prototype |
| --- | --- |
| Accounts | None. "Camille Laurent" is a local demo identity. |
| Sharing | No invitations are sent, links don't resolve, access levels are not enforced anywhere but the UI. |
| Teacher | Publication, enrolment and learner progress are sample data; nobody is notified. |
| Plans | Switching Limited ↔ Pro only changes local limits. No payments or subscriptions. |
| File upload | Only file **name and size** are recorded; file contents are never read or stored. |
| **Private Vault** | **Not secure.** The PIN is a hard-coded constant checked in the browser (`src/config/app.ts`). Nothing is encrypted. Entries are placeholder names stored in localStorage. **Do not put real documents or personal data in it.** |

### Toward a production Vault

A real implementation would need server-side authentication (with rate-limited, hashed credentials or passkeys), client-side encryption with user-held keys, encrypted storage, session management and audit logging. The prototype keeps Vault data in a separate store (`src/store/vault.ts`) that is never read by search, sharing or previews — a boundary the production version should keep.

---

## Project structure

```
src/
  App.tsx                 Route table (hash routes) + breadcrumbs
  main.tsx                Entry
  config/                 plans.ts (plan limits), app.ts (storage keys, demo PIN)
  types/                  Data model
  data/                   Mock workspace + vault seed data
  store/                  workspace.ts (external store, cascades), vault.ts (separate, demo-only)
  lib/                    router, storage, formatting, ids, deep-link hook
  styles/                 tokens.css (design tokens), base.css
  shell/                  AppShell, Sidebar, TopBar, CommandSearch, Settings
  components/
    ui/                   Button, Dialog, Menu, Tabs, Form, Toasts/Confirm, …
    canvas/               Shared pan/zoom/drag/connect engine (Map + Board)
    layout/               Shared page/table/panel styles
  features/
    projects/             Overview, workspace, 5 views, dialogs
    board/                Boards and idea canvas
    sharing/              Shares, share dialog, preview, plans
    teacher/              Courses, curriculum, sessions, learners, publish, learner preview
    vault/                PIN gate and vault browser
```

**Stack:** React 18, TypeScript, Vite 5, CSS Modules, lucide-react. No router, state or UI library — the store is a small `useSyncExternalStore` module.

### Data model notes

The workspace is one normalised object (`src/types/index.ts`). Every view reads the same collections: a task created in Tasks is the same record the Map and share previews display; a share stores `itemType` + `itemId`. Deleting a project cascades to its items, map nodes and shares. Data is persisted under `coredesk.workspace.v1`; bump `WORKSPACE_VERSION` in `src/config/app.ts` to force a reseed after changing the model.

## Design language

Dark graphite surfaces, off-white text, a single amber accent for selection and primary actions, monospace micro-labels for metadata, 4px radii, 1px separators and a 13px base size — dense enough for long working sessions, without decorative gradients or glass effects. Tokens are in `src/styles/tokens.css`.
