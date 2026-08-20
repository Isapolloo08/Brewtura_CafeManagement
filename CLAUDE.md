# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Brewtura** — an Electron desktop admin/manager terminal for a coffee shop chain. Three processes cooperate:

- **Vite + React 19 renderer** (`src/`) on port 5173 — the entire UI
- **Express + Socket.IO API** (`server/`) on port 5000 — REST at `/api/v1/*`, WebSocket on the same port
- **Electron shell** (`electron/`) — frameless window; the renderer talks to the API over plain HTTP, *not* IPC

Persistence is PostgreSQL (`pg`, no ORM — raw SQL everywhere).

## Commands

```bash
npm run electron:start   # full dev stack: vite + API server + electron (waits on both health checks)
npm run dev              # renderer only (localhost:5173)
npm run server:dev       # API only, nodemon
npm run server           # API only, no watch
npm run db:init          # create/migrate schema + seed (see below)
npm run lint             # oxlint
npm run electron:build   # vite build → electron-builder --win (NSIS installer into release/)
```

There is no test suite and no test runner configured.

Copy `.env.example` → `.env` before first run. The API reads `PG*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GMAIL_*`; the optional LLM analyzer reads `OLLAMA_URL`, `OLLAMA_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`. Note `.env` is currently tracked in git and not in `.gitignore`.

## Schema and migrations

