"use client";

import { useEffect } from "react";
import { isPublicProduct, type ProductSummary } from "@/lib/api";
import { getProduct, getSupplierName } from "@/lib/catalog";
import { formatCop, leadTimeLabel } from "@/lib/format";
import { useDemo } from "@/lib/store";

// The product detail sheet reads the backend product summary (the source of
// truth for `source` + attribution — ADR-027). Supplier SKUs are enriched with
// the local demo asset (thumbnail/blurb) when available; public ABO products
// (source=public) are display-only: "not sold by Spazio", a "View at retailer"
// outbound link and CC BY 4.0 attribution, and NO add-to-cart affordance
// (FR-063/FR-064/FR-065).
export function ProductSheet({
  product,
  onClose,
}: {
  product: ProductSummary | null;
  onClose: () => void;
}) {
  const { isInCart, cartItemIdFor, removeItem } = useDemo();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (product) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [product, onClose]);

  if (!product) return null;

  const isPublic = isPublicProduct(product);
  // Rich demo visuals only exist for curated supplier SKUs; public ABO items
  // fall back to a category placeholder (their real image lives in object
  // storage, not as a web-demo asset).
  const local = isPublic ? undefined : getProduct(product.sku);

  const category = local?.category ?? product.category;
  const priceCop = local?.priceCop ?? product.priceCop;
  const fulfilment =
    local?.fulfilment ??
    (product.classification === "made_to_order" ? "made-to-order" : "ready-made");
  const leadDays =
    local?.leadTimeDays ??
    (product.classification === "made_to_order"
      ? (product.productionLeadTimeDays ?? product.deliveryLeadTimeDays)
      : product.deliveryLeadTimeDays);
  const madeToOrder = fulfilment === "made-to-order";

  const originLabel = isPublic
    ? (product.attribution?.sourceName ?? "External retailer")
    : local
      ? getSupplierName(local.supplierId)
      : (product.supplierName ?? "Supplier");

  // Retailer link for a public product: the backend serializes it as
  // `outboundUrl` (FR-064); fall back to the attribution sourceUrl (FR-065).
  const retailerUrl = product.outboundUrl ?? product.attribution?.sourceUrl ?? null;

  const inCart = !isPublic && isInCart(product.sku);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-forest-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-md overflow-hidden rounded-t-2xl bg-cream-50 shadow-sheet sm:rounded-2xl"
      >
        <div className="relative">
          {local ? (
            <img
              src={local.thumbnail}
              alt={product.name}
              className="block aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center bg-forest-800/10 text-sm text-forest-900/60">
              {category}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream-50/90 text-forest-900 shadow-card hover:bg-cream-50"
          >
            ✕
          </button>
          {isPublic ? (
            <span className="chip absolute left-3 top-3 bg-forest-900 text-cream-50">
              Not sold by Spazio
            </span>
          ) : (
            madeToOrder && (
              <span className="chip absolute left-3 top-3 bg-wood text-cream-50">
                Made to order
              </span>
            )
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-forest-900">{product.name}</h2>
              <p className="mt-0.5 text-sm text-muted/70">
                {category} · {originLabel}
              </p>
            </div>
            {/* Public products are display-only: the synthesized demo COP price
                is not a retailer price (ADR-027), so hide it here to stay
                consistent with the price-less render tag. */}
            {!isPublic && (
              <span className="whitespace-nowrap font-serif text-xl text-forest-900">
                {formatCop(priceCop)}
              </span>
            )}
          </div>

          {local?.blurb && <p className="mt-3 text-sm text-muted/80">{local.blurb}</p>}

          {!isPublic && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip bg-forest-800/8 text-forest-900">
                {leadTimeLabel(fulfilment, leadDays)}
              </span>
              <span className="chip bg-forest-800/8 text-forest-900">Ships to Bogotá</span>
            </div>
          )}

          {isPublic ? (
            // Display-only bootstrap fallback (ADR-027, FR-062..065): no
            // add-to-cart — an outbound "View at retailer" link + CC BY 4.0
            // attribution instead. Public products are never carted (FR-064).
            <div className="mt-4">
              <p className="rounded-xl bg-forest-800/8 p-3 text-xs text-forest-900/70">
                This is a style suggestion, not a Spazio product. It isn&apos;t sold or fulfilled by
                Spazio and can&apos;t be added to your cart — view it at the original retailer.
              </p>
              {retailerUrl && (
                <a
                  href={retailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-4 flex w-full items-center justify-center"
                >
                  View at retailer <span aria-hidden>↗</span>
                </a>
              )}
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted/60">
                Image
                {product.attribution?.sourceName ? ` from ${product.attribution.sourceName}` : ""},
                licensed under {product.attribution?.imageLicense ?? "CC BY 4.0"}.
              </p>
            </div>
          ) : /* View + remove only: manual add-to-cart is out of the pilot (§0.1#2). */
          inCart ? (
            <button
              type="button"
              onClick={() => {
                const cartItemId = cartItemIdFor(product.sku);
                if (cartItemId) void removeItem(cartItemId).catch(() => {});
                onClose();
              }}
              className="btn-secondary mt-5 w-full"
            >
              Remove from cart
            </button>
          ) : (
            <p className="mt-5 rounded-xl bg-forest-800/8 p-3 text-center text-xs text-forest-900/70">
              Your cart fills automatically from the products in your render.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
