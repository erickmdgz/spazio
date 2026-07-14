// Spazio pilot catalog — a small, hand-curated set of REAL, purchasable SKUs.
// Mirrors the pilot invariant (ADR-006/014): the AI never invents furniture;
// every rendered item maps to a real catalog product with price + supplier.
// Prices are whole-COP (Colombian pesos), realistic for Bogotá retail.

export type FulfilmentKind = "ready-made" | "made-to-order";

export interface Supplier {
  id: string;
  name: string;
  city: string;
}

export interface Product {
  id: string;
  name: string;
  priceCop: number;
  supplierId: string;
  category: string;
  styleTags: string[]; // scenario style ids this SKU fits
  fulfilment: FulfilmentKind;
  /** Lead time: delivery days (ready-made) or production days (made-to-order). */
  leadTimeDays: number;
  /** Local, self-contained thumbnail asset (see public/products). */
  thumbnail: string;
  blurb: string;
}

export const SUPPLIERS: Supplier[] = [
  { id: "maderos", name: "Maderos del Norte", city: "Bogotá" },
  { id: "bacata", name: "Textiles Bacatá", city: "Bogotá" },
  { id: "lumina", name: "Lumina Bogotá", city: "Bogotá" },
];

export const PRODUCTS: Product[] = [
  {
    id: "sofa-teide",
    name: "Teide 3-Seat Sofa",
    priceCop: 3_200_000,
    supplierId: "maderos",
    category: "Seating",
    styleTags: ["mediterranean", "minimalist", "scandinavian"],
    fulfilment: "ready-made",
    leadTimeDays: 12,
    thumbnail: "/products/sofa-teide.svg",
    blurb: "Deep-seat three-seater in a warm oatmeal weave with solid oak feet.",
  },
  {
    id: "coffee-table-oak",
    name: "Roble Coffee Table",
    priceCop: 1_150_000,
    supplierId: "maderos",
    category: "Tables",
    styleTags: ["minimalist", "scandinavian"],
    fulfilment: "ready-made",
    leadTimeDays: 10,
    thumbnail: "/products/coffee-table-oak.svg",
    blurb: "Solid oak coffee table with rounded edges and a lower shelf.",
  },
  {
    id: "rug-sabana",
    name: "Sabana Wool Rug 2×3m",
    priceCop: 890_000,
    supplierId: "bacata",
    category: "Rugs",
    styleTags: ["mediterranean", "minimalist", "scandinavian"],
    fulfilment: "ready-made",
    leadTimeDays: 7,
    thumbnail: "/products/rug-sabana.svg",
    blurb: "Hand-loomed wool rug with a soft low pile and tonal border.",
  },
  {
    id: "floor-lamp-arco",
    name: "Arco Floor Lamp",
    priceCop: 640_000,
    supplierId: "lumina",
    category: "Lighting",
    styleTags: ["minimalist", "scandinavian"],
    fulfilment: "ready-made",
    leadTimeDays: 6,
    thumbnail: "/products/floor-lamp-arco.svg",
    blurb: "Slim arc lamp with a warm dimmable shade and marble base.",
  },
  {
    id: "armchair-boucle",
    name: "Bouclé Lounge Chair",
    priceCop: 1_780_000,
    supplierId: "maderos",
    category: "Seating",
    styleTags: ["minimalist", "scandinavian"],
    fulfilment: "made-to-order",
    leadTimeDays: 25,
    thumbnail: "/products/armchair-boucle.svg",
    blurb: "Made-to-order lounge chair upholstered in textured bouclé.",
  },
  {
    id: "wall-art-terra",
    name: "Terracota Wall Art",
    priceCop: 420_000,
    supplierId: "bacata",
    category: "Decor",
    styleTags: ["mediterranean"],
    fulfilment: "ready-made",
    leadTimeDays: 5,
    thumbnail: "/products/wall-art-terra.svg",
    blurb: "Framed textile print in warm earth tones, ready to hang.",
  },
  {
    id: "plant-monstera",
    name: "Monstera in Ceramic Pot",
    priceCop: 260_000,
    supplierId: "lumina",
    category: "Decor",
    styleTags: ["mediterranean", "minimalist", "scandinavian"],
    fulfilment: "ready-made",
    leadTimeDays: 4,
    thumbnail: "/products/plant-monstera.svg",
    blurb: "Live monstera deliciosa potted in a matte stoneware planter.",
  },
  {
    id: "bed-frame-nordic",
    name: "Nordic Oak Bed Frame (Queen)",
    priceCop: 2_650_000,
    supplierId: "maderos",
    category: "Beds",
    styleTags: ["minimalist", "scandinavian", "mediterranean"],
    fulfilment: "made-to-order",
    leadTimeDays: 30,
    thumbnail: "/products/bed-frame-nordic.svg",
    blurb: "Made-to-order queen frame in solid oak with an upholstered headboard.",
  },
  {
    id: "nightstand-luna",
    name: "Luna Nightstand",
    priceCop: 540_000,
    supplierId: "maderos",
    category: "Storage",
    styleTags: ["minimalist", "scandinavian", "mediterranean"],
    fulfilment: "ready-made",
    leadTimeDays: 9,
    thumbnail: "/products/nightstand-luna.svg",
    blurb: "Two-drawer nightstand in oak with soft-close runners.",
  },
  {
    id: "pendant-ceramic",
    name: "Ceramic Pendant Lamp",
    priceCop: 380_000,
    supplierId: "lumina",
    category: "Lighting",
    styleTags: ["mediterranean", "minimalist"],
    fulfilment: "ready-made",
    leadTimeDays: 6,
    thumbnail: "/products/pendant-ceramic.svg",
    blurb: "Hand-glazed ceramic pendant that casts a warm, even glow.",
  },
  {
    id: "table-lamp-clay",
    name: "Clay Table Lamp",
    priceCop: 290_000,
    supplierId: "lumina",
    category: "Lighting",
    styleTags: ["mediterranean", "scandinavian", "minimalist"],
    fulfilment: "ready-made",
    leadTimeDays: 5,
    thumbnail: "/products/table-lamp-clay.svg",
    blurb: "Rounded clay-base table lamp with a linen drum shade.",
  },
];

const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
const SUPPLIER_BY_ID = new Map(SUPPLIERS.map((s) => [s.id, s]));

export function getProduct(id: string): Product | undefined {
  return PRODUCT_BY_ID.get(id);
}

export function getSupplier(id: string): Supplier | undefined {
  return SUPPLIER_BY_ID.get(id);
}

export function getSupplierName(id: string): string {
  return SUPPLIER_BY_ID.get(id)?.name ?? "Unknown supplier";
}
