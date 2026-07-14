"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { requestRender } from "@/app/actions";
import { ProductSheet } from "@/components/ProductSheet";
import { formatCop } from "@/lib/format";
import { getScenario, getRoom, getStyle } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

const LOADING_MESSAGES = [
  "Reading your room…",
  "Matching real, in-stock products…",
  "Composing the layout…",
  "Rendering your space…",
];

const POLL_MS = 2500;

type Phase = "loading" | "reviewing" | "rejected" | "ready" | "error";

export default function RenderPage() {
  const router = useRouter();
  const {
    room,
    style,
    renderVisual,
    setRenderVisual,
    renderItems,
    submitRender,
    refreshRender,
    cart,
  } = useDemo();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const startedKey = useRef<string | null>(null);

  // Soft guard.
  useEffect(() => {
    if (!room) router.replace("/room");
    else if (!style) router.replace("/style");
  }, [room, style, router]);

  // Rotate loading messages.
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 900);
    return () => clearInterval(t);
  }, [phase]);

  // Kick off the render: the cached visual (ADR-002 vendor still open) plus the
  // REAL backend job — submit → poll, released only after operator approval
  // (FR-027). Both run together; the operator gate is what the user waits on.
  useEffect(() => {
    if (!room || !style) return;
    const key = `${room.id}:${style.id}`;
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
        setPhase("reviewing");
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
  }, [room, style, submitRender, setRenderVisual]);

  // Poll while the operator reviews (plan §1.1: the poll may legitimately stay
  // pending_review for a while — there is no render SLA, ADR-013).
  useEffect(() => {
    if (phase !== "reviewing") return;
    let stopped = false;
    const tick = async () => {
      try {
        const status = await refreshRender();
        if (stopped) return;
        if (status === "approved") setPhase("ready");
        else if (status === "rejected") setPhase("rejected");
      } catch {
        // Transient poll failure — keep polling; the operator gate is async.
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [phase, refreshRender]);

  const budget = style?.budgetCop ?? 0;
  const cartTotal = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.priceCopSnapshot, 0),
    [cart],
  );
  const withinBudget = cartTotal <= budget * 1.1;

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
        sku: item.product.sku,
        name: item.product.name,
        priceCop: item.priceCopSnapshot,
        xPct: curated?.xPct ?? (item.tagPosition ? item.tagPosition.x * 100 : 50),
        yPct: curated?.yPct ?? (item.tagPosition ? item.tagPosition.y * 100 : 50),
      };
    });
  }, [renderItems, scenario]);

  if (!room || !style) return null;

  if (phase !== "ready") {
    return (
      <div className="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          {(phase === "loading" || phase === "reviewing") && (
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

        {phase === "loading" && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">Generating your render</h1>
            <p className="mt-2 h-5 text-muted/70 transition-all">{LOADING_MESSAGES[msgIndex]}</p>
          </>
        )}

        {phase === "reviewing" && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">
              A Spazio operator is reviewing your render
            </h1>
            <p className="mt-2 max-w-sm text-muted/70">
              Every render is checked by a person before you see it, so what you buy is exactly
              what you saw. This usually takes a few minutes.
            </p>
            <p className="mt-4 max-w-xs text-xs text-muted/50">
              Running locally? Approve it in the operator console at{" "}
              <span className="font-mono">/operator/console</span> on the backend.
            </p>
          </>
        )}

        {phase === "rejected" && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">
              That render didn&apos;t pass review
            </h1>
            <p className="mt-2 max-w-sm text-muted/70">
              Our operator rejected this composition — it happens when the result wouldn&apos;t do
              your room justice. Try again or adjust the style.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  startedKey.current = null;
                  setPhase("loading");
                }}
                className="btn-primary"
              >
                Try again
              </button>
              <button type="button" onClick={() => router.push("/style")} className="btn-secondary">
                Change style
              </button>
            </div>
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

  const image = renderVisual?.renderImage ?? scenario?.renderImage ?? "";

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-forest-900">
            Your furnished {roomName?.toLowerCase()}
          </h1>
          <p className="mt-1 text-muted/70">
            {styleName} · operator-approved · tap a dot to view a real, purchasable product.
          </p>
        </div>
        <span className="chip bg-forest-800/10 text-forest-900">
          {hotspots.length} real {hotspots.length === 1 ? "product" : "products"} matched
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
            onClick={() => setOpenProduct(spot.sku)}
            aria-label={`${spot.name}, ${formatCop(spot.priceCop)}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${spot.xPct}%`, top: `${spot.yPct}%` }}
          >
            <span className="absolute inset-0 -m-1 animate-ping2 rounded-full bg-cream-50/70" />
            <span className="relative grid h-7 w-7 place-items-center rounded-full bg-cream-50 text-xs font-bold text-forest-900 shadow-card ring-2 ring-forest-800 transition group-hover:scale-110">
              {i + 1}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-forest-900 px-2.5 py-1 text-xs text-cream-50 opacity-0 shadow-card transition group-hover:opacity-100 group-focus:opacity-100">
              {spot.name} · {formatCop(spot.priceCop)}
            </span>
          </button>
        ))}
        {hotspots.length === 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-forest-900/80 p-3 text-center text-sm text-cream-50">
            No purchasable products matched this request yet — the curated catalog may still be
            loading. The operator curates SKUs in the console.
          </div>
        )}
      </div>

      {/* Render-to-purchase bar */}
      <div className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted/70">
            {cart?.items.length ?? 0} {(cart?.items.length ?? 0) === 1 ? "item" : "items"} in your
            cart — auto-filled from this render
          </p>
          <p className="font-serif text-2xl text-forest-900">{formatCop(cartTotal)}</p>
          <span
            className={`chip mt-1 ${
              withinBudget ? "bg-forest-800/10 text-forest-900" : "bg-wood/20 text-wood-dark"
            }`}
          >
            {withinBudget ? "Within budget" : `Over budget by ${formatCop(cartTotal - budget)}`}
          </span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/style")} className="btn-secondary">
            <span aria-hidden>←</span> Change style
          </button>
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="btn-primary"
            disabled={(cart?.items.length ?? 0) === 0}
          >
            Review cart <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      <ProductSheet productId={openProduct} onClose={() => setOpenProduct(null)} />
    </div>
  );
}
