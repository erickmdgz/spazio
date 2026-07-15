import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../src/config.js";
import { loadDotEnv } from "../src/env.js";
import { completenessOf } from "../src/services/completeness.js";
import { LocalDiskStorage } from "../src/services/storage.js";

/**
 * Dev/pilot catalog seed (FEAT-015 minimal, #31 increment 3): the demo's three
 * Bogotá suppliers, three styles, and 11 curated SKUs, mirrored from
 * web-demo/src/lib/catalog.ts — Product.sku equals the web catalog id, which is
 * how the web app maps backend items onto its curated visuals.
 *
 * Colors, materials, dimensions and warranty are demo-realistic seed values so
 * every SKU passes the BR-1 completeness gate (ADR-014). Rows are loaded
 * already approved: this seed bootstraps a dev environment; curation of NEW
 * SKUs still happens in the operator console (FR-056–059). Idempotent by
 * style code / supplier name / product sku.
 *
 * Run: npm run db:seed (requires DATABASE_URL; run db:migrate first).
 */

const STYLES = [
  { code: "mediterranean", name: "Modern Mediterranean", description: "Warm earth tones, terracotta accents and natural textures." },
  { code: "minimalist", name: "Warm Minimalist", description: "Soft neutrals, clean lines and uncluttered, cozy calm." },
  { code: "scandinavian", name: "Scandinavian", description: "Light woods, airy whites and gentle blue-grey accents." },
] as const;

const SUPPLIERS = [
  { key: "maderos", name: "Maderos del Norte" },
  { key: "bacata", name: "Textiles Bacatá" },
  { key: "lumina", name: "Lumina Bogotá" },
] as const;

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  supplier: (typeof SUPPLIERS)[number]["key"];
  priceCop: number;
  styleAttributes: string[];
  classification: "ready_made" | "made_to_order";
  stock: number | null;
  productionLeadTimeDays: number | null;
  deliveryLeadTimeDays: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  colors: string[];
  materials: string[];
  photos: string[];
  warrantyTerms: string;
}

const WARRANTY = "12-month supplier warranty (pilot: not displayed — ADR-020)";

