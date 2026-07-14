/**
 * BR-1 completeness (ADR-014): a SKU is renderable only when every required
 * field is present — photos, colors, materials, style attributes, dimensions,
 * price, lead times, warranty — plus stock for ready-made or a production lead
 * time for made-to-order. Enforced upstream by operator curation (§0.1#7).
 */

export interface CompletenessInput {
  photos: string[];
  colors: string[];
  materials: string[];
  styleAttributes: string[];
  priceCop: number;
  deliveryLeadTimeDays: number;
  warrantyTerms: string;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  classification: "ready_made" | "made_to_order";
  stock?: number | null;
  productionLeadTimeDays?: number | null;
}

export function completenessOf(input: CompletenessInput): "complete" | "incomplete" {
  const hasCore =
    input.photos.length > 0 &&
    input.colors.length > 0 &&
    input.materials.length > 0 &&
    input.styleAttributes.length > 0 &&
    input.priceCop > 0 &&
    input.deliveryLeadTimeDays >= 0 &&
    input.warrantyTerms.length > 0 &&
    input.widthCm != null &&
    input.depthCm != null &&
    input.heightCm != null;
  const classOk =
    input.classification === "ready_made"
      ? input.stock != null
      : input.productionLeadTimeDays != null;
  return hasCore && classOk ? "complete" : "incomplete";
}
