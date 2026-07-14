"use client";

import { useEffect } from "react";
import { getProduct, getSupplierName } from "@/lib/catalog";
import { formatCop, leadTimeLabel } from "@/lib/format";
import { useDemo } from "@/lib/store";

export function ProductSheet({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const { isInCart, toggleCart } = useDemo();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (productId) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [productId, onClose]);

  if (!productId) return null;
  const product = getProduct(productId);
  if (!product) return null;

  const inCart = isInCart(product.id);
  const madeToOrder = product.fulfilment === "made-to-order";

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
          <img
            src={product.thumbnail}
            alt={product.name}
            className="block aspect-[4/3] w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream-50/90 text-forest-900 shadow-card hover:bg-cream-50"
          >
            ✕
          </button>
          {madeToOrder && (
            <span className="chip absolute left-3 top-3 bg-wood text-cream-50">
              Made to order
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-forest-900">
                {product.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted/70">
                {product.category} · {getSupplierName(product.supplierId)}
              </p>
            </div>
            <span className="whitespace-nowrap font-serif text-xl text-forest-900">
              {formatCop(product.priceCop)}
            </span>
          </div>

          <p className="mt-3 text-sm text-muted/80">{product.blurb}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip bg-forest-800/8 text-forest-900">
              {leadTimeLabel(product.fulfilment, product.leadTimeDays)}
            </span>
            <span className="chip bg-forest-800/8 text-forest-900">
              Ships to Bogotá
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleCart(product.id)}
            className={inCart ? "btn-secondary mt-5 w-full" : "btn-primary mt-5 w-full"}
          >
            {inCart ? "Remove from cart" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
