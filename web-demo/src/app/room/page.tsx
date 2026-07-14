"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROOMS, getRoom } from "@/lib/scenarios";
import { useDemo } from "@/lib/store";

export default function RoomPage() {
  const router = useRouter();
  const { room, setRoom } = useDemo();
  const [selected, setSelected] = useState<string>(room?.id ?? "");
  const [uploaded, setUploaded] = useState(false);
  const [width, setWidth] = useState<string>(
    room ? String(room.widthM) : "4.2",
  );
  const [length, setLength] = useState<string>(
    room ? String(room.lengthM) : "5.0",
  );

  function choose(id: string) {
    setSelected(id);
    setUploaded(false);
    const r = getRoom(id);
    if (r) {
      setWidth(String(r.defaultWidthM));
      setLength(String(r.defaultLengthM));
    }
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // Demo mode: any upload routes to a prepared sample result (living room).
    if (e.target.files && e.target.files.length > 0) {
      setUploaded(true);
      setSelected("living");
    }
  }

  function next() {
    if (!selected) return;
    setRoom({
      id: selected,
      widthM: parseFloat(width) || 4,
      lengthM: parseFloat(length) || 4,
    });
    router.push("/style");
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold text-forest-900">
        Which room are we furnishing?
      </h1>
      <p className="mt-2 max-w-xl text-muted/75">
        Choose a sample room or upload a photo of your own space.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

        {/* Upload card */}
        <label
          className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-sheet ${
            uploaded ? "ring-2 ring-wood" : ""
          }`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-wood/15 text-2xl text-wood-dark">
            ↑
          </span>
          <div>
            <h3 className="font-semibold text-forest-900">Upload a photo</h3>
            <p className="mt-1 text-xs text-muted/70">
              {uploaded
                ? "Photo received — we'll use a prepared sample for this demo."
                : "JPG or PNG of your room"}
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onUpload}
          />
        </label>
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

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={next}
          disabled={!selected}
          className="btn-primary"
        >
          Continue <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
