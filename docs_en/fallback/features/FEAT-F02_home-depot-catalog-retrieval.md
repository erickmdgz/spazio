# FEAT-F02 — Home Depot catalog retrieval (SerpApi)

## 1. Summary

The fallback's catalog engine: for a given room type, fetch real candidate products from The Home Depot via SerpApi (Search API per curated furniture-type query), enrich a shortlist with real specifications (dimensions, color) via the Product API, normalize into `CatalogProduct` records, exclude incomplete ones, and cache everything on disk.

## 2. Problem or need

Every downstream guarantee depends on a snapshot of real, fully-specified, purchasable products. This is the fallback's replacement for the pilot's operator-curated catalog (deviation recorded in ADR-F02).

## 3. Affected user

Indirect — the demo user sees only its output; the developer/operator curates its query map.

## 4. Related requirements

- FR-F04, FR-F05, FR-F09 (snapshot purity + completeness exclusion)
- NFR-F01 (key via env), NFR-F03 (cache/quota)

## 5. Expected flow

1. A proposal request is accepted (FEAT-F01) and composition starts.
2. For each furniture type in `RoomTypeMap[roomType]`, the system calls the Search API (`engine=home_depot`, curated query, price bounds from the budget when present) — cache first.
3. Top candidates per type (shortlist size from the map) are enriched via the Product API (`engine=home_depot_product`) — cache first.
4. Responses are normalized to `CatalogProduct`; products missing price, dimensions, color, image, or link are flagged `incomplete`/ineligible.
5. The eligible set becomes the request's catalog snapshot; if it cannot support composition, the request fails `catalog-unavailable` / `no-eligible-products` — never fabricated data.

## 6. Acceptance criteria

In the FRs: FR-F04 → TC-F08/F09 · FR-F05 → TC-F10/F11 · FR-F09 → TC-F18/F19 · NFR-F03 → TC-F24.

## 7. Business rules

See FR-F04 (curated query map is the only query source), FR-F05 (bounded enrichment, no guessed specs), FR-F09 (completeness gate).

## 8. Proposed technical design

### Frontend
None.

### Backend
`fallback/src/services/homeDepot.ts`: `HomeDepotCatalog` interface + `SerpApiHomeDepotCatalog` implementation + `FixtureHomeDepotCatalog` fake for tests (interface + fake idiom copied from the pilot backend). Disk cache module keyed by engine + normalized query, TTL 24 h, under gitignored `fallback/.cache/`.

### Database
None — cache files + per-request in-memory snapshot.

### Security
`SERPAPI_API_KEY` via Zod-validated env only; never logged, never committed (NFR-F01). Cache directory gitignored.

## 9. Required tests

| ID | Test | Type |
|---|---|---|
| TC-F08, TC-F10 | Fetch + enrichment happy paths (fixtures) | Functional |
| TC-F09, TC-F11, TC-F19 | API failure / incomplete-product exclusion | Functional |
| TC-F18 | Snapshot contains only allow-listed furniture types for the room | Functional |
| TC-F24 | Cache hit produces zero network calls | Functional |
| TC-F22 | No secrets in the branch | Security |

## 10. Documentation impact

- [x] `fallback/02_architecture.md`, `03_requirements.md`, `07_data_model.md`, `08_test_plan.md`, `decisions/ADR-F02` (this set)

## 11. Checklist before implementing

- [x] Clear objective · [x] Linked to requirements · [x] Acceptance criteria (in FRs) · [x] Tests defined · [x] Technical impact understood · [x] User impact understood
- [ ] SerpApi key available in the local environment (prerequisite)

## 12. Checklist before closing

- [ ] Code implemented · [ ] Tests executed · [ ] Acceptance criteria met · [ ] PR reviewed · [ ] Documentation updated · [ ] Release notes updated
