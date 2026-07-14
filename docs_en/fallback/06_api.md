# API — Fallback Demo

> **DRAFT — proposed surface.** Paths, verbs, and JSON bodies are proposals to be confirmed at build time. The service is standalone (`fallback/`, ADR-F02) and mounts under its own prefix so it can never collide with the pilot backend's `/api/v1`.

## Conventions

- **Base path:** `/api/fallback` (DRAFT). The static web page is served at `/`.
- **Auth:** none. The demo is local, holds no personal data (no accounts, no photos), and exposes no write surface beyond creating a proposal request. (Deviation from main NFR-008 scope — justified by ADR-F01: nothing sensitive exists to protect.)
- **Async model:** submit → poll, the same idiom as the pilot's render flow, because composition takes tens of seconds (NFR-F02).
- **Currency/units:** USD for prices; the API accepts feet for room dimensions and reports footprints in ft²; product dimensions are inches (as Home Depot publishes them).
- **Error envelope:** `{ "error": "<code>", "message": "<human text>" }`, matching the pilot backend's handler convention.

---

## `GET /`

Serves the single demo page (form + results, vanilla JS polling). No parameters.

## `POST /api/fallback/proposal-requests`

**Purpose:** Create a proposal request (FR-F01, FR-F02, FR-F03).

```json
// Request (illustrative / draft)
{
  "roomType": "living_room",        // living_room | dining_room | bedroom | office
  "widthFt": 14.5,
  "lengthFt": 12,
  "budgetUsd": 2500                  // optional
}
```

```json
// 202 Accepted (illustrative / draft)
{ "id": "pr_a1b2c3", "status": "pending" }
```

| Code | Cause | Error code |
|---|---|---|
| 202 | Request accepted, composition started | — |
| 400 | Missing/unsupported room type | `room-type-validation` |
| 400 | Non-positive, non-numeric, or out-of-bounds dimensions | `dimension-validation` |
| 400 | Negative or non-numeric budget | `budget-validation` |

## `GET /api/fallback/proposal-requests/:id`

**Purpose:** Poll status and fetch results (FR-F10).

```json
// 200 — completed (illustrative / draft)
{
  "id": "pr_a1b2c3",
  "status": "completed",             // pending | processing | completed | failed
  "composer": "llm",                 // llm | rules  (FR-F06 criterion 2)
  "room": { "type": "living_room", "widthFt": 14.5, "lengthFt": 12, "floorAreaFt2": 174 },
  "budgetUsd": 2500,
  "proposals": [
    {
      "styleName": "Warm Minimal",
      "designDirection": "minimalist",
      "paletteDescription": "Oak, off-white and charcoal; low-contrast neutrals.",
      "rationale": "Low-profile pieces keep the small floor plan open…",
      "fit": { "usedFt2": 58.3, "availableFt2": 69.6, "usedPct": 33.5 },
      "totalUsd": 2180,
      "items": [
        {
          "productId": "319532744",
          "furnitureType": "sofa",
          "name": "…", "brand": "…",
          "priceUsd": 899,
          "color": "Beige",
          "widthIn": 84, "depthIn": 36, "heightIn": 33,
          "imageUrl": "https://…",
          "homeDepotUrl": "https://www.homedepot.com/p/…"
        }
      ]
    }
  ]
}
```

```json
// 200 — failed (illustrative / draft)
{ "id": "pr_a1b2c3", "status": "failed", "error": "catalog-unavailable",
  "message": "The Home Depot catalog could not be reached. Try again." }
```

| Code | Cause | Error code |
|---|---|---|
| 200 | Any status (poll result) | — |
| 404 | Unknown request id | `not-found` |

**Failure reasons** (`status: "failed"`): `catalog-unavailable` (FR-F04), `composition-failed` (FR-F06: LLM retries exhausted **and** the rule-based composer also failed to produce at least one proposal with ≥ 3 resolvable items), `no-eligible-products` (FR-F09 left too few products to compose from).

## `GET /health`

Liveness + dependency probe: reports reachability of the Ollama Cloud API and presence of `SERPAPI_API_KEY` and `OLLAMA_API_KEY` (never their values). Mirrors the pilot backend's unversioned health route.

---

## Endpoints deliberately absent

No cart, checkout, order, account, photo, or operator endpoints exist in the fallback (ADR-F01). Product purchase happens on homedepot.com via the outbound link.
