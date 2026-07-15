import type { Product } from "@prisma/client";

/**
 * CC BY 4.0 attribution for the public-catalog bootstrap track (ADR-027; FR-063/
 * FR-065; 07_data_model.md). A `source=public` product (Amazon Berkeley Objects)
 * is real, attributed, and DISPLAY-ONLY. CC BY 4.0 requires the four provenance
 * fields below; a public product missing any of them must NOT be displayed or
 * composited into a render (FR-065/TC-118). Supplier products carry no attribution.
 */
export interface Attribution {
  sourceName: string;
  sourceUrl: string;
  sourceImageUrl: string;
  imageLicense: string;
}

/** The attribution-bearing fields the CC BY 4.0 licence requires (FR-065). */
type AttributionFields = Pick<
  Product,
  "sourceName" | "sourceUrl" | "sourceImageUrl" | "imageLicense"
>;

/**
 * True when all four CC BY 4.0 attribution fields are present. A public product
 * that returns false is excluded from display/render with a `missing-attribution`
 * outcome (FR-065/TC-118).
 */
export function hasRequiredAttribution(p: AttributionFields): boolean {
  return Boolean(p.sourceName && p.sourceUrl && p.sourceImageUrl && p.imageLicense);
}

/**
 * Build the attribution object surfaced on the product/render item and propagated
 * onto the stored render (a derivative work — FR-065, NFR-019, ADR-026). Returns
 * null when the required fields are not all present.
 */
export function attributionOf(p: AttributionFields): Attribution | null {
  if (!hasRequiredAttribution(p)) return null;
  return {
    sourceName: p.sourceName as string,
    sourceUrl: p.sourceUrl as string,
    sourceImageUrl: p.sourceImageUrl as string,
    imageLicense: p.imageLicense as string,
  };
}
