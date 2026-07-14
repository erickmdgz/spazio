import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2"
      aria-label="Spazio home"
    >
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-forest-800 text-cream-50 shadow-card transition-transform group-hover:-rotate-6"
      >
        {/* simple furnished-square mark */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="15" height="15" rx="4" stroke="#FAF8F1" strokeWidth="1.5" />
          <rect x="4.5" y="9" width="6" height="4.5" rx="1.2" fill="#B08968" />
          <circle cx="12.5" cy="6" r="1.6" fill="#B08968" />
        </svg>
      </span>
      <span className="font-serif text-xl font-semibold text-forest-900">
        Spazio
      </span>
    </Link>
  );
}