export const SEED_PRODUCTS: SeedProduct[] = [
  { sku: "sofa-teide", name: "Teide 3-Seat Sofa", category: "Seating", supplier: "maderos", priceCop: 3_200_000, styleAttributes: ["mediterranean", "minimalist", "scandinavian"], classification: "ready_made", stock: 3, productionLeadTimeDays: null, deliveryLeadTimeDays: 12, widthCm: 220, depthCm: 95, heightCm: 85, colors: ["oatmeal"], materials: ["solid oak", "linen weave"], photos: ["/products/sofa-teide.svg"], warrantyTerms: WARRANTY },
  { sku: "coffee-table-oak", name: "Roble Coffee Table", category: "Tables", supplier: "maderos", priceCop: 1_150_000, styleAttributes: ["minimalist", "scandinavian"], classification: "ready_made", stock: 5, productionLeadTimeDays: null, deliveryLeadTimeDays: 10, widthCm: 110, depthCm: 60, heightCm: 42, colors: ["natural oak"], materials: ["solid oak"], photos: ["/products/coffee-table-oak.svg"], warrantyTerms: WARRANTY },
  { sku: "rug-sabana", name: "Sabana Wool Rug 2×3m", category: "Rugs", supplier: "bacata", priceCop: 890_000, styleAttributes: ["mediterranean", "minimalist", "scandinavian"], classification: "ready_made", stock: 8, productionLeadTimeDays: null, deliveryLeadTimeDays: 7, widthCm: 200, depthCm: 300, heightCm: 1, colors: ["ivory", "sand"], materials: ["hand-loomed wool"], photos: ["/products/rug-sabana.svg"], warrantyTerms: WARRANTY },
  { sku: "floor-lamp-arco", name: "Arco Floor Lamp", category: "Lighting", supplier: "lumina", priceCop: 640_000, styleAttributes: ["minimalist", "scandinavian"], classification: "ready_made", stock: 6, productionLeadTimeDays: null, deliveryLeadTimeDays: 6, widthCm: 30, depthCm: 30, heightCm: 180, colors: ["brass", "white"], materials: ["steel", "marble"], photos: ["/products/floor-lamp-arco.svg"], warrantyTerms: WARRANTY },
  { sku: "armchair-boucle", name: "Bouclé Lounge Chair", category: "Seating", supplier: "maderos", priceCop: 1_780_000, styleAttributes: ["minimalist", "scandinavian"], classification: "made_to_order", stock: null, productionLeadTimeDays: 25, deliveryLeadTimeDays: 5, widthCm: 80, depthCm: 85, heightCm: 78, colors: ["cream"], materials: ["bouclé", "beech"], photos: ["/products/armchair-boucle.svg"], warrantyTerms: WARRANTY },
  { sku: "wall-art-terra", name: "Terracota Wall Art", category: "Decor", supplier: "bacata", priceCop: 420_000, styleAttributes: ["mediterranean"], classification: "ready_made", stock: 10, productionLeadTimeDays: null, deliveryLeadTimeDays: 5, widthCm: 70, depthCm: 3, heightCm: 100, colors: ["terracotta"], materials: ["textile", "wood frame"], photos: ["/products/wall-art-terra.svg"], warrantyTerms: WARRANTY },
  { sku: "plant-monstera", name: "Monstera in Ceramic Pot", category: "Decor", supplier: "lumina", priceCop: 260_000, styleAttributes: ["mediterranean", "minimalist", "scandinavian"], classification: "ready_made", stock: 12, productionLeadTimeDays: null, deliveryLeadTimeDays: 4, widthCm: 40, depthCm: 40, heightCm: 90, colors: ["green", "stoneware grey"], materials: ["ceramic"], photos: ["/products/plant-monstera.svg"], warrantyTerms: WARRANTY },
  { sku: "bed-frame-nordic", name: "Nordic Oak Bed Frame (Queen)", category: "Beds", supplier: "maderos", priceCop: 2_650_000, styleAttributes: ["minimalist", "scandinavian", "mediterranean"], classification: "made_to_order", stock: null, productionLeadTimeDays: 30, deliveryLeadTimeDays: 7, widthCm: 160, depthCm: 200, heightCm: 110, colors: ["natural oak", "grey"], materials: ["solid oak", "linen"], photos: ["/products/bed-frame-nordic.svg"], warrantyTerms: WARRANTY },
  { sku: "nightstand-luna", name: "Luna Nightstand", category: "Storage", supplier: "maderos", priceCop: 540_000, styleAttributes: ["minimalist", "scandinavian", "mediterranean"], classification: "ready_made", stock: 7, productionLeadTimeDays: null, deliveryLeadTimeDays: 9, widthCm: 45, depthCm: 40, heightCm: 55, colors: ["natural oak"], materials: ["oak"], photos: ["/products/nightstand-luna.svg"], warrantyTerms: WARRANTY },
  { sku: "pendant-ceramic", name: "Ceramic Pendant Lamp", category: "Lighting", supplier: "lumina", priceCop: 380_000, styleAttributes: ["mediterranean", "minimalist"], classification: "ready_made", stock: 9, productionLeadTimeDays: null, deliveryLeadTimeDays: 6, widthCm: 25, depthCm: 25, heightCm: 30, colors: ["glazed white"], materials: ["ceramic"], photos: ["/products/pendant-ceramic.svg"], warrantyTerms: WARRANTY },
  { sku: "table-lamp-clay", name: "Clay Table Lamp", category: "Lighting", supplier: "lumina", priceCop: 290_000, styleAttributes: ["mediterranean", "scandinavian", "minimalist"], classification: "ready_made", stock: 11, productionLeadTimeDays: null, deliveryLeadTimeDays: 5, widthCm: 22, depthCm: 22, heightCm: 40, colors: ["clay", "linen"], materials: ["clay", "linen"], photos: ["/products/table-lamp-clay.svg"], warrantyTerms: WARRANTY },
];

// ---------------------------------------------------------------------------
// Public-catalog bootstrap fallback (FEAT-017 / ADR-027; FR-062..065, NFR-019).
//
// Real, attributed products from the Amazon Berkeley Objects dataset (CC BY 4.0),
// vendored under prisma/seed-data/abo/ so seeding is reproducible without
// re-fetching. These are seeded as source=public: DISPLAY-ONLY / non-purchasable
// ("not sold by Spazio"), with a "View at retailer" outbound link (sourceUrl) and
// CC BY 4.0 attribution. They are excluded from cart/checkout/orders/commission/
// merchant-of-record and from the render-to-purchase metric (that exclusion lives
// in the matching/cart/metric layers). The supplier track is untouched.
// ---------------------------------------------------------------------------

