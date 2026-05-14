const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsdFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return usdFormatter.format(cents / 100);
}
