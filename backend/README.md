# Spazio backend

Backend for Spazio, the **web app** product platform (ADR-024 — the "one-week iOS
pilot" framing is historical). Stack (ADR-001):
**Node.js 22 + TypeScript, Fastify, Prisma over Postgres**, with a queue abstraction
for async render jobs and local object storage.

> **Built and verified on a local stack — nothing is deployed or released** (no
> `vX.Y.Z` tag). The render-to-purchase loop is implemented and exercised end-to-end
> against a local Postgres: device-scoped photo byte upload, catalog browse, renders
> (real via mflux when `RENDER_ENGINE=mflux`, else the default `fake` placeholder),
> cart, mock checkout, per-supplier purchase orders, and the operator console for
> catalog curation and order forwarding. What is **not** real: the render engine
> defaults to `fake` (real renders need mflux on an Apple-Silicon host — ADR-026);
> checkout uses a **mock/fake payment gateway** (ADR-003 vendor unchosen); and
> Local-supplier catalog images are still placeholder SVGs (generic renders).
> Deferred features (stock holds, split settlement, warranty display, render
> metering, sponsored placement, manual add-to-cart) remain absent — see the
> comments in `prisma/schema.prisma` and the route files.

## Scope (pilot boundaries)

Built strictly to the pilot scope: single market (Bogota / COP), no end-user
accounts (device token), operator-curated catalog, renders published immediately
on generation success (ADR-025 — no operator render QA),
single COP capture with manual payout, purchase orders created at checkout and
forwarded manually. Deferred features (stock holds, split settlement, warranty
display, keep-or-replace, render metering, sponsored placement, manual add-to-cart)
are intentionally absent — see the comments in `prisma/schema.prisma` and the route
files.

> **Note (ADR-025, 2026-07-14):** the operator render-review flow this scaffold
> originally shipped (mandatory render QA, the `render_reviewer` role, `GET /operator/renders`,
> `POST /operator/renders/:id/approve|reject`, the `pending_review` state) has been
> removed from the code — implemented by **FEAT-016 (#38)**: renders are published
> immediately on generation success, with no operator action between render
> generation and cart. The decision record lives in
> `../docs_en/decisions/ADR-025_autonomous-render-publication.md`.

## Prerequisites

- Node.js 22+
- Docker (for local Postgres)

## Run it

```bash
# 1. install dependencies
npm install

# 2. start local Postgres (nothing is deployed; this is a local container)
docker compose up db          # add -d to run detached

# 3. copy env and generate the Prisma client
cp .env.example .env          # set PORT=3001 when running the web app alongside
npm run db:generate

# 4. apply the schema to the local database
npm run db:migrate

# 5. seed the dual-track catalog: Local suppliers (source=supplier, seeded Bogota
#    SKUs) + Brand suppliers (source=public, Amazon Berkeley Objects, CC BY 4.0 —
#    display-only, ADR-027), plus styles
npm run db:seed

# 6. create an operator console account (password prompted, hidden input)
npm run operator:create -- --email you@example.com --name "You"   # omit --role for all-purpose

# 7. run the dev server (loads ./.env natively)
npm run dev
```

Health check: `curl http://localhost:3000/health` → `{"status":"ok","service":"spazio-backend"}`
(use the port from `.env`; set `PORT=3001` when running the web app on `:3000` alongside).

**Render engine (ADR-026):** `RENDER_ENGINE` defaults to `fake` (a placeholder/cached
visual — no GPU, keeps CI hermetic). Set `RENDER_ENGINE=mflux` for the real
self-hosted FLUX.2 Klein 4B engine, which invokes the **mflux** CLI as a child
process and therefore requires mflux installed on an **Apple-Silicon** host. Inputs
are downscaled to `MFLUX_MAX_IMAGE_EDGE` (default 1280 px) with EXIF orientation
baked in so large phone photos don't OOM the GPU (BUG-001). Local-supplier renders
are generic because those SKUs carry placeholder SVG images.

## Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the server with reload (`tsx watch`)    |
| `npm run build`     | Type-check + compile to `dist/`               |
| `npm start`         | Run the compiled server (`dist/server.js`)    |
| `npm test`          | Run the vitest suite                          |
| `npm run lint`      | ESLint over `src/` and `test/`                |
| `npm run db:generate` | Generate the Prisma client                  |
| `npm run db:migrate`  | Create/apply a dev migration                 |
| `npm run db:seed`     | Seed the pilot catalog (idempotent)          |
| `npm run operator:create` | Create/update an operator console account |

## Operator console (plan §1.7)

The operator console shell lives in `../operator/public` and is served by this
backend at **`/operator/console`** (no second backend). Operators sign in with
email + password against the `Operator` table (scrypt-hashed credentials); the
session is an HMAC-signed, httpOnly cookie signed with `OPERATOR_SESSION_SECRET`.
Create the first account (the password is prompted with hidden input, so it never
lands in shell history; for non-interactive use, export `OPERATOR_PASSWORD` from a
hidden read — see `scripts/create-operator.ts`):

```bash
npm run operator:create -- --email ana@spazio.example --name "Ana" --role catalog_curator
```

Roles are enforced per action (#34): `catalog_curator` gates catalog create/edit/
approve/reject and `order_handler` gates forwarding (the `render_reviewer` role
was retired with the render-review gate — ADR-025 / FEAT-016); an operator
created **without** a role is all-purpose. Client
endpoints are scoped by the anonymous `x-device-token` header (NFR-007) — one
device cannot read another device's renders, cart, or orders.

## API surface

Versioned prefix `/api/v1`. Client endpoints are public in the pilot (no accounts,
ADR-022). Operator endpoints live under `/api/v1/operator` behind the session
guard (`src/auth/operator.ts`); `POST/GET/DELETE /operator/session` (login /
whoami / logout) are the unauthenticated exceptions.

- Public (not device-scoped): `GET /styles`; `GET /catalog` (browse the approved,
  renderable catalog by `source` + `styleId`, optional budget filter — FEAT-018/
  ADR-028) and `GET /catalog/products/:id/image` (stream a product's stored image).
- Client (device-scoped, `x-device-token` — NFR-007): `POST /projects`,
  `POST /projects/:id/photos` (raw image bytes), `PATCH /projects/:id`,
  `GET /localization/resolve`, `POST /renders` (accepts an optional `productIds`
  list, **≤3**; when present the worker composites exactly those, else it
  auto-matches — ADR-028), `GET /renders/:id`, `GET /renders/:id/items`,
  `GET /renders/:id/image` (streams the stored render), `GET /cart`,
  `PUT /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/confirm`,
  `GET /cart/estimates`, `POST /checkout`, `GET /orders/:id`.
- Operator: `POST/GET/DELETE /operator/session`,
  `GET/POST/PATCH /operator/catalog/products`,
  `POST /operator/catalog/products/:id/approve|reject`,
  `GET /operator/orders`, `POST /operator/orders/:id/forward`.
  *(The render approve/reject/queue endpoints were removed — ADR-025 / FEAT-016.)*
- Console shell (static, unversioned): `GET /operator/console` (+ `app.js`, `styles.css`).

`POST /cart/items` (manual add-to-cart, FR-030) is intentionally **not** registered.

## Tests

Tests run without a live database: the Fastify app factory accepts an injected
Prisma client, so the suite passes a typed mock. `npm test` requires no Postgres.
