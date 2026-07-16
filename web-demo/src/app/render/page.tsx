"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { requestRender } from "@/app/actions";
import { ProductSheet } from "@/components/ProductSheet";
import { fetchRenderImage, isPublicProduct, type ProductSummary } from "@/lib/api";
import { formatCop } from "@/lib/format";
import { getScenario, getRoom, getStyle } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

const LOADING_MESSAGES = [
  "Reading your room…",
  "Placing your selected products…",
  "Composing the layout…",
  "Rendering your space…",
];

const POLL_MS = 2500;

type Phase = "loading" | "generating" | "ready" | "error";

export default function RenderPage() {
  const router = useRouter();
  const {
    room,
    style,
    source,
    selectedProductIds,
    clearSelection,
    renderVisual,
    setRenderVisual,
    renderItems,
    renderId,
    submitRender,
    refreshRender,
    cart,
  } = useDemo();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [openProduct, setOpenProduct] = useState<ProductSummary | null>(null);
  const [backendImageUrl, setBackendImageUrl] = useState<string | null>(null);
  const startedKey = useRef<string | null>(null);

  // Soft guard: this step needs a room, a style, and a furniture selection
  // (ADR-028 — the user curates what gets rendered on /select).
  useEffect(() => {
    if (!room) router.replace("/room");
    else if (!style) router.replace("/style");
    else if (selectedProductIds.length === 0) router.replace("/select");
  }, [room, style, selectedProductIds, router]);

  // Rotate loading messages.
  useEffect(() => {
    if (phase !== "loading" && phase !== "generating") return;
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 900);
    return () => clearInterval(t);
  }, [phase]);

  // Kick off the render: the cached visual (ADR-002 vendor still open) plus the
  // REAL backend job — submit → poll; the render is published to the user
  // immediately on generation success (ADR-025). Both run together; generation
  // is what the user waits on.
  useEffect(() => {
    if (!room || !style || selectedProductIds.length === 0) return;
    // Key on the selection too: picking different furniture (FR-069 iterate)
    // starts a fresh render of exactly those products.
    const key = `${room.id}:${style.id}:${selectedProductIds.join(",")}`;
    if (startedKey.current === key) return;
    startedKey.current = key;
    setPhase("loading");
    setError(null);

    let cancelled = false;
    (async () => {
      try {
        const [visual] = await Promise.all([
          requestRender({
            roomId: room.id,
            styleId: style.id,
            styleNote: style.note,
            budgetCop: style.budgetCop,
            widthM: room.widthM,
            lengthM: room.lengthM,
          }),
          submitRender(),
        ]);
        if (cancelled) return;
        setRenderVisual(visual);
        setPhase("generating");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start the render.");
        setPhase("error");
        startedKey.current = null; // allow retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [room, style, selectedProductIds, submitRender, setRenderVisual]);

  // Poll while the backend generates (the poll may legitimately stay
  // queued/processing for a while — ~2–5 min soft target, no hard render SLA,
  // ADR-013).
  useEffect(() => {
    if (phase !== "generating") return;
    let stopped = false;
    const tick = async () => {
      try {
        const status = await refreshRender();
        if (stopped) return;
        if (status === "completed") setPhase("ready");
        else if (status === "failed") {
          setError("The render could not be generated. Try again or adjust the style.");
          setPhase("error");
        }
      } catch {
        // Transient poll failure — keep polling; generation is async.
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [phase, refreshRender]);

  // Display the REAL backend render once it's ready: an <img> can't send the
  // x-device-token header (NFR-007), so fetch the stored bytes and turn the Blob
  // into an object URL. The cached visual stays as the while-generating
  // placeholder and as the fallback if this fetch fails. Revoke on cleanup.
  useEffect(() => {
    if (phase !== "ready" || !renderId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetchRenderImage(renderId);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBackendImageUrl(objectUrl);
      } catch {
        // Stored render not fetchable yet — keep the cached visual fallback.
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBackendImageUrl(null);
    };
  }, [phase, renderId]);

  const budget = style?.budgetCop ?? 0;
  const cartTotal = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.priceCopSnapshot, 0),
    [cart],
  );
  const withinBudget = cartTotal <= budget * 1.1;
  // Brand (public) selections are display-only: the cart stays empty by design
  // (ADR-027/028) — the user buys via the retailer link on each product.
  const isBrand = source === "public";

  const roomName = room ? getRoom(room.id)?.name : "";
  const styleName = style ? getStyle(style.id)?.name : "";
  const scenario = room && style ? getScenario(room.id, style.id) : null;

  // Hotspot coordinates: prefer the curated scenario position for the same SKU,
  // fall back to the backend tag position (fake pipeline spreads them evenly).
  const hotspots = useMemo(() => {
    return renderItems.map((item) => {
      const curated = scenario?.items.find((s) => s.productId === item.product.sku);
      return {
        key: item.id,
        product: item.product,
        isPublic: isPublicProduct(item.product),
        name: item.product.name,
        priceCop: item.priceCopSnapshot,
        xPct: curated?.xPct ?? (item.tagPosition ? item.tagPosition.x * 100 : 50),
        yPct: curated?.yPct ?? (item.tagPosition ? item.tagPosition.y * 100 : 50),
      };
    });
  }, [renderItems, scenario]);

  if (!room || !style || selectedProductIds.length === 0) return null;

  if (phase !== "ready") {
    return (
      <div className="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          {(phase === "loading" || phase === "generating") && (
            <>
              <span className="absolute inset-0 animate-ping2 rounded-full bg-forest-800/30" />
              <span className="absolute inset-0 animate-pulse2 rounded-full bg-forest-800/15" />
            </>
          )}
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-forest-800 text-cream-50">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"
                stroke="#FAF8F1"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>

        {(phase === "loading" || phase === "generating") && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">Generating your render</h1>
            <p className="mt-2 h-5 text-muted/70 transition-all">{LOADING_MESSAGES[msgIndex]}</p>
            {phase === "generating" && (
              <p className="mt-4 max-w-sm text-xs text-muted/50">
                Your render appears here the moment it&apos;s ready — this usually takes a few
                minutes.
              </p>
            )}
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">We hit a snag</h1>
            <p className="mt-2 max-w-sm text-muted/70">{error}</p>
            <button
              type="button"
              onClick={() => {
                startedKey.current = null;
                setPhase("loading");
              }}
              className="btn-primary mt-6"
            >
              Retry
            </button>
          </>
        )}

        <p className="mt-6 max-w-xs text-xs text-muted/50">
          {roomName} · {styleName}
        </p>
      </div>
    );
  }

  // Prefer the real backend render; fall back to the cached visual / scenario.
  const image = backendImageUrl ?? renderVisual?.renderImage ?? scenario?.renderImage ?? "";

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-forest-900">
            Your furnished {roomName?.toLowerCase()}
          </h1>
          <p className="mt-1 text-muted/70">
            {styleName} · tap a dot to view a product you selected.
          </p>
        </div>
        <span className="chip bg-forest-800/10 text-forest-900">
          {hotspots.length} {hotspots.length === 1 ? "product" : "products"} placed
        </span>
      </div>

      {/* Render with hotspots */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border border-forest-900/10 shadow-card">
        <img
          src={image}
          alt={`${roomName} rendered in ${styleName}`}
          className="block h-auto w-full select-none"
        />
        {hotspots.map((spot, i) => (
          <button
            key={spot.key}
            type="button"
            onClick={() => setOpenProduct(spot.product)}
            aria-label={
              spot.isPublic
                ? `${spot.name}, style suggestion, not sold by Spazio`
                : `${spot.name}, ${formatCop(spot.priceCop)}`
            }
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${spot.xPct}%`, top: `${spot.yPct}%` }}
          >
            <span className="absolute inset-0 -m-1 animate-ping2 rounded-full bg-cream-50/70" />
            <span
              className={`relative grid h-7 w-7 place-items-center rounded-full bg-cream-50 text-xs font-bold text-forest-900 shadow-card ring-2 transition group-hover:scale-110 ${
                spot.isPublic ? "ring-wood" : "ring-forest-800"
              }`}
            >
              {i + 1}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-forest-900 px-2.5 py-1 text-xs text-cream-50 opacity-0 shadow-card transition group-hover:opacity-100 group-focus:opacity-100">
              {spot.isPublic
                ? `${spot.name} · not sold by Spazio`
                : `${spot.name} · ${formatCop(spot.priceCop)}`}
            </span>
          </button>
        ))}
        {hotspots.length === 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-forest-900/80 p-3 text-center text-sm text-cream-50">
            Your selected products couldn&apos;t be placed in this render — try re-rendering or go
            back to pick different furniture.
          </div>
        )}
      </div>

      {/* Like it? bar (ADR-028): keep this selection to cart, or go back to
          browse a different set of furniture with the same photo/source/style. */}
      <div className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-xl text-forest-900">Like what you see?</p>
          {isBrand ? (
            <p className="mt-1 text-sm text-muted/70">
              These are brand products, not sold by Spazio — buy them at their retailer using the
              links here.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted/70">
                {cart?.items.length ?? 0} {(cart?.items.length ?? 0) === 1 ? "item" : "items"} in
                your cart · {formatCop(cartTotal)}
              </p>
              <span
                className={`chip mt-1 ${
                  withinBudget ? "bg-forest-800/10 text-forest-900" : "bg-wood/20 text-wood-dark"
                }`}
              >
                {withinBudget ? "Within budget" : `Over budget by ${formatCop(cartTotal - budget)}`}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              clearSelection();
              router.push("/select");
            }}
            className="btn-secondary"
          >
            <span aria-hidden>←</span> Try other furniture
          </button>
          {isBrand ? (
            // Brand (source=public) is the terminal step: the cart is empty by design
            // (ADR-027/028), so the forward action is buying at the retailer. Surface
            // each selected product's "View at retailer" outbound link directly here
            // instead of a permanently-disabled cart button.
            renderItems
              .filter((it) => isPublicProduct(it.product) && it.product.outboundUrl)
              .map((it) => (
                <a
                  key={it.id}
                  href={it.product.outboundUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  View {it.product.name} at retailer <span aria-hidden>↗</span>
                </a>
              ))
          ) : (
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="btn-primary"
              disabled={(cart?.items.length ?? 0) === 0}
            >
              Love it → Cart <span aria-hidden>→</span>
            </button>
          )}
        </div>
      </div>

      <ProductSheet product={openProduct} onClose={() => setOpenProduct(null)} />
    </div>
  );
}
