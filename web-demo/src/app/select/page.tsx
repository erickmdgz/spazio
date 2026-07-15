"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isPublicProduct, type CatalogProduct } from "@/lib/api";
import { formatCop } from "@/lib/format";
import { getRoom, getStyle } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

// Browse & select the real catalog (ADR-028, FR-066..069). The user picks up to
// 3 real products for their source + style; those exact products are then
// composited into their room on /render (instead of the AI auto-picking).
const MAX_SELECTION = 3;

export default function SelectPage() {
  const router = useRouter();
  const {
    room,
    style,
    source,
    selectedProductIds,
    loadCatalog,
    setSelection,
  } = useDemo();

  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local working selection (product ids), seeded from the store so returning
  // from /render via "Try other furniture" starts clean but a back-nav keeps it.
  const [picked, setPicked] = useState<string[]>(selectedProductIds);

  // Soft guard: this step needs a room + style.
  useEffect(() => {
    if (!room) router.replace("/room");
    else if (!style) router.replace("/style");
  }, [room, style, router]);

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    loadCatalog()
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
        // Drop any prior picks that are no longer in this catalog.
        setPicked((prev) => prev.filter((id) => list.some((p) => p.productId === id)));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the catalog.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  // (Re)load whenever the source or style changes.
  useEffect(() => {
    if (!room || !style) return;
    return fetchCatalog();
  }, [room, style, source, fetchCatalog]);

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_SELECTION) return prev; // hard 3-item cap (ADR-028)
      return [...prev, id];
    });
  }

  const byId = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    (products ?? []).forEach((p) => map.set(p.productId, p));
    return map;
  }, [products]);

  // Budget meter is meaningful only for purchasable (local supplier) picks —
  // public/brand items are display-only and never carted (ADR-027).
  const isLocal = source === "supplier";
  const budget = style?.budgetCop ?? 0;
  const pickedTotal = useMemo(
    () => picked.reduce((sum, id) => sum + (byId.get(id)?.priceCop ?? 0), 0),
    [picked, byId],
  );
  const overBudget = isLocal && pickedTotal > budget * 1.1;
  const budgetPct = budget > 0 ? Math.min(100, (pickedTotal / budget) * 100) : 0;

  const roomName = room ? getRoom(room.id)?.name : "";
  const styleName = style ? getStyle(style.id)?.name : "";

  function renderSelection() {
    if (picked.length === 0) return;
    setSelection(picked);
    router.push("/render");
  }

  if (!room || !style) return null;

  return (
    <div className="animate-fade-up pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-forest-900">Pick your furniture</h1>
          <p className="mt-2 max-w-xl text-muted/75">
            Choose up to {MAX_SELECTION} real products to place in your {roomName?.toLowerCase()}.
            We&apos;ll render exactly what you pick.
          </p>
        </div>
        <span className="chip bg-forest-800/10 text-forest-900">
          {source === "supplier" ? "Local suppliers" : "Brand suppliers"} · {styleName}
        </span>
      </div>

      {loading && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[4/3] w-full animate-pulse bg-forest-800/10" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-forest-800/10" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-forest-800/10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="mt-10 flex flex-col items-center text-center">
          <p className="max-w-sm text-muted/70">{error}</p>
          <button type="button" onClick={fetchCatalog} className="btn-primary mt-6">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && products && products.length === 0 && (
        <div className="mt-10 flex flex-col items-center text-center">
          <h2 className="font-serif text-2xl text-forest-900">Nothing to show yet</h2>
          <p className="mt-2 max-w-sm text-muted/70">
            No approved products match this style and source yet. Try another style or source.
          </p>
          <button type="button" onClick={() => router.push("/style")} className="btn-secondary mt-6">
            <span aria-hidden>←</span> Change style
          </button>
        </div>
      )}

      {!loading && !error && products && products.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const isPublic = isPublicProduct(p);
            const active = picked.includes(p.productId);
            const atCap = !active && picked.length >= MAX_SELECTION;
            const retailerUrl = p.outboundUrl ?? p.attribution?.sourceUrl ?? null;
            return (
              <div
                key={p.productId}
                className={`card flex flex-col overflow-hidden transition-all ${
                  active ? "ring-2 ring-forest-800" : ""
                } ${atCap ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(p.productId)}
                  disabled={atCap}
                  aria-pressed={active}
                  className="relative block text-left disabled:cursor-not-allowed"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="block aspect-[4/3] w-full object-cover"
                  />
                  {isPublic && (
                    <span className="chip absolute left-3 top-3 bg-forest-900 text-cream-50">
                      Not sold by Spazio
                    </span>
                  )}
                  <span
                    className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold shadow-card transition ${
                      active
                        ? "bg-forest-800 text-cream-50"
                        : "bg-cream-50/90 text-forest-900/50"
                    }`}
                    aria-hidden
                  >
                    {active ? "✓" : "+"}
                  </span>
                </button>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(p.productId)}
                      disabled={atCap}
                      className="text-left font-semibold text-forest-900 disabled:cursor-not-allowed"
                    >
                      {p.name}
                    </button>
                    {/* Public prices are synthesized, not retailer prices (ADR-027) — hide. */}
                    {!isPublic && (
                      <span className="whitespace-nowrap font-serif text-lg text-forest-900">
                        {formatCop(p.priceCop)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted/70">{p.category}</p>

                  {isPublic && (
                    <div className="mt-3 text-xs text-muted/70">
                      {retailerUrl && (
                        <a
                          href={retailerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-forest-900 hover:underline"
                        >
                          View at retailer <span aria-hidden>↗</span>
                        </a>
                      )}
                      <p className="mt-1 text-[11px] leading-relaxed text-muted/55">
                        Image
                        {p.attribution?.sourceName ? ` from ${p.attribution.sourceName}` : ""},
                        licensed under {p.attribution?.imageLicense ?? "CC BY 4.0"}.
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => toggle(p.productId)}
                      disabled={atCap}
                      className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? "bg-forest-800 text-cream-50"
                          : "bg-forest-800/10 text-forest-900 hover:bg-forest-800/15"
                      }`}
                    >
                      {active ? "Selected ✓" : atCap ? "Pick limit reached" : "Add to render"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky selection bar: counter, budget meter (local only), primary action. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-forest-900/10 bg-cream-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forest-900">
              {picked.length}/{MAX_SELECTION} selected
            </p>
            {isLocal && picked.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-forest-900/10">
                  <span
                    className={`block h-full rounded-full ${overBudget ? "bg-wood" : "bg-forest-800"}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </span>
                <span className={`text-xs ${overBudget ? "text-wood-dark" : "text-muted/70"}`}>
                  {formatCop(pickedTotal)} / {formatCop(budget)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/style")} className="btn-secondary">
              <span aria-hidden>←</span> Back
            </button>
            <button
              type="button"
              onClick={renderSelection}
              disabled={picked.length === 0}
              className="btn-primary"
            >
              Render these ({picked.length}) <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
