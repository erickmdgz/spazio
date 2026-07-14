"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductSheet } from "@/components/ProductSheet";
import { getProduct } from "@/lib/catalog";
import { formatCop, leadTimeLabel } from "@/lib/format";
import { useDemo } from "@/lib/store";

// The cart is the backend's — auto-populated from the operator-approved render
// (FR-031). Review + remove only: manual add is out of the pilot (§0.1#2) and
// swap (FR-034) is deferred.
export default function CartPage() {
  const router = useRouter();
  const { cart, budgetCop, reloadCart, removeItem } = useDemo();
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reloadCart().catch(() => {
      // Keep whatever we have; the page shows the empty state if nothing loads.
    });
  }, [reloadCart]);

  const items = cart?.items ?? [];
  const total = items.reduce((s, item) => s + item.priceCopSnapshot, 0);
  const withinBudget = total <= budgetCop * 1.1;
  const overBy = total - budgetCop;

  async function remove(cartItemId: string) {
    setBusyItem(cartItemId);
    setError(null);
    try {
      await removeItem(cartItemId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the item.");
    } finally {
      setBusyItem(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-up flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl text-forest-900">Your cart is empty</h1>
        <p className="mt-2 text-muted/70">
          The cart fills automatically once an operator approves your render.
        </p>
        <button type="button" onClick={() => router.push("/render")} className="btn-primary mt-6">
          Back to render
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">Your cart</h1>
      <p className="mt-2 text-muted/70">
        Auto-filled from your operator-approved render. Remove anything before checkout.
      </p>
      {error && <p className="mt-2 text-sm text-wood-dark">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const local = getProduct(item.product.sku);
            const fulfilment =
              item.product.classification === "made_to_order" ? "made-to-order" : "ready-made";
            const leadDays =
              item.product.classification === "made_to_order"
                ? (item.product.productionLeadTimeDays ?? item.product.deliveryLeadTimeDays)
                : item.product.deliveryLeadTimeDays;
            return (
              <li key={item.id} className="card flex gap-4 p-3">
                <button
                  type="button"
                  onClick={() => setOpenProduct(item.product.sku)}
                  className="shrink-0 overflow-hidden rounded-xl"
                  aria-label={`View ${item.product.name}`}
                >
                  {local ? (
                    <img
                      src={local.thumbnail}
                      alt={item.product.name}
                      className="h-24 w-32 object-cover"
                    />
                  ) : (
                    <span className="grid h-24 w-32 place-items-center bg-forest-800/10 text-xs text-forest-900/60">
                      {item.product.category}
                    </span>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setOpenProduct(item.product.sku)}
                        className="truncate text-left font-semibold text-forest-900 hover:underline"
                      >
                        {item.product.name}
                      </button>
                      <p className="text-xs text-muted/70">{item.product.supplierName}</p>
                      <span className="chip mt-1 bg-forest-800/8 text-forest-900">
                        {leadTimeLabel(fulfilment, leadDays)}
                      </span>
                    </div>
                    <span className="whitespace-nowrap font-serif text-lg text-forest-900">
                      {formatCop(item.priceCopSnapshot)}
                    </span>
                  </div>
                  <div className="mt-auto flex gap-3 pt-2 text-sm">
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={busyItem === item.id}
                      className="font-medium text-wood-dark hover:underline disabled:opacity-40"
                    >
                      {busyItem === item.id ? "Removing…" : "Remove"}
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
                <dd className="text-forest-900">{items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted/70">Budget</dt>
                <dd className="text-forest-900">{formatCop(budgetCop)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-forest-900/10 pt-3">
                <dt className="font-semibold text-forest-900">Total</dt>
                <dd className="font-serif text-xl text-forest-900">{formatCop(total)}</dd>
              </div>
            </dl>

            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                withinBudget ? "bg-forest-800/8 text-forest-900" : "bg-wood/15 text-wood-dark"
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

      <ProductSheet productId={openProduct} onClose={() => setOpenProduct(null)} />
    </div>
  );
}
