# Spazio — web app (the product platform since ADR-024)

**See your room furnished with real, purchasable furniture.**

A step wizard that takes a room → style → budget and produces a render whose
furniture is real, tappable, and purchasable, ending in a checkout grouped by
supplier.

> **Update (ADR-024 + #31):** this started as the 2-day class demo and is now the
> **product platform**, wired to the real backend. The wizard runs over `/api/v1`
> (Next.js rewrite → `../backend`, Fastify + Prisma + Postgres): the project,
> render, cart and order are real rows; renders wait for **operator approval**
> (approve them in the backend's console at `/operator/console`); checkout
> captures on a **fake gateway** (no real money — ADR-003 vendor open) and the
> composite image is still a cached local asset (ADR-002 vendor open).
> **Run the backend first** — see `../backend/README.md` (Postgres via Docker,
> migrate, seed, operator account, `PORT=3001 npm run dev`), or set
> `BACKEND_ORIGIN` if it runs elsewhere. The offline, in-memory demo described
> below is preserved in git history (tag: the PR #22 merge).

---

## Scope note — this demo supersedes ADR-001 (for the demo only)

The pilot decision record **ADR-001** selects a **native iOS (SwiftUI)** app plus
a managed backend, Postgres, and object storage. **For the purposes of this class
demo, that decision is intentionally superseded**: the demo is a **web app**
(Next.js + TypeScript + Tailwind), single-process, no backend or database. This
lets the whole render-to-purchase loop be shown on any laptop or projector,
offline, in one `npm run dev`.

This changes nothing about the real product plan — it is a teaching/demonstration
artifact only. The pilot architecture (ADR-001), rendering approach (ADR-002),
minimal-contact checkout (ADR-022), and brand palette (ADR-021) are all reflected
in spirit so the demo is faithful to the product.

---

## What's in the flow (8 steps)

1. **Landing** (`/`) — hero + value prop + **Start**.
2. **Room** (`/room`) — pick a sample room (living room / bedroom) or "upload"
   (in demo mode an upload routes to a prepared sample), plus approximate
   dimensions.
3. **Style & budget** (`/style`) — pick a predefined style (Modern Mediterranean,
   Warm Minimalist, Scandinavian), an optional free-text note, and a COP budget
   slider (2,000,000 – 12,000,000).
4. **Render** (`/render`) — a simulated "generating…" state (~2–4s), then the
   furnished-room image with **tappable product hotspots**.
5. **Product detail** — tapping a hotspot opens a sheet: image, name, price (COP),
   supplier, category, lead time, and Add/Remove.
6. **Cart** (`/cart`) — items with price + supplier, per-item and total in COP,
   budget-vs-total indicator (10% tolerance), remove/swap.
7. **Checkout** (`/checkout`) — minimal contact (email, phone, shipping — no
   account), order summary **grouped by supplier (one PO per supplier)**, and a
   **mock** "Pay $ X" button (amount in COP) with a brief processing spinner.
8. **Confirmation** (`/confirmation`) — order number, per-supplier breakdown,
   per-item delivery/production estimate, and a friendly operator-in-the-loop
   message.

---

## Tech & structure

- **Next.js (App Router) + TypeScript + Tailwind CSS.** No database.
- Wizard/cart state is in-memory via a React context (`src/lib/store.tsx`).
- **Render provider is fallback-first** (the key safety design):
  - `src/lib/render/cachedProvider.ts` — **DEFAULT**. Serves prepared, local
    renders + tag coordinates for every room+style scenario. No API key, offline,
    always works.
  - `src/lib/render/openaiProvider.ts` — optional real-provider **stub**, used
    only when `IMAGE_API_KEY` is set. On any error the selector silently falls
    back to the cached provider (`src/lib/render/index.ts`).
- **All assets are local** (`public/rooms/*.svg`, `public/products/*.svg`) — the
  demo never fetches an external image at runtime, so it works on stage offline.

```
src/
  app/            landing + one route per wizard step (product detail is a modal, not a route) + actions.ts (server action)
  components/     Wordmark, Stepper, SiteHeader, ProductSheet
  lib/
    catalog.ts    11 real SKUs + 3 suppliers (incl. made-to-order items)
    scenarios.ts  sample rooms, styles, and room+style → render mappings
    format.ts     COP formatting + lead-time labels
    store.tsx     in-memory wizard + cart state
    render/       provider interface, cached provider, openai stub, selector
public/
  rooms/          styled SVG room renders + "before" thumbnails
  products/       styled SVG product thumbnails
```

---

## Run it locally

**Prerequisites:** Node.js 20+ (tested on Node 22) and npm.

1. Open a terminal in this folder:
   ```bash
   cd web-demo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the app: **http://localhost:3000**

To run the production build instead:
```bash
npm run build
npm run start
```

---

## Optional: enable live AI renders

The demo works fully **without** any key (it uses the cached provider). To try a
real image provider:

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. In `.env.local`, set:
   ```
   RENDER_PROVIDER=openai
   IMAGE_API_KEY=your-key-here
   ```
3. Restart `npm run dev`.

`src/lib/render/openaiProvider.ts` is a **stub** on purpose — it throws until you
implement and verify the real image-edit endpoint/params against the current
provider docs. Until then the app silently falls back to the cached provider, so
the demo can never break. The key is **never** committed (`.gitignore` excludes
`.env*.local`) and stays server-side (renders run through a server action).

### Swapping in real cached renders

Once you have real generated images, drop them into `public/rooms/` using the
same filenames the cached provider expects, `{{room}}-{{style}}.svg` (or `.png`),
e.g. `public/rooms/living-mediterranean.png`, then update the paths/positions in
`src/lib/scenarios.ts` (`getScenario` + `POSITIONS`). No other code changes are
needed — the placeholder SVGs are simply replaced.

---

## Deploy to Vercel (one click-ish)

1. Push this `web-demo` folder to a Git repository (GitHub/GitLab/Bitbucket).
2. Go to **vercel.com → Add New → Project** and import that repository.
3. If `web-demo` is a subfolder, set **Root Directory** to `web-demo`.
4. Framework preset auto-detects **Next.js**. Leave build/output defaults.
5. (Optional) Add env vars `RENDER_PROVIDER` and `IMAGE_API_KEY` under
   **Settings → Environment Variables**. Skip these to use the offline demo.
6. Click **Deploy**. Vercel gives you a public URL.

---

## Demo script (the exact click path to show the professor)

1. Open **`/`** — read the one-line value prop, click **Start**.
2. **Room:** click **Living room** (or click **Upload a photo** and pick any
   image — it routes to the prepared sample). Leave the default dimensions.
   Click **Continue**.
3. **Style & budget:** click **Modern Mediterranean**, optionally type a note
   (e.g. "lots of plants, warm light"), drag the budget to ~**COP 7,000,000**.
   Click **Generate render**.
4. **Render:** watch the ~3s "generating…" animation, then the furnished room
   appears with numbered hotspots. **Tap hotspot #1 (the sofa)** — the product
   sheet shows price, supplier, lead time. Close it. Note the cart already has
   every tagged item and shows **Within budget**. Click **Review cart**.
5. **Cart:** point out per-item price + supplier + lead time and the total. Click
   **Swap** on one item to show it changing, or **Remove** one. Click
   **Checkout**.
6. **Checkout:** fill email / phone / address. Show the summary is **grouped by
   supplier (one PO each)**. Click **Pay $ …** — the spinner runs briefly.
7. **Confirmation:** show the order number, the per-supplier breakdown with
   per-item delivery/production dates, and the operator-in-the-loop message.
   Optionally click **Start a new design** to reset.

Total run time: about a minute.
