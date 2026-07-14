"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { requestRender } from "@/app/actions";
import { ProductSheet } from "@/components/ProductSheet";
import { getProduct } from "@/lib/catalog";
import { formatCop } from "@/lib/format";
import { getScenario, getRoom, getStyle } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

const LOADING_MESSAGES = [
  "Reading your room…",
  "Matching real, in-stock products…",
  "Composing the layout…",
  "Rendering your space…",
];

export default function RenderPage() {
  const router = useRouter();
  const { room, style, render, setRender, cart } = useDemo();
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [msgIndex, setMsgIndex] = useState(0);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const generatedKey = useRef<string | null>(null);

  // Soft guard.
  useEffect(() => {
    if (!room) router.replace("/room");
    else if (!style) router.replace("/style");
  }, [room, style, router]);

  // Rotate loading messages.
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(
      () => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      900,
    );
    return () => clearInterval(t);
  }, [phase]);

  // Generate (or reuse) the render for the current room + style.
  useEffect(() => {
    if (!room || !style) return;
    const key = `${room.id}:${style.id}`;
    if (generatedKey.current === key) return;

    const expected = getScenario(room.id, style.id).renderImage;
    if (render && render.renderImage === expected) {
      generatedKey.current = key;
      setPhase("ready");
      return;
    }

    generatedKey.current = key;
    setPhase("loading");
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 2200 + Math.random() * 1400));

    (async () => {
      try {
        const [res] = await Promise.all([
          requestRender({
            roomId: room.id,
            styleId: style.id,
            styleNote: style.note,
            budgetCop: style.budgetCop,
            widthM: room.widthM,
            lengthM: room.lengthM,
          }),
          minDelay,
        ]);
        if (cancelled) return;
        setRender(res);
        setPhase("ready");
      } catch {
        // requestRender already falls back internally; this is belt-and-braces.
        if (!cancelled) setPhase("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [room, style, render, setRender]);

  const budget = style?.budgetCop ?? 0;
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, id) => sum + (getProduct(id)?.priceCop ?? 0), 0),
    [cart],
  );
  const withinBudget = cartTotal <= budget * 1.1;

  const roomName = room ? getRoom(room.id)?.name : "";
  const styleName = style ? getStyle(style.id)?.name : "";

  if (!room || !style) return null;

  if (phase === "loading") {
    return (
      <div className="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 animate-ping2 rounded-full bg-forest-800/30" />
          <span className="absolute inset-0 animate-pulse2 rounded-full bg-forest-800/15" />
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
        <h1 className="mt-8 font-serif text-2xl text-forest-900">
          Generating your render
        </h1>
        <p className="mt-2 h-5 text-muted/70 transition-all">
          {LOADING_MESSAGES[msgIndex]}
        </p>
        <p className="mt-6 max-w-xs text-xs text-muted/50">
          {roomName} · {styleName}
        </p>
      </div>
    );
  }

  const scenario = getScenario(room.id, style.id);
  const image = render?.renderImage ?? scenario.renderImage;
  const items = render?.items ?? scenario.items;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-forest-900">
            Your furnished {roomName?.toLowerCase()}
          </h1>
          <p className="mt-1 text-muted/70">
            {styleName} · tap a dot to view a real, purchasable product.
          </p>
        </div>
        <span
          className={`chip ${
            render?.source === "openai"
              ? "bg-forest-800 text-cream-50"
              : "bg-forest-800/10 text-forest-900"
          }`}
        >
          {render?.source === "openai" ? "Live AI render" : "Sample render"}
        </span>
      </div>

      {/* Render with hotspots */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border border-forest-900/10 shadow-card">
        <img
          src={image}
          alt={`${roomName} rendered in ${styleName}`}
          className="block h-auto w-full select-none"
        />
        {items.map((item, i) => {
          const p = getProduct(item.productId);
          if (!p) return null;
          return (
            <button
              key={item.productId}
              type="button"
              onClick={() => setOpenProduct(item.productId)}
              aria-label={`${p.name}, ${formatCop(p.priceCop)}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${item.xPct}%`, top: `${item.yPct}%` }}
            >
              <span className="absolute inset-0 -m-1 animate-ping2 rounded-full bg-cream-50/70" />
              <span className="relative grid h-7 w-7 place-items-center rounded-full bg-cream-50 text-xs font-bold text-forest-900 shadow-card ring-2 ring-forest-800 transition group-hover:scale-110">
                {i + 1}
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-forest-900 px-2.5 py-1 text-xs text-cream-50 opacity-0 shadow-card transition group-hover:opacity-100 group-focus:opacity-100">
                {p.name} · {formatCop(p.priceCop)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render-to-purchase bar */}
      <div className="card mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted/70">
            {cart.length} {cart.length === 1 ? "item" : "items"} in your cart
          </p>
          <p className="font-serif text-2xl text-forest-900">
            {formatCop(cartTotal)}
          </p>
          <span
            className={`chip mt-1 ${
              withinBudget
                ? "bg-forest-800/10 text-forest-900"
                : "bg-wood/20 text-wood-dark"
            }`}
          >
            {withinBudget
              ? "Within budget"
              : `Over budget by ${formatCop(cartTotal - budget)}`}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/style")}
            className="btn-secondary"
          >
            <span aria-hidden>←</span> Change style
          </button>
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="btn-primary"
          >
            Review cart <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      <ProductSheet
        productId={openProduct}
        onClose={() => setOpenProduct(null)}
      />
    </div>
  );
}
