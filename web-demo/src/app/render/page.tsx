"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { requestRender } from "@/app/actions";
import { ProductSheet } from "@/components/ProductSheet";
import {
  ApiError,
  cancelRender,
  fetchRenderImage,
  isPublicProduct,
  type ProductSummary,
} from "@/lib/api";
import { formatCop } from "@/lib/format";
import type { RenderResult } from "@/lib/render/types";
import { getScenario, getRoom, getStyle } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

const LOADING_MESSAGES = [
  "Reading your room…",
  "Placing your selected products…",
  "Composing the layout…",
  "Rendering your space…",
];

const POLL_MS = 2500;

// Client backstop timeout (BUG-002): a bit above the backend RENDER_TIMEOUT_MS
// hard cap (default 15 min, BUG-004 — a real 3-reference render measures ~10 min
// on the M2 host) so the backend normally fails first and polling sees 'failed'.
// If that signal never arrives (e.g. the backend is unreachable), this still
// moves the UI to the failed screen rather than spinning forever.
const CLIENT_TIMEOUT_MS = 930_000; // 15.5 min

// Backstop for the brief 'loading' (submit/enqueue) phase (BUG-003): the enqueue
// is one fast HTTP round-trip, so a minute without an answer means it stalled —
// fail visibly instead of spinning (the spinner looks identical to 'generating').
const START_TIMEOUT_MS = 60_000;

// Seconds after which the failed screen auto-returns the user to /select so they
// can adjust their picks and retry (their photo + source + style are kept).
const REDIRECT_MS = 5_000;

const FAILED_MESSAGE =
  "It took too long or the engine ran out of memory — returning you to your selection so you can try again.";

const START_FAILED_MESSAGE =
  "Starting the render took too long — returning you to your selection so you can try again.";

/** mm:ss for the elapsed-time readout while generating. */
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "loading" | "generating" | "ready" | "error";

