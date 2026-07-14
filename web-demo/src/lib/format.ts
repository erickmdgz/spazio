// COP is a whole-unit currency in the pilot (ADR-015): no decimal subunits.

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(amount: number): string {
  return COP.format(Math.round(amount));
}

export function leadTimeLabel(kind: string, days: number): string {
  const noun = kind === "made-to-order" ? "production" : "delivery";
  const unit = days === 1 ? "day" : "days";
  return `${days} ${unit} ${noun}`;
}
