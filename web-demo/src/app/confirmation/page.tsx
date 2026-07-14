"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { SUPPLIERS, getProduct } from "@/lib/catalog";
import { formatCop } from "@/lib/format";
import { useDemo } from "@/lib/store";

function estimateDate(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ConfirmationPage() {
  const router = useRouter();
  const { order, reset } = useDemo();

  useEffect(() => {
    if (!order) router.replace("/");
  }, [order, router]);

  const products = useMemo(
    () =>
      order
        ? order.productIds
            .map((id) => getProduct(id))
            .filter((p) => p !== undefined)
        : [],
    [order],
  );

  const total = products.reduce((s, p) => s + p.priceCop, 0);

  const bySupplier = useMemo(() => {
    return SUPPLIERS.map((sup) => ({
      supplier: sup,
      items: products.filter((p) => p.supplierId === sup.id),
    })).filter((g) => g.items.length > 0);
  }, [products]);

  if (!order) return null;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      {/* Success header */}
      <div className="animate-scale-in flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-forest-800 text-cream-50 shadow-card">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.2 4.2L19 7"
              stroke="#FAF8F1"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="mt-5 text-3xl font-semibold text-forest-900">
          Order confirmed
        </h1>
        <p className="mt-2 text-muted/70">
          Thank you. A copy is on its way to{" "}
          <span className="font-medium text-forest-900">
            {order.contact.email}
          </span>
          .
        </p>
        <span className="chip mt-4 bg-forest-800/10 font-semibold text-forest-900">
          Order {order.number}
        </span>
      </div>

      {/* Per-supplier breakdown */}
      <div className="card mt-8 p-5">
        <h2 className="font-semibold text-forest-900">
          Your purchase orders
        </h2>
        <p className="mt-1 text-xs text-muted/60">
          Grouped by supplier · estimated dates per item.
        </p>

        <div className="mt-4 space-y-5">
          {bySupplier.map((g) => (
            <div key={g.supplier.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-forest-900">
                  {g.supplier.name}
                </span>
                <span className="chip bg-forest-800/8 text-forest-900">
                  {g.supplier.city}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-forest-900/10">
                {g.items.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-forest-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted/70">
                        {p.fulfilment === "made-to-order"
                          ? `Made to order · ready by ${estimateDate(order.placedAt, p.leadTimeDays)}`
                          : `Delivery by ${estimateDate(order.placedAt, p.leadTimeDays)}`}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-forest-900">
                      {formatCop(p.priceCop)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between border-t border-forest-900/10 pt-3">
          <span className="font-semibold text-forest-900">Total paid</span>
          <span className="font-serif text-xl text-forest-900">
            {formatCop(total)}
          </span>
        </div>
      </div>

      {/* Operator-in-the-loop note */}
      <div className="mt-4 rounded-2xl bg-forest-800 p-5 text-cream-50">
        <p className="font-serif text-lg">We&apos;ll take it from here</p>
        <p className="mt-1 text-sm text-cream-50/80">
          A Spazio operator forwards each purchase order to its supplier and
          keeps you posted by email and phone. Delivery is within Bogotá.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="btn-secondary"
        >
          Start a new design
        </button>
      </div>
    </div>
  );
}