const ABO_SEED_DIR = join(dirname(fileURLToPath(import.meta.url)), "seed-data", "abo");

// Canonical bucket for the CC BY 4.0 images (ADR-027 attribution). The vendored
// JSON carries imagePath (the dataset-internal path); the source image URL is the
// original in the public ABO S3 bucket — recorded so it can propagate into a
// render composited from the image (a derivative work — FR-065, NFR-019, ADR-026).
const ABO_IMAGE_BASE = "https://amazon-berkeley-objects.s3.amazonaws.com/images/original";

interface AboRecord {
  sku: string;
  name: string;
  category: string;
  productType: string;
  brand: string;
  colors: string[];
  materials: string[];
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  sourceName: string;
  sourceUrl: string;
  imageLicense: string;
  imagePath: string;
}

// DEMO reference price by category (COP). Public products are display-only, so the
// price is purely informational — a clearly-synthesized demo estimate, never a
// figure Spazio charges (public items never reach cart/checkout — FR-064).
const PUBLIC_DEMO_PRICE_COP: Record<string, number> = {
  Sofa: 3_500_000,
  Bed: 4_000_000,
  Table: 1_200_000,
  Chair: 1_500_000,
  Ottoman: 800_000,
  Rug: 950_000,
  Lamp: 380_000,
  Bench: 700_000,
};
const PUBLIC_DEMO_PRICE_FALLBACK_COP = 1_000_000;

// Public products carry no supplier warranty; they are not sold by Spazio (ADR-020
// warranty display and BR-18 apply to the supplier track — never surfaced here).
const PUBLIC_WARRANTY = "Display-only public-catalog item — not sold by Spazio (ADR-027).";

/**
 * Seed the ~12 non-swatch ABO products as source=public. Each image is stored in
 * the object storage (the same LocalDiskStorage the server/render worker use) under
 * catalog/public/<sku>.jpg, and Product.photos holds that storage key so the render
 * pipeline resolves it via ObjectStorage.get (fixes the FEAT-005 room-only limit).
 *
 * BR-1 / ADR-014 curator gate BYPASS (documented — ADR-027 §completeness carve-out):
 * public products are NOT Spazio-curated, so they do not pass through the operator
 * catalog_curator / completenessOf() BR-1 gate. They are written directly as
 * completenessStatus=complete + approvalStatus=approved so they are RENDERABLE and
 * DISPLAY-ONLY. This bypass is scoped strictly to source=public; source=supplier
 * SKUs still go through completenessOf() above and operator curation (FR-056..059).
 * Idempotent by sku.
 */
async function seedPublicCatalog(prisma: PrismaClient): Promise<number> {
  const config = loadConfig();
  const storage = new LocalDiskStorage(config.STORAGE_LOCAL_DIR);

  const raw = await readFile(join(ABO_SEED_DIR, "abo_seed.json"), "utf8");
  const records = JSON.parse(raw) as AboRecord[];

  // Fabric swatches are not furniture — exclude them (leaves the ~12 real products).
  const products = records.filter((r) => !/swatch/i.test(r.name));

  let seeded = 0;
  for (const rec of products) {
    // CC BY 4.0 requires attribution: a public product missing required attribution
    // is not seeded (FR-065). sourceImageUrl is derived from the dataset image path.
    const sourceImageUrl = `${ABO_IMAGE_BASE}/${rec.imagePath}`;
    if (!rec.sourceName || !rec.sourceUrl || !rec.imageLicense || !rec.imagePath) {
      console.warn(`Skipping ABO ${rec.sku}: incomplete CC BY attribution (FR-065).`);
      continue;
    }

    // Store the vendored image into object storage; photos holds the storage key.
    const storageKey = `catalog/public/${rec.sku}.jpg`;
    let imageBytes: Buffer;
    try {
      imageBytes = await readFile(join(ABO_SEED_DIR, "img", `${rec.sku}.jpg`));
    } catch {
      console.warn(`Skipping ABO ${rec.sku}: no vendored image file.`);
      continue;
    }
    await storage.put(storageKey, imageBytes, "image/jpeg");

    const data = {
      source: "public" as const,
      supplierId: null,
      name: rec.name,
      category: rec.category,
      photos: [storageKey],
      // Fill demo-safe fallbacks so display and matching have values to work with.
      colors: rec.colors.length > 0 ? rec.colors : ["assorted"],
      materials: rec.materials.length > 0 ? rec.materials : ["mixed materials"],
      // Tag with every demo style so a public product can surface as a fallback
      // regardless of the selected style (matchability — FR-062).
      styleAttributes: STYLES.map((s) => s.code),
      widthCm: rec.widthCm,
      depthCm: rec.depthCm,
      heightCm: rec.heightCm,
      priceCop: PUBLIC_DEMO_PRICE_COP[rec.category] ?? PUBLIC_DEMO_PRICE_FALLBACK_COP,
      // Display-only: no live stock feed (FR-018 carve-out — ADR-027). Classified
      // ready_made purely to satisfy the required enum; never checked out (NFR-015).
      classification: "ready_made" as const,
      stock: null,
      productionLeadTimeDays: null,
      deliveryLeadTimeDays: 0,
      warrantyTerms: PUBLIC_WARRANTY,
      // Curator/BR-1 gate bypass (ADR-027 / ADR-014 carve-out — see fn docstring).
      completenessStatus: "complete" as const,
      approvalStatus: "approved" as const,
      // CC BY 4.0 attribution (ADR-027; FR-063/FR-065).
      sourceName: rec.sourceName,
      sourceUrl: rec.sourceUrl,
      sourceImageUrl,
      imageLicense: rec.imageLicense,
    };

    await prisma.product.upsert({
      where: { sku: rec.sku },
      create: { sku: rec.sku, ...data },
      update: data,
    });
    seeded += 1;
  }
  return seeded;
}

