"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SUPPLIERS, getProduct } from "@/lib/catalog";
import { formatCop } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, placeOrder } = useDemo();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (cart.length === 0) router.replace("/cart");
  }, [cart, router]);

  const products = useMemo(
    () => cart.map((id) => getProduct(id)).filter((p) => p !== undefined),
    [cart],
  );
  const total = products.reduce((s, p) => s + p.priceCop, 0);

  // One purchase order per supplier — a nod to the fulfilment model.
  const bySupplier = useMemo(() => {
    return SUPPLIERS.map((sup) => {
      const items = products.filter((p) => p.supplierId === sup.id);
      const subtotal = items.reduce((s, p) => s + p.priceCop, 0);
      return { supplier: sup, items, subtotal };
    }).filter((g) => g.items.length > 0);
  }, [products]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const formOk = emailOk && phone.trim().length >= 7 && address.trim().length >= 6;

  function pay() {
    if (!formOk || processing) return;
    setProcessing(true);
    // Mock payment — no real gateway. Simulate a brief capture then confirm.
    setTimeout(() => {
      placeOrder({
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      router.push("/confirmation");
    }, 1900);
  }

  if (cart.length === 0) return null;

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">Checkout</h1>
      <p className="mt-2 text-muted/70">
        No account needed — just where to send it. Payment is simulated for this
        demo.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Contact */}
        <div className="card p-5">
          <h2 className="font-semibold text-forest-900">Contact & shipping</h2>
          <div className="mt-4 grid gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-forest-900/70">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="valentina@example.com"
                autoComplete="email"
                className="rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-forest-900/70">
                Phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                autoComplete="tel"
                className="rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-forest-900/70">
                Shipping address (Bogotá)
              </span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Calle 00 # 00-00, Chapinero, Bogotá"
                autoComplete="street-address"
                className="resize-none rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Order summary grouped by supplier */}
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-5">
            <h2 className="font-semibold text-forest-900">Order summary</h2>
            <p className="mt-1 text-xs text-muted/60">
              One purchase order per supplier.
            </p>

            <div className="mt-4 space-y-4">
              {bySupplier.map((g) => (
                <div key={g.supplier.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-forest-900">
                      {g.supplier.name}
                    </span>
                    <span className="chip bg-forest-800/8 text-forest-900">
                      PO · {g.items.length}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {g.items.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between gap-2 text-sm text-muted/80"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="whitespace-nowrap">
                          {formatCop(p.priceCop)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex justify-between border-t border-forest-900/10 pt-1 text-xs text-forest-900/60">
                    <span>Subtotal</span>
                    <span>{formatCop(g.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between border-t border-forest-900/10 pt-3">
              <span className="font-semibold text-forest-900">Total</span>
              <span className="font-serif text-xl text-forest-900">
                {formatCop(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={pay}
              disabled={!formOk || processing}
              className="btn-primary mt-5 w-full"
            >
              {processing ? (
                <>
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-cream-50/40 border-t-cream-50"
                  />
                  Processing…
                </>
              ) : (
                <>Pay {formatCop(total)}</>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted/50">
              Mock payment · no card is charged
            </p>
            {!formOk && (
              <p className="mt-2 text-center text-[11px] text-wood-dark">
                Enter a valid email, phone and address to pay.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
