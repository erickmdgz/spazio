# Attribution — Amazon Berkeley Objects (ABO)

The product records in `abo_seed.json` and the images under `img/` are drawn from
the **Amazon Berkeley Objects (ABO)** dataset and are redistributed here **with
attribution** under the terms of that licence.

- **Source dataset:** Amazon Berkeley Objects (ABO)
- **Dataset home / index:** https://amazon-berkeley-objects.s3.amazonaws.com/index.html
- **Licence:** Creative Commons Attribution 4.0 International (**CC BY 4.0**) —
  https://creativecommons.org/licenses/by/4.0/
- **Attribution string used in the app:** "Amazon Berkeley Objects (ABO)" with a
  per-product source URL (`https://www.amazon.com/dp/<ASIN>`) and the licence label
  `CC BY 4.0`.

## Why these files live in the repo

They are the reproducible seed for the **public-catalog bootstrap fallback**
(FEAT-017 / ADR-027). Vendoring the JSON + the (non-swatch) images means seeding
the demo does not require re-fetching the dataset. CC BY 4.0 permits redistribution
provided attribution is given — this NOTICE, plus the per-product attribution
fields carried on each seeded row (`sourceName`, `sourceUrl`, `sourceImageUrl`,
`imageLicense`) and surfaced in the UI, satisfy that requirement.

## Scope / caveats

- These are `source=public` products: **display-only**, labeled "not sold by
  Spazio", with a "View at retailer" outbound link. They are **never** added to
  cart, checkout, orders, commission, or merchant-of-record, and are excluded from
  the render-to-purchase metric (FR-062..065, NFR-006, NFR-019, ADR-027).
- Fabric **swatch** items from the dataset are intentionally excluded (they are not
  furniture); only the ~12 real furniture products are seeded.
- No modification is claimed over the original photographs beyond storage; a render
  that composites one of these images is a derivative work and carries the same
  CC BY 4.0 attribution (FR-065, ADR-026).
