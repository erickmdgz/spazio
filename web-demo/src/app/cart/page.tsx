"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductSheet } from "@/components/ProductSheet";
import { PRODUCTS, getProduct, getSupplierName } from "@/lib/catalog";
import { formatCop, leadTimeLabel } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function CartPage() {
  const router = useRouter();
  const { cart, budgetCop, removeFromCart, addToCart } = useDemo();
  const [openProduct, setOpenProduct] = useState<string | null>(null);

  const products = useMemo(
    () => cart.map((id) => getProduct(id)).filter((p) => p !== undefined),
    [cart],
  );
  const total = products.reduce((s, p) => s + p.priceCop, 0);
  const withinBudget = total <= budgetCop * 1.1;
  const overBy = total - budgetCop;

  function swap(productId: string) {
    const current = getProduct(productId);
    if (!current) return;
    const alt = PRODUCTS.find(
      (p) => p.category === current.category && !cart.includes(p.id),
    );
    if (!alt) return;
    removeFromCart(productId);
    addToCart(alt.id);
  }

  if (products.length === 0) {
    return (
      <div className="animate-fade-up flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl text-forest-900">
          Your cart is empty
        </h1>
        <p className="mt-2 text-muted/70">
          Add products from your render to continue.
        </p>
        <button
          type="button"
          onClick={() => router.push("/render")}
          className="btn-primary mt-6"
        >
          Back to render
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">Your cart</h1>
      <p className="mt-2 text-muted/70">
        Auto-filled from your render. Remove or swap anything before checkout.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <ul className="flex flex-col gap-3">
          {products.map((p) => {
            const canSwap = PRODUCTS.some(
              (x) => x.category === p.category && !cart.includes(x.id),
            );
            return (
              <li key={p.id} className="card flex gap-4 p-3">
                <button
                  type="button"
                  onClick={() => setOpenProduct(p.id)}
                  className="shrink-0 overflow-hidden rounded-xl"
                  aria-label={`View ${p.name}`}
                >
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-24 w-32 object-cover"
                  />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setOpenProduct(p.id)}
                        className="truncate text-left font-semibold text-forest-900 hover:underline"
                      >
                        {p.name}
                      </button>
                      <p className="text-xs text-muted/70">
                        {getSupplierName(p.supplierId)}
                      </p>
                      <span className="chip mt-1 bg-forest-800/8 text-forest-900">
                        {leadTimeLabel(p.fulfilment, p.leadTimeDays)}
                      </span>
                    </div>
                    <span className="whitespace-nowrap font-serif text-lg text-forest-900">
                      {formatCop(p.priceCop)}
                    </span>
                  </div>
                  <div className="mt-auto flex gap-3 pt-2 text-sm">
                    <button
                      type="button"
                      onClick={() => swap(p.id)}
                      disabled={!canSwap}
                      className="font-medium text-forest-800 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                    >
                      Swap
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(p.id)}
                      className="font-medium text-wood-dark hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-5">
            <h2 className="font-semibold text-forest-900">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted/70">Items</dt>
                <dd className="text-forest-900">{products.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted/70">Budget</dt>
                <dd className="text-forest-900">{formatCop(budgetCop)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-forest-900/10 pt-3">
                <dt className="font-semibold text-forest-900">Total</dt>
                <dd className="font-serif text-xl text-forest-900">
                  {formatCop(total)}
                </dd>
              </div>
            </dl>

            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                withinBudget
                  ? "bg-forest-800/8 text-forest-900"
                  : "bg-wood/15 text-wood-dark"
              }`}
            >
              {withinBudget
                ? overBy <= 0
                  ? `${formatCop(-overBy)} under budget`
                  : "Within budget (10% tolerance)"
                : `${formatCop(overBy)} over budget — still allowed`}
            </div>

            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="btn-primary mt-5 w-full"
            >
              Checkout <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/render")}
              className="btn-secondary mt-2 w-full"
            >
              <span aria-hidden>←</span> Back to render
            </button>
          </div>
        </aside>
      </div>

      <ProductSheet
        productId={openProduct}
        onClose={() => setOpenProduct(null)}
      />
    </div>
  );
}
