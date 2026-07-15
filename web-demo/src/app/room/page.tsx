"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROOMS, getRoom } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

export default function RoomPage() {
  const router = useRouter();
  const { room, beginRoom } = useDemo();
  const [selected, setSelected] = useState<string>(room?.id ?? "");
  const [uploaded, setUploaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState<string>(
    room ? String(room.widthM) : "4.2",
  );
  const [length, setLength] = useState<string>(
    room ? String(room.lengthM) : "5.0",
  );

  function choose(id: string) {
    setSelected(id);
    setUploaded(false);
    setFile(null);
    const r = getRoom(id);
    if (r) {
      setWidth(String(r.defaultWidthM));
      setLength(String(r.defaultLengthM));
    }
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // Keep the chosen file — its real bytes are uploaded to the backend
    // (FR-005). "upload" is a sentinel id; the render page falls back to a
    // sample visual only while the backend render is still generating.
    const chosen = e.target.files?.[0];
    if (chosen) {
      setFile(chosen);
      setUploaded(true);
      setSelected("upload");
    }
  }

  // Bootstraps the backend project at first input (§0.1#3) with photo + dims.
  async function next() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await beginRoom({
        id: selected,
        widthM: parseFloat(width) || 4,
        lengthM: parseFloat(length) || 4,
        file,
      });
      router.push("/style");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your room.");
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">
        Which room are we furnishing?
      </h1>
      <p className="mt-2 max-w-xl text-muted/75">
        Upload a photo of your room — the AI furnishes your actual space. No photo
        handy? Try the sample below.
      </p>

      {/* Primary action: upload your own room photo. */}
      <label
        className={`card mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition-all hover:-translate-y-0.5 hover:shadow-sheet ${
          uploaded ? "ring-2 ring-forest-800" : ""
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-forest-800/10 text-3xl text-forest-800">
          ↑
        </span>
        <div>
          <h2 className="text-lg font-semibold text-forest-900">
            Upload a photo of your room
          </h2>
          <p className="mt-1 text-sm text-muted/70">
            {uploaded && file
              ? `${file.name} — we'll render your photo.`
              : "JPG, PNG or WebP — this is your actual space."}
          </p>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onUpload}
        />
      </label>

      {/* Secondary: one real sample photo, for when the user has no photo handy. */}
      <div className="mt-6">
        <p className="text-sm font-medium text-muted/75">No photo handy? Try a sample:</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {ROOMS.map((r) => {
            const active = selected === r.id && !uploaded;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => choose(r.id)}
                aria-pressed={active}
                className={`card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-sheet ${
                  active ? "ring-2 ring-forest-800" : ""
                }`}
              >
                <img
                  src={r.thumbnail}
                  alt={`${r.name} — empty`}
                  className="block aspect-[3/2] w-full object-cover"
                />
                <div className="flex items-start justify-between gap-2 p-4">
                  <div>
                    <h3 className="font-semibold text-forest-900">{r.name}</h3>
                    <p className="mt-1 text-xs text-muted/70">{r.blurb}</p>
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
      </div>

      {/* Dimensions */}
      <div className="card mt-6 p-5">
        <h3 className="font-semibold text-forest-900">
          Approximate dimensions
        </h3>
        <p className="mt-1 text-xs text-muted/70">
          Used to scale furniture believably. Rough is fine.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-forest-900/70">
              Width (m)
            </span>
            <input
              type="number"
              step="0.1"
              min="1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-32 rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-forest-900/70">
              Length (m)
            </span>
            <input
              type="number"
              step="0.1"
              min="1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-32 rounded-lg border border-forest-900/15 bg-cream-50 px-3 py-2 text-sm focus:border-forest-800 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-4">
        {error && <p className="text-sm text-wood-dark">{error}</p>}
        <button
          type="button"
          onClick={next}
          disabled={!selected || saving}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Continue"} <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