`server/db/schema.sql` is the single migration file and it is **idempotent by design** — every statement is `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, or a `DO $$ ... EXCEPTION WHEN duplicate_object THEN null $$` guard. `npm run db:init` runs the whole file in one transaction, then seeds a main branch, demo users, default settings, and the customization template library. **Re-running it on an existing database is the intended way to apply a migration.** Add new schema changes as new guarded statements at the bottom of the relevant section rather than editing existing DDL.

Seeded logins (created by `db:init`): `ADM-001`/`admin123` (admin), `MGR-002`/`manager1` (manager), `INV-003`/`staff123` (stock_clerk). All PINs are `1234`.

Two tables live **outside** `schema.sql` and are created at module load by an `ensureTables()` call:

- `po_records` — `server/controllers/purchaseOrderController.js`
- `gmail_accounts`, `supplier_messages` — `server/services/gmailService.js`

`schema.sql` also defines `purchase_orders`/`purchase_order_items`, but the live purchase-order feature uses **`po_records`** (a single row with a JSONB `items` array and a string `status` like `'Pending Approval'`/`'In Transit'`/`'Completed'`). The normalized `purchase_orders` tables are legacy and unused by the API.

### Naming quirks worth knowing

- The "variant" concept was renamed to "customization". `schema.sql` contains conditional `ALTER TABLE ... RENAME` migrations for `product_variants` → `product_customizations`, `variant_templates` → `customization_templates`, etc.
- `customization_templates` is a **single table holding five kinds of option**, discriminated by `customization_type`: `size`, `option`, `temperature`, `milk`, `addon`. The API exposes them as separate resources (`/menu/temperatures`, `/menu/milks`, `/menu/addons`, `/menu/customization-templates`) that all read and write the same table, aliasing `default_price_delta` to `price_delta` or `price` per endpoint. `menuController.js` filters and re-shapes; `App.jsx` splits templates back into `{ sizes, options }` via `splitCustomizationTemplates`.
- `stock_movements` rows target *either* `ingredient_id` *or* `customization_template_id` (both nullable).

## Backend structure

`server/index.js` mounts one router per domain under `/api/v1/`, adds a global error handler (special-cases `entity.too.large` → 413, since `express.json` is capped at 10mb for base64 image uploads), then starts Socket.IO and Gmail auto-polling.

The layering is uniform: `routes/*.js` wires middleware + handlers, `controllers/*.js` holds the SQL, `services/*.js` holds cross-cutting logic. There is no model/repository layer — controllers call `query()` or `getClient()` from `server/db/index.js` directly. Multi-statement writes use `getClient()` + explicit `BEGIN`/`COMMIT`/`ROLLBACK` in `try`/`finally` with `client.release()`.

**Auth**: `middleware/auth.js` exposes `authenticateToken` (JWT bearer; payload is `{ id, branch_id, role, name }`) and `authorizeRoles(...roles)`. Roles use the DB enum values — `admin`, `manager`, `cashier`, `barista`, `stock_clerk`. Routers apply these inconsistently on purpose: `inventoryRoutes`/`shiftRoutes` do a blanket `router.use(authenticateToken)`, `menuRoutes` leaves all GETs public and guards only writes, `orderRoutes` and `gmailRoutes` declare public endpoints (`/token/:token`, `/public`, OAuth `/callback`) *before* the `router.use`. Match the surrounding file's style when adding routes.

**Settings** are a `key → value TEXT` table, and `reportController.js` maintains a `KEY_CANONICAL` camelCase↔snake_case map. `getSettings` returns *both* forms of every key; `updateSettings` resolves back to canonical snake_case in two passes (camelCase wins, since that's what the form edited) and deletes stale alias rows. If you add a setting used by the UI, add it to `KEY_CANONICAL`.

## Stock deduction happens in two places

- **Server, authoritative**: `orderController.createOrder` decrements `ingredients.current_stock` and writes `stock_movements` rows by walking `recipes` (per product, or per `product_customization_id` when a customization is chosen) and `addon_recipes`, inside a transaction.
- **Client, optimistic display only**: `App.jsx`'s `deductRecipeIngredientsForOrder` adjusts local `ingredients` state when an order flips to `Served`. It does not hit the API.

Don't "fix" one to match the other without checking which path the feature actually uses.

## Gmail supplier-reply pipeline

This is the most involved feature. `startAutoPolling()` (fires from `server/index.js`, every 10s) polls Gmail for new inbox messages, extracts a `PO-nnn` code from subject+body (messages without one are dropped), heuristically parses quantity/unit lines into `matched_items`, and inserts into `supplier_messages`.

Each saved message then runs through `analyzeMessage()`, a three-tier classifier producing a verdict of `agreed` / `partial` / `rejected` / `unclear`:

1. `ragAnalyzer.js` — Ollama at `OLLAMA_URL` if reachable (cached probe), else Gemini if `GEMINI_API_KEY` is set. Rate-guarded with a 2s min interval and 60s cooldown on HTTP 429.
2. If the LLM returns `unclear`, `poAnalyzer.analyzeSupplierReply` (keyword/rule-based, with explicit Tagalog/Filipino hint lists) gets a chance to rescue the classification.
3. If no LLM is available or it throws, the rule-based analyzer runs alone.

An `agreed` verdict auto-advances the PO from `Pending Approval` → `In Transit`. The verdict is persisted, then `emitSupplierMessage` broadcasts `supplier-message` over Socket.IO, which `App.jsx` renders as a global `<SupplierScanAlert>` modal — visible even on the login screen. Approving from that modal calls `POST /inventory/stock-in-from-po`, which caps each stock-in at the PO's remaining balance (`orderedQty - receivedQty`), accumulates `receivedQty` back into the JSONB items, and auto-sets status to `Completed` when everything is received.

## Frontend structure

`src/App.jsx` (~1200 lines) is the whole application shell: it owns every domain slice of state, loads all of it in one `Promise.allSettled` burst on login, and dispatches pages through a nested `switch (tab) { switch (sub) }` in `renderPageContent`. There is **no router and no state library** — navigation is `activeTab` + `activeSubTab` strings, and `Sidebar.jsx` maps its human-readable sub-item labels to those ids through a literal `subMap` in `App.jsx`. Adding a page means touching `Sidebar.jsx`'s `navItems`, the `subMap`, and the `switch`. `SystemSettings.jsx` does its own second-level `switch` for the settings sub-pages.

Every API response is **re-mapped from snake_case DB shape to camelCase UI shape at the fetch site** (see the mappers in `App.jsx`'s `loadBackendData`, e.g. `current_stock` → `stock` plus a derived `'In Stock'`/`'Low Stock'`/`'Out of Stock'` status string). Those inline mappers are duplicated across several handlers (`handleStockUp`, `handleReverseStock`, `loadBackendData`) — if you change a mapping, grep for the others.

`src/services/api.js` is a flat object of named methods over one `fetchAPI` helper. It reads the JWT from `localStorage.coffee_token`, and on a 401/403 from any non-login endpoint clears the session and dispatches a `coffee:auth-expired` window event that `App.jsx` listens for to force a logout modal. Add new endpoints as methods here rather than calling `fetch` from components.

`src/utils/permissions.js` is a **client-side-only** role matrix (`can(role, resource, action)`), keyed by display-name roles (`Administrator`, `Manager`, `Inventory Staff`, `Cashier`, `Barista`) with `ROLE_ALIASES` mapping the DB enum values onto them. `App.jsx` passes a bound `can` down as a prop to gate UI affordances. It is *not* the security boundary — `authorizeRoles` on the server is, and the two matrices are maintained independently.

`src/data/mockData.js` is dead code; nothing imports it. All data comes from the API.

## Styling

Tailwind is loaded from the **CDN in `index.html`**, with the `coffee`/`latte` color palettes and the `Outfit`/`Plus Jakarta Sans` font families configured in an inline `tailwind.config` script tag. The `tailwind.config.js`, `postcss`, and `craco.config.js` files in the repo are vestigial and not part of the Vite build. Custom `.glass-card` / `.glass-sidebar` classes and all the `animate-*` keyframes live in `src/index.css`.

Colors are written as literal hex in class names (`text-[#3C2A21]`, `from-[#693F27]`) far more often than as palette names. Follow whichever the file you're editing already uses. Modals render through `ModalPortal.jsx` (`createPortal` to `document.body`); icons come from the local `Icons.jsx` sprite object, not `lucide-react`, despite it being a dependency.

Avatar and logo uploads are processed entirely client-side by `src/utils/imageUtils.js` (center-crop → progressive halving downscale → 512px JPEG data URL) and stored as base64 TEXT in the DB — hence the 10mb JSON body limit.
