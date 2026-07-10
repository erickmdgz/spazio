# Non-functional requirements

This document catalogs the quality attributes the system must satisfy. Each non-functional requirement (NFR) is a **cross-cutting constraint** on how Spazio behaves (performance, cost, security, usability, scalability), as opposed to a discrete capability (those live in `03_requirements.md` as `FR-`).

These are **specifications, not implementations**. Nothing here is built yet.

> **Source of truth:** PRD v0.7 §7 (Non-Functional Requirements), plus the pilot milestone (`Spazio_One_Week_iOS_Pilot.md`). Numeric values that the PRD reserves for humans are cited as PRD-stated targets/examples to be confirmed, not as final decisions (see `12. AI Role and Human Definitions` in the PRD and the `ADR-` decisions).

## Status legend

Each NFR is tagged so the reader can tell what is settled from what is not:

| Tag | Meaning |
|---|---|
| **VERIFIED** | Stated in PRD v0.7 and/or the pilot milestone. |
| **PROPOSED / DRAFT** | Reasonable structuring or a suggested way to measure the requirement; not stated in the PRD. To be reviewed by humans. |
| **TBD / PENDING** | A concrete value or model reserved for a human decision (tracked as an `ADR-`). |

**Priority scale** (same as `03_requirements.md`): **High** — without it the system does not fulfill its purpose · **Medium** — adds value, its absence degrades the system but can be deferred · **Low** — desirable, no impact on core value.

## Index

<!-- At a glance; detail lives in each NFR block below. Priorities come from the requirement registry. -->

| ID | Category | Requirement | Priority |
|---|---|---|---|
| NFR-001 | Performance | Single-room render time | High |
| NFR-002 | Performance | Targeted edits faster than full renders | Medium |
| NFR-003 | Cost control | Global inference-cost threshold | Medium |
| NFR-004 | Cost control | Graceful degradation on cost thresholds | Medium |
| NFR-005 | Cost control | Track cost per render | Medium |
| NFR-006 | Cost control | Track render-to-purchase from day one | High |
| NFR-007 | Security & payments | Photos and renders private by default | High |
| NFR-008 | Security & payments | Authentication protects account and order data | High |
| NFR-009 | Security & payments | PCI-compliant payment processing | High |
| NFR-010 | Security & payments | Split settlement and multi-supplier payouts | High |
| NFR-011 | Security & payments | Multi-currency processing | High |
| NFR-012 | Security & payments | Guest checkout and automatic commission retention | High |
| NFR-013 | Usability | Minimal-step style, dimensions, and budget entry | High |
| NFR-014 | Usability | Distinguish purchased items from kept items | Medium |
| NFR-015 | Usability | Price, delivery, and warranty visible before checkout | High |
| NFR-016 | Scalability & i18n | Supplier onboarding scales by region | Medium |
| NFR-017 | Scalability & i18n | Architecture supports multiple countries and currencies | High |
| NFR-018 | Scalability & i18n | Per-market taxes, payment methods, and legal config | High |

---

## Performance

## NFR-001 - Single-room render time

**Category:** Performance · **Priority:** High · **Status:** VERIFIED (a target must exist); numeric SLA **TBD** (ADR-013)

The system shall complete a typical single-room render within the confirmed render-time target, measured end to end from the moment the render request is accepted to the moment the render is available to the user.

- **PRD-stated target/example (to be confirmed by humans):** approximately **2–5 minutes** for a typical single-room render (PRD §7, Performance). The concrete render-time target is reserved for humans — see ADR-013.
- **Measure:** p50 and p95 end-to-end render latency against the confirmed target.
- **Trace:** PRD §7; FR-015, FEAT-005 (AI rendering engine). Human review adds operator time (FR-027) in the pilot; whether that time is inside or outside this target is **TBD**.

## NFR-002 - Targeted edits faster than full renders

**Category:** Performance · **Priority:** Medium · **Status:** VERIFIED

The system shall complete a targeted edit (a change affecting only the requested element) faster than a full render of the same scene.

- **Measure:** for comparable scenes, targeted-edit latency (p50/p95) is strictly lower than full-render latency.
- **Trace:** PRD §7; FR-052 (targeted edit), FEAT-014 (targeted render refinement). Targeted refinement is **excluded from the one-week pilot**, so this NFR is verified from the pilot only once that feature ships.

---

## Cost control

## NFR-003 - Global inference-cost threshold

**Category:** Cost control · **Priority:** Medium · **Status:** VERIFIED (a threshold must exist); threshold value **TBD / configurable**

The system shall enforce a global inference-cost threshold that bounds aggregate rendering spend.

- **Measure:** aggregate inference cost stays at or below the configured threshold over the measurement window; breaching it triggers the degradation behavior in NFR-004.
- **Trace:** PRD §7 (Cost control). The concrete threshold value is a human/operator setting (PRD §5 lists "monetization thresholds" as an operator responsibility) and is **TBD**.

