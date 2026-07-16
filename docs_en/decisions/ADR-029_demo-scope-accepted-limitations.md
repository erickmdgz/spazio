# ADR-029 - Demo-scope: accepted limitations

## Status

Accepted.

Scope: product direction decided by the owner on 2026-07-15. The current build is a **class-project demo**, and the three known limitations below are **deliberately accepted for now** — they are **not** open work items to fix before the demo. They are revisited only if/when the product moves beyond the demo. This ADR does not change any built behavior; it records a scoping decision.

## Context

Spazio is built and verified on a local stack (web app + backend; see `docs_en/00_overview.md`). Three gaps between the demo and a production-grade product were identified and surfaced to the owner:

1. **Local-supplier product images are placeholders.** The 11 seeded local-supplier SKUs use vector SVG illustrations (`/products/*.svg`), not real photos, so a render on the **Local suppliers** source composites *generic* furniture rather than the exact catalog product. The **Brand suppliers** source (Amazon Berkeley Objects, `source=public`) has real product photos and renders them for real (ADR-027).
2. **Payments are mock.** Checkout runs a fake gateway; the real payment vendor is unchosen (`ADR-003` remains open). Orders are created, but no money moves.
3. **Not deployed.** The system runs on a local dev stack only. The render engine is self-hosted FLUX.2 Klein 4B via mflux (ADR-026), which requires an **Apple-Silicon** host, so a hosted deployment would need a dedicated render worker or a different engine.

## Decision

**For the current demo, all three limitations are accepted as-is.** They are recorded here as known, deliberate demo-scope boundaries — not defects and not pending tasks:

1. Local-supplier renders stay generic (placeholder images). The demo's "real, purchasable furniture" story is carried by the **Brand suppliers** (ABO) source, which has real photos and "View at retailer" links. Real local-supplier photos are **deferred** (revisit before a real launch).
2. Checkout stays a **mock** gateway; `ADR-003` (payment vendor) stays open and is **deferred** past the demo.
3. The system stays **local-only** (no deployment); the Apple-Silicon render-host constraint is a deployment concern **deferred** past the demo.

## Alternatives considered

1. **Close the gaps before the demo** (source real local-supplier photos, integrate a real payment vendor, deploy). Rejected for now: unnecessary for a class demo and a large amount of work; the demo goal is met without them.
2. **Leave them undocumented.** Rejected: they must be recorded as *accepted* so they are not mistaken for pending work or defects, and so the demo scope is honest.

## Positive consequences

- The demo scope is explicit and honest: these are known, accepted boundaries, not bugs or unfinished tasks.
- Effort stays on the demo experience rather than production concerns that do not affect it.
- The "real selling furniture" message is still demonstrable via the Brand/ABO source.

## Negative consequences

- The **Local suppliers** source renders generically, so it is the weaker of the two source modes on stage (mitigated by leading with Brand).
- No real transactions and no hosted/shareable URL until these are revisited.
- The Apple-Silicon render-host dependency remains an open question for any future deployment.

## Date

2026-07-15.
