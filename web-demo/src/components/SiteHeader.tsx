"use client";

import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { Stepper } from "./Stepper";

export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-forest-900/10 bg-cream-100/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Wordmark />
        <span className="chip bg-forest-800/10 text-forest-900">
          Class demo
        </span>
      </div>
      {!isLanding && (
        <div className="pb-3">
          <Stepper />
        </div>
      )}
    </header>
  );
}