async function main(): Promise<void> {
  loadDotEnv();
  const prisma = new PrismaClient();
  try {
    for (const style of STYLES) {
      await prisma.style.upsert({
        where: { code: style.code },
        create: { code: style.code, name: style.name, description: style.description, status: "active" },
        update: { name: style.name, description: style.description, status: "active" },
      });
    }

    const supplierIds = new Map<string, string>();
    for (const supplier of SUPPLIERS) {
      const existing = await prisma.supplier.findFirst({ where: { name: supplier.name } });
      const row = existing ?? (await prisma.supplier.create({ data: { name: supplier.name } }));
      supplierIds.set(supplier.key, row.id);

      const zone = await prisma.deliveryZone.findFirst({ where: { supplierId: row.id } });
      if (!zone) {
        await prisma.deliveryZone.create({
          data: { supplierId: row.id, name: "Bogota", currency: "COP", active: true },
        });
      }
    }

    for (const product of SEED_PRODUCTS) {
      const completeness = completenessOf(product);
      if (completeness !== "complete") {
        throw new Error(`Seed SKU ${product.sku} fails BR-1 completeness — fix the seed data.`);
      }
      const supplierId = supplierIds.get(product.supplier);
      if (!supplierId) throw new Error(`Unknown supplier key ${product.supplier}`);
      const data = {
        supplierId,
        name: product.name,
        category: product.category,
        photos: product.photos,
        colors: product.colors,
        materials: product.materials,
        styleAttributes: product.styleAttributes,
        widthCm: product.widthCm,
        depthCm: product.depthCm,
        heightCm: product.heightCm,
        priceCop: product.priceCop,
        classification: product.classification,
        stock: product.stock,
        productionLeadTimeDays: product.productionLeadTimeDays,
        deliveryLeadTimeDays: product.deliveryLeadTimeDays,
        warrantyTerms: product.warrantyTerms,
        completenessStatus: completeness,
        approvalStatus: "approved" as const,
      };
      await prisma.product.upsert({
        where: { sku: product.sku },
        create: { sku: product.sku, ...data },
        update: data,
      });
    }

    // Public-catalog bootstrap fallback (FEAT-017 / ADR-027) — seeded AFTER the
    // supplier catalog so the supplier track is fully in place first.
    const publicSeeded = await seedPublicCatalog(prisma);

    console.log(
      `Seeded ${STYLES.length} styles, ${SUPPLIERS.length} suppliers, ${SEED_PRODUCTS.length} supplier SKUs ` +
        `(all BR-1-complete, approved), and ${publicSeeded} source=public ABO products ` +
        `(display-only, CC BY 4.0 — ADR-027).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Run only when executed directly (tests import SEED_PRODUCTS without a DB).
const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  void main();
}