## NFR-004 - Graceful degradation on cost thresholds

**Category:** Cost control · **Priority:** Medium · **Status:** VERIFIED

The system shall degrade gracefully — via queueing or slower rendering — when cost thresholds are exceeded, rather than failing requests outright.

- **Measure:** when the NFR-003 threshold is exceeded, new render requests are queued or served at reduced speed and no request is dropped without a user-visible state.
- **Trace:** PRD §7 (Cost control). Related cost-control levers: the configurable daily free-render limit (FR-048, PRD §7) — its default of five renders/user/day is a **PRD-stated default to be confirmed** (ADR-009).

## NFR-005 - Track cost per render

**Category:** Cost control · **Priority:** Medium · **Status:** VERIFIED

The system shall record the inference cost of every render.

- **Measure:** each `RenderRequest` (generation or edit) has an associated recorded cost; cost per render is queryable and can be aggregated for NFR-003.
- **Trace:** PRD §7 (Cost control); entity `RenderRequest`. Every generation or edit counts as one render attempt (FR-049, BR-20).

## NFR-006 - Track render-to-purchase from day one

**Category:** Cost control · **Priority:** High · **Status:** VERIFIED

The system shall track render-to-purchase conversion from day one of operation.

- **Measure:** `render-to-purchase rate = purchases / renders`, computed from the first day of use. This is Spazio's **primary success metric** (PRD §2; pilot "signal that it is working"): the share of renders that lead to a completed in-app purchase of one or more shown products, in the same session, without the user leaving Spazio.
- **Trace:** PRD §2 (Success signal), PRD §7 (Cost control), and the pilot go/no-go criterion.

---

## Security & payments

> The **payment gateway**, **split-settlement model**, and **merchant-of-record model** are reserved for humans (PRD §12; ADR-003, ADR-004). NFR-009 through NFR-012 state the capabilities the chosen gateway must provide; they do not select a provider.

## NFR-007 - Photos and renders private by default

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED

The system shall keep user room photos and generated renders private by default.

- **Measure:** an uploaded/captured photo or a generated render is not accessible to any party other than its owner (and the operators required to review it, FR-027) unless the owner explicitly shares it; sharing is not a pilot feature.
- **Trace:** PRD §7 (Security and payments) and BR-33; entities `RoomPhoto`, `Render`. Broader data-privacy rules are human-reserved (ADR-019).

## NFR-008 - Authentication protects account and order data

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED

The system shall protect account and order data behind authentication, so account and order records are not accessible without authenticated authorization.

- **Measure:** requests for account or order data without valid authentication are rejected; a user can reach only their own account and order records.
- **Trace:** PRD §7 (Security and payments); FEAT-001 (accounts & identity), FR-001/FR-002. Accounts are **not part of the one-week pilot** (the pilot excludes guest checkout and saved designs and keeps checkout simple), so this NFR applies as account features ship.

## NFR-009 - PCI-compliant payment processing

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED (requirement); gateway **TBD** (ADR-003)

The system shall process payments through a PCI-compliant path.

- **Measure:** payment processing is handled by a PCI DSS-compliant gateway. **PROPOSED / DRAFT:** Spazio does not store raw card data itself (it delegates to the gateway) — to be confirmed with the chosen provider and legal review.
- **Trace:** PRD §7, PRD §10 (Dependencies: PCI-compliant payment gateway); FR-042 (single in-app payment), FEAT-010. The specific gateway is **TBD** (ADR-003).

## NFR-010 - Split settlement and multi-supplier payouts

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED (capability required); model **TBD** (ADR-003, ADR-004)

The payment gateway shall support marketplace-style split settlement and payouts to multiple suppliers from a single user payment.

- **Measure:** one user payment (FR-042) can be settled across the suppliers of the order, producing one purchase order per supplier (FR-044, BR-25).
- **Trace:** PRD §7, PRD §10 (risk: split settlement may not be available in every country); FR-043, FR-044, FEAT-010. In the **one-week pilot**, automated split payment is excluded — the operator forwards each confirmed order manually (FR-061, pilot). The split-settlement and merchant-of-record models are **TBD** (ADR-003, ADR-004).

## NFR-011 - Multi-currency processing

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED

The payment gateway shall support processing payments in multiple currencies.

- **Measure:** an order can be priced and paid in the user's local currency (BR-27, FR-046); the gateway settles that currency.
- **Trace:** PRD §7; FR-046 (display prices in local currency), FEAT-004/FEAT-010. The **pilot is single-currency (COP)** in Bogotá; multi-currency is a full-product requirement. Initial markets and their currencies are **TBD** (ADR-015).

## NFR-012 - Guest checkout and automatic commission retention

**Category:** Security & payments · **Priority:** High · **Status:** VERIFIED (capability required); commission % **TBD** (ADR-007)

The payment gateway shall support guest checkout and automatic retention of the Spazio marketplace commission on each completed purchase.

