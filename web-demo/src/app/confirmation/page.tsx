"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getOrder, type BackendOrder } from "@/lib/api";
import { formatCop } from "@/lib/format";
import { useDemo } from "@/lib/store";

function estimateDate(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

// Confirmation reads the REAL order (FR-047 minimal): totals and purchase
// orders come from the backend; per-item dates from the supplier lead times.
export default function ConfirmationPage() {
  const router = useRouter();
  const { order, reset } = useDemo();
  const [backendOrder, setBackendOrder] = useState<BackendOrder | null>(null);

  useEffect(() => {
    if (!order) router.replace("/");
  }, [order, router]);

  useEffect(() => {
    if (!order) return;
    getOrder(order.orderId)
      .then(setBackendOrder)
      .catch(() => {
        // The local snapshot still renders the page; the PO list just stays hidden.
      });
  }, [order]);

  const bySupplier = useMemo(() => {
    if (!order) return [];
    const groups = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const name = item.product.supplierName ?? "Supplier";
      groups.set(name, [...(groups.get(name) ?? []), item]);
    }
    return Array.from(groups, ([supplierName, items]) => ({ supplierName, items }));
  }, [order]);

  if (!order) return null;

  const orderNumber = `SPZ-${order.orderId.slice(0, 8).toUpperCase()}`;

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
        <h1 className="mt-5 text-3xl font-semibold text-forest-900">Order confirmed</h1>
        <p className="mt-2 text-muted/70">
          Thank you. A copy is on its way to{" "}
          <span className="font-medium text-forest-900">{order.contact.email}</span>.
        </p>
        <span className="chip mt-4 bg-forest-800/10 font-semibold text-forest-900">
          Order {orderNumber}
        </span>
        <span className="chip mt-2 bg-forest-800/8 text-forest-900">
          Payment {order.payment.status} · ref {order.payment.reference}
        </span>
      </div>

      {/* Per-supplier breakdown */}
      <div className="card mt-8 p-5">
        <h2 className="font-semibold text-forest-900">Your purchase orders</h2>
        <p className="mt-1 text-xs text-muted/60">
          Grouped by supplier · estimated dates per item
          {backendOrder ? ` · ${backendOrder.purchaseOrders.length} PO(s) recorded` : ""}.
        </p>

        <div className="mt-4 space-y-5">
          {bySupplier.map((group) => (
            <div key={group.supplierName}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-forest-900">{group.supplierName}</span>
                <span className="chip bg-forest-800/8 text-forest-900">Bogotá</span>
              </div>
              <ul className="mt-2 divide-y divide-forest-900/10">
                {group.items.map((item) => {
                  const madeToOrder = item.product.classification === "made_to_order";
                  const days = madeToOrder
                    ? (item.product.productionLeadTimeDays ?? item.product.deliveryLeadTimeDays)
                    : item.product.deliveryLeadTimeDays;
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-forest-900">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted/70">
                          {madeToOrder
                            ? `Made to order · ready by ${estimateDate(order.placedAt, days)}`
                            : `Delivery by ${estimateDate(order.placedAt, days)}`}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm text-forest-900">
                        {formatCop(item.priceCopSnapshot)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between border-t border-forest-900/10 pt-3">
          <span className="font-semibold text-forest-900">Total paid</span>
          <span className="font-serif text-xl text-forest-900">{formatCop(order.totalCop)}</span>
        </div>
      </div>

      {/* Operator-in-the-loop note */}
      <div className="mt-4 rounded-2xl bg-forest-800 p-5 text-cream-50">
        <p className="font-serif text-lg">We&apos;ll take it from here</p>
        <p className="mt-1 text-sm text-cream-50/80">
          A Spazio operator forwards each purchase order to its supplier and keeps you posted by
          email and phone. Delivery is within Bogotá.
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
