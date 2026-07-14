# Spazio pilot backend

Reviewable scaffold for the Spazio one-week pilot backend. Stack (ADR-001):
**Node.js 22 + TypeScript, Fastify, Prisma over Postgres**, with a queue abstraction
for async render jobs.

> **Nothing here is deployed.** This is structure only: every route, model, and
> event point exists, is typed, compiles, and is covered by a minimal test. Business
> logic is intentionally minimal/stubbed — features implement it later. Handlers that
> are not yet implemented return `501 Not Implemented` with a typed body.

## Scope (pilot boundaries)

Built strictly to the pilot scope: single market (Bogota / COP), no end-user
accounts (device token), operator-curated catalog, mandatory operator render QA,
single COP capture with manual payout, purchase orders created at checkout and
forwarded manually. Deferred features (stock holds, split settlement, warranty
display, keep-or-replace, render metering, sponsored placement, manual add-to-cart)
are intentionally absent — see the comments in `prisma/schema.prisma` and the route
files.

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

# 5. seed the pilot catalog (3 styles, 3 suppliers, 11 BR-1-complete SKUs)
npm run db:seed

# 6. create an operator console account (password prompted, hidden input)
npm run operator:create -- --email you@example.com --name "You" --role render_reviewer

# 7. run the dev server (loads ./.env natively)
npm run dev
```

Health check: `curl http://localhost:3000/health` → `{"status":"ok","service":"spazio-backend"}`.

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
npm run operator:create -- --email ana@spazio.example --name "Ana" --role render_reviewer
```

Roles (`catalog_curator` / `render_reviewer` / `order_handler`) are stored but not
yet enforced per action — that arrives with FEAT-006/011/015 (see the DoD
carve-outs in the build plan §2.4).

## API surface

Versioned prefix `/api/v1`. Client endpoints are public in the pilot (no accounts,
ADR-022). Operator endpoints live under `/api/v1/operator` behind the session
guard (`src/auth/operator.ts`); `POST/GET/DELETE /operator/session` (login /
whoami / logout) are the unauthenticated exceptions.

- Client: `POST /projects`, `POST /projects/:id/photos`, `PATCH /projects/:id`,
  `GET /localization/resolve`, `POST /renders`, `GET /renders/:id`,
  `GET /renders/:id/items`, `GET /cart`, `PUT /cart/items/:id`,
  `DELETE /cart/items/:id`, `POST /cart/confirm`, `GET /cart/estimates`,
  `POST /checkout`, `GET /orders/:id`.
- Operator: `POST/GET/DELETE /operator/session`,
  `GET/POST/PATCH /operator/catalog/products`,
  `POST /operator/catalog/products/:id/approve|reject`,
  `GET /operator/renders`, `POST /operator/renders/:id/approve|reject`,
  `GET /operator/orders`, `POST /operator/orders/:id/forward`.
- Console shell (static, unversioned): `GET /operator/console` (+ `app.js`, `styles.css`).

`POST /cart/items` (manual add-to-cart, FR-030) is intentionally **not** registered.

## Tests

Tests run without a live database: the Fastify app factory accepts an injected
Prisma client, so the suite passes a typed mock. `npm test` requires no Postgres.
