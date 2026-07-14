"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BUDGET_DEFAULT,
  BUDGET_MAX,
  BUDGET_MIN,
  STYLES,
} from "@/lib/scenarios";
import { formatCop } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function StylePage() {
  const router = useRouter();
  const { room, style, applyStyle } = useDemo();
  const [selected, setSelected] = useState<string>(style?.id ?? "");
  const [note, setNote] = useState<string>(style?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(
    style?.budgetCop ?? BUDGET_DEFAULT,
  );

  // Soft guard: if the user deep-links here without a room, send them back.
  useEffect(() => {
    if (!room) router.replace("/room");
  }, [room, router]);

  // Persists style + budget on the backend project (FR-007/008/009).
  async function next() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await applyStyle({ id: selected, note: note.trim(), budgetCop: budget });
      router.push("/render");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your style.");
      setSaving(false);
    }
  }

  const pct = ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">
        Pick a style and budget
      </h1>
      <p className="mt-2 max-w-xl text-muted/75">
        We&apos;ll match real, in-stock products to this look, within your
        budget.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {STYLES.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              aria-pressed={active}
              className={`card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-sheet ${
                active ? "ring-2 ring-forest-800" : ""
              }`}
            >
              <div className="flex h-24">
                {s.swatches.map((c) => (
                  <span
                    key={c}
                    className="flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-start justify-between gap-2 p-4">
                <div>
                  <h3 className="font-semibold text-forest-900">{s.name}</h3>
                  <p className="mt-1 text-xs text-muted/70">{s.blurb}</p>
                </div>
                {active && (
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-800 text-xs text-cream-50">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Free-text style note */}
        <div className="card p-5">
          <label htmlFor="note" className="font-semibold text-forest-900">
            Anything specific? <span className="font-normal text-muted/60">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. lots of plants, warm lighting, keep it airy…"
            className="mt-3 w-full resize-none rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
          />
        </div>

        {/* Budget slider */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-forest-900">Budget</span>
            <span className="font-serif text-2xl text-forest-900">
              {formatCop(budget)}
            </span>
          </div>
          <input
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={250_000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            aria-label="Budget in Colombian pesos"
            className="mt-6 w-full accent-forest-800"
            style={{
              background: `linear-gradient(to right, #1E4D3B ${pct}%, rgba(20,52,43,0.12) ${pct}%)`,
              borderRadius: "999px",
              height: "6px",
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-muted/60">
            <span>{formatCop(BUDGET_MIN)}</span>
            <span>{formatCop(BUDGET_MAX)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/room")}
          className="btn-secondary"
        >
          <span aria-hidden>←</span> Back
        </button>
        {error && <p className="self-center text-sm text-wood-dark">{error}</p>}
        <button
          type="button"
          onClick={next}
          disabled={!selected || saving}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Generate render"} <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