- **Measure:** a purchase can complete without a persistent account (with validated email, phone, and shipping info, FR-004 / BR-26), and the marketplace commission is retained automatically on every completed purchase (FR-045, BR-28).
- **Trace:** PRD §7, PRD §9 (Monetization); FR-004, FR-045, FEAT-010. The commission percentage is a **PRD-stated example only** ("for example 10%", PRD §9) and is reserved for humans — see ADR-007. Guest checkout is **excluded from the one-week pilot**.

---

## Usability

## NFR-013 - Minimal-step style, dimensions, and budget entry

**Category:** Usability · **Priority:** High · **Status:** VERIFIED (qualitative); step-count target **PROPOSED / TBD**

The system shall let the user provide style, room dimensions, and budget in minimal steps.

- **Measure:** **PROPOSED / DRAFT** — a concrete, testable target (for example, a maximum number of screens or taps per input) should be set by humans; the PRD states the goal qualitatively ("should require minimal steps") without a number. Most users lack formal design vocabulary, so style selection should be visual (PRD §5).
- **Trace:** PRD §7 (Usability), PRD §5 (User context); FR-007/FR-008 (style), FR-009 (budget), FR-011 (dimensions), FEAT-002/FEAT-003.

## NFR-014 - Distinguish purchased items from kept items

**Category:** Usability · **Priority:** Medium · **Status:** VERIFIED

The system shall visibly distinguish purchased catalog items from existing items the user chose to keep.

- **Measure:** in the render/cart experience, an item's state (purchasable catalog product vs. kept existing item) is visually distinguishable to the user.
- **Trace:** PRD §7 (Usability); FR-025/FR-026, FEAT-012 (keep-or-replace segmentation). Keep-or-replace is **excluded from the one-week pilot** (the pilot assumes full replacement), so this NFR applies once segmentation ships.

## NFR-015 - Price, delivery, and warranty visible before checkout

**Category:** Usability · **Priority:** High · **Status:** VERIFIED

The system shall make price, delivery estimate, and warranty terms visible before checkout.

- **Measure:** before the user confirms payment, each item shows its price, its supplier-sourced production/delivery estimate (FR-036, BR-17), and its supplier-declared warranty terms (FR-038, BR-18).
- **Trace:** PRD §7 (Usability), PRD §5 (delivery time and warranty strongly influence purchase); FR-036/FR-037/FR-038, FEAT-009. In the **pilot**, price and per-item delivery/production estimates are included, but **warranty display is excluded**.

---

## Scalability & internationalization

## NFR-016 - Supplier onboarding scales by region

**Category:** Scalability & internationalization · **Priority:** Medium · **Status:** VERIFIED

The system shall let supplier onboarding scale by region.

- **Measure:** suppliers and their catalogs can be added per region without re-architecting; onboarding one region does not block or degrade others.
- **Trace:** PRD §7 (Scalability and internationalization); FEAT-015 (supplier catalog management), FR-055–FR-060. In the **pilot**, the catalog is small and manually curated by operators (FR-056, FR-061) for one city (Bogotá); self-service ingestion is excluded. Supplier partners and onboarding terms are **TBD** (ADR-016).

## NFR-017 - Architecture supports multiple countries and currencies

**Category:** Scalability & internationalization · **Priority:** High · **Status:** VERIFIED

The system architecture shall support multiple countries and currencies.

- **Measure:** the architecture can serve more than one market and currency; adding a market does not require redesign (launch remains phased — PRD §11 Assumptions).
- **Trace:** PRD §7, PRD §11; FEAT-004 (localization & delivery coverage), entity `Market`, FR-046. The **pilot targets a single market/currency** (Bogotá, COP); initial markets are **TBD** (ADR-015).

## NFR-018 - Per-market taxes, payment methods, and legal config

**Category:** Scalability & internationalization · **Priority:** High · **Status:** VERIFIED (must be configurable); values **TBD** (ADR-015, ADR-018)

The system shall make taxes, payment methods, and legal requirements configurable per market.

- **Measure:** taxes, available payment methods, and legal/compliance settings are resolved per `Market` configuration rather than hard-coded.
- **Trace:** PRD §7, PRD §10 (risk: multi-country complexity — taxes, payment rails, consumer protection, local legal requirements); entity `Market`. The concrete taxes, payment methods, and legal/compliance rules per market are reserved for humans and are **TBD** (ADR-018 for taxes & compliance, ADR-019 for data privacy & consumer protection, ADR-020 for warranty & dispute resolution; markets per ADR-015).

---

## Traceability note

Every NFR above is derived from PRD v0.7 §7 and the pilot milestone. Where the PRD gives a number or model that §12 reserves for humans (render-time target, inference-cost threshold, payment gateway, split-settlement and merchant-of-record models, commission percentage, initial markets, taxes and legal/compliance), the value is marked **TBD / PENDING** and linked to the relevant `ADR-`. None of these requirements is implemented; they define acceptance targets for future work and must each map to test cases in `08_test_plan.md` as features are built.
