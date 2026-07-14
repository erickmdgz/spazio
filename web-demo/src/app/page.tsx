import Link from "next/link";

const HOW = [
  {
    n: "1",
    title: "Show your room",
    body: "Pick a sample room or upload a photo, and add rough dimensions.",
  },
  {
    n: "2",
    title: "Choose a style & budget",
    body: "A predefined look, an optional note, and a budget in COP.",
  },
  {
    n: "3",
    title: "See it furnished & buy",
    body: "A photorealistic render with tappable, real products you can order.",
  },
];

export default function LandingPage() {
  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="grid items-center gap-8 py-6 md:grid-cols-2 md:py-12">
        <div>
          <span className="chip mb-5 bg-wood/15 text-wood-dark">
            Bogotá · real, purchasable furniture
          </span>
          <h1 className="text-4xl font-semibold leading-[1.05] text-forest-900 sm:text-5xl md:text-6xl">
            See your room furnished with real, purchasable furniture.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted/80">
            Spazio turns a photo of your space into a photorealistic render —
            furnished only with pieces you can actually buy from local
            suppliers, then checkout in one flow.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/room" className="btn-primary text-base">
              Start
              <span aria-hidden>→</span>
            </Link>
            <span className="text-sm text-forest-900/50">
              Takes about a minute
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-forest-900/10 shadow-card">
            <img
              src="/rooms/living-mediterranean.svg"
              alt="Example of a living room rendered in a Modern Mediterranean style"
              className="block h-auto w-full"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 hidden rounded-xl bg-forest-800 px-4 py-3 text-cream-50 shadow-card sm:block">
            <p className="text-xs opacity-80">Render → purchase</p>
            <p className="font-serif text-lg">every item is real</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {HOW.map((step) => (
          <div key={step.n} className="card p-6">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-800 font-bold text-cream-50">
              {step.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-forest-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-muted/75">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
