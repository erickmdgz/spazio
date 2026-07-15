"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Room", path: "/room" },
  { label: "Style", path: "/style" },
  { label: "Select", path: "/select" },
  { label: "Render", path: "/render" },
  { label: "Cart", path: "/cart" },
  { label: "Checkout", path: "/checkout" },
  { label: "Done", path: "/confirmation" },
];

export function Stepper() {
  const pathname = usePathname();
  const active = STEPS.findIndex((s) => s.path === pathname);
  if (active === -1) return null;

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="mx-auto flex max-w-3xl items-center gap-1.5 px-4">
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={step.path} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <span
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i === 0 ? "opacity-0" : done || current ? "bg-forest-800" : "bg-forest-900/15"
                  }`}
                />
                <span
                  aria-current={current ? "step" : undefined}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                    current
                      ? "bg-forest-800 text-cream-50 ring-4 ring-forest-800/15"
                      : done
                        ? "bg-forest-800 text-cream-50"
                        : "bg-forest-900/10 text-forest-900/50"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i === STEPS.length - 1
                      ? "opacity-0"
                      : done
                        ? "bg-forest-800"
                        : "bg-forest-900/15"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium sm:text-xs ${
                  current ? "text-forest-900" : "text-forest-900/45"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