export default function RenderPage() {
  const router = useRouter();
  const {
    hydrated,
    room,
    style,
    source,
    selectedProductIds,
    clearSelection,
    renderVisual,
    setRenderVisual,
    renderItems,
    renderId,
    renderKey,
    submitRender,
    resetRender,
    refreshRender,
    cart,
  } = useDemo();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [openProduct, setOpenProduct] = useState<ProductSummary | null>(null);
  const [backendImageUrl, setBackendImageUrl] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedKey = useRef<string | null>(null);
  // The in-flight kickoff, shared across effect re-runs (BUG-003 — see below).
  const kickoffRef = useRef<Promise<RenderResult | null> | null>(null);

  // Live mirrors of phase + renderId so the unmount cleanup (empty-deps effect)
  // can cancel a still-running backend render without capturing stale values.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const renderIdRef = useRef(renderId);
  renderIdRef.current = renderId;

  // Soft guard: this step needs a room, a style, and a furniture selection
  // (ADR-028 — the user curates what gets rendered on /select). Waits for the
  // sessionStorage rehydration (BUG-003): before it, the store is still empty
  // and a legitimate reload would bounce to /room.
  useEffect(() => {
    if (!hydrated) return;
    if (!room) router.replace("/room");
    else if (!style) router.replace("/style");
    else if (selectedProductIds.length === 0) router.replace("/select");
  }, [hydrated, room, style, selectedProductIds, router]);

  // Rotate loading messages.
  useEffect(() => {
    if (phase !== "loading" && phase !== "generating") return;
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 900);
    return () => clearInterval(t);
  }, [phase]);

  // Kick off the render: the cached visual (fallback imagery) plus the REAL
  // backend job — submit → poll; the render is published to the user
  // immediately on generation success (ADR-025). Generation is what the user
  // waits on.
  //
  // Strict-Mode-safe (BUG-003): the kickoff promise is started at most ONCE per
  // photo+style+selection key and lives in a ref; every effect run re-attaches
  // to that same promise. The previous shape started the async work inside the
  // effect and gated its state updates on a per-run `cancelled` flag — under
  // React Strict Mode's dev remount, the first run's cleanup cancelled the only
  // run (the ref guard blocked the second), so setPhase("generating") was
  // silently discarded and the page spun on the loading screen forever while
  // the backend render completed unseen.
  useEffect(() => {
    if (!hydrated || !room || !style || selectedProductIds.length === 0) return;
    // Key on the selection too: picking different furniture (FR-069 iterate)
    // starts a fresh render of exactly those products.
    const key = `${room.id}:${style.id}:${selectedProductIds.join(",")}`;

    if (startedKey.current !== key) {
      startedKey.current = key;
      setPhase("loading");
      setError(null);
      const visualInput = {
        roomId: room.id,
        styleId: style.id,
        styleNote: style.note,
        budgetCop: style.budgetCop,
        widthM: room.widthM,
        lengthM: room.lengthM,
      };
      // Resume (BUG-003): a render for this exact key was already submitted —
      // the page reloaded while it generated (or after it completed) — so poll
      // the existing render instead of submitting a duplicate. Only the
      // fallback visual is re-requested, and it must never block the resume.
      kickoffRef.current =
        renderKey === key && renderId
          ? requestRender(visualInput).catch(() => null)
          : (async () => {
              const [visual] = await Promise.all([requestRender(visualInput), submitRender()]);
              return visual;
            })();
    }

    let cancelled = false;
    kickoffRef.current
      ?.then((visual) => {
        if (cancelled) return;
        if (visual) setRenderVisual(visual);
        // Only advance out of 'loading' — a re-attached run (deps changed after
        // the promise settled) must never pull an 'error' or 'ready' page back.
        setPhase((p) => (p === "loading" ? "generating" : p));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start the render.");
        setPhase("error");
        startedKey.current = null; // allow retry
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, room, style, selectedProductIds, renderKey, renderId, submitRender, setRenderVisual]);

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
          setError(FAILED_MESSAGE);
          setPhase("error");
        }
      } catch (e) {
        if (stopped) return;
        // A vanished render (404 — e.g. resuming after a backend/DB reset) can
        // never complete: fail now instead of polling out the full backstop.
        if (e instanceof ApiError && e.status === 404) {
          setError(FAILED_MESSAGE);
          setPhase("error");
        }
        // Anything else is transient — keep polling; generation is async.
      }
    };
    void tick();
    const t = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [phase, refreshRender]);

  // Elapsed timer (mm:ss) while generating — reassures the user the render is
  // still working and sets expectations against the multi-minute render time.
  useEffect(() => {
    if (phase !== "generating") {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Client backstop timeouts (BUG-002/BUG-003): NO phase may spin forever —
  // 'generating' is capped just above the backend hard timeout, and 'loading'
  // (the fast submit/enqueue round-trip) is capped at a minute. The primary
  // failure path stays the poll seeing status 'failed' (backend timeout/kill);
  // these only catch a dead backend or a stalled kickoff.
  useEffect(() => {
    if (phase !== "loading" && phase !== "generating") return;
    const stalled = phase === "loading";
    const t = setTimeout(
      () => {
        setError(stalled ? START_FAILED_MESSAGE : FAILED_MESSAGE);
        setPhase("error");
      },
      stalled ? START_TIMEOUT_MS : CLIENT_TIMEOUT_MS,
    );
    return () => clearTimeout(t);
  }, [phase]);

  // On the failed screen (BUG-002): stop any lingering backend render now
  // (best-effort cancel), then auto-return to /select after a few seconds so the
  // user can adjust their picks and retry — their photo + source + style are
  // kept. resetRender() forgets the dead render so re-rendering the SAME
  // selection submits a fresh job instead of resuming the failed one (BUG-003).
  // renderId is read via ref so the reset doesn't re-trigger this effect.
  useEffect(() => {
    if (phase !== "error") return;
    const failedRenderId = renderIdRef.current;
    if (failedRenderId) cancelRender(failedRenderId);
    const t = setTimeout(() => {
      resetRender();
      router.push("/select");
    }, REDIRECT_MS);
    return () => clearTimeout(t);
  }, [phase, router, resetRender]);

  // Cancel on leave (BUG-002): if the user navigates away while a render is
  // still generating, tell the backend to stop it now (keepalive fetch) rather
  // than waiting for the hard-timeout cap to free the memory.
  useEffect(() => {
    return () => {
      if (phaseRef.current === "generating" && renderIdRef.current) {
        cancelRender(renderIdRef.current);
      }
    };
  }, []);

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

  // Render nothing until rehydration lands (BUG-003) — the guard above decides
  // where to go once the persisted state is known.
  if (!hydrated || !room || !style || selectedProductIds.length === 0) return null;

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
              <>
                <p
                  className="mt-3 font-mono text-sm tabular-nums text-muted/60"
                  aria-label="Time elapsed"
                >
                  {formatElapsed(elapsedSec)}
                </p>
                <p className="mt-4 max-w-sm text-xs text-muted/50">
                  Your render appears here the moment it&apos;s ready — this usually takes a few
                  minutes.
                </p>
              </>
            )}
          </>
        )}

        {phase === "error" && (
          <>
            <h1 className="mt-8 font-serif text-2xl text-forest-900">
              This render didn&apos;t finish
            </h1>
            <p className="mt-2 max-w-sm text-muted/70">{error ?? FAILED_MESSAGE}</p>
            <button
              type="button"
              onClick={() => {
                resetRender();
                router.push("/select");
              }}
              className="btn-primary mt-6"
            >
              Try again
            </button>
            <p className="mt-4 text-xs text-muted/50">Returning in a few seconds…</p>
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
              // Iterating (FR-069) means a NEW render next time — forget this
              // one so an identical re-pick doesn't just resume it (BUG-003).
              resetRender();
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
