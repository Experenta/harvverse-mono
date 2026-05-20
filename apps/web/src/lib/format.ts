const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPreciseFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return usdFormatter.format(cents / 100);
}

export function formatUsd(usd: number): string {
  return usdFormatter.format(usd);
}

export function formatUsdPrecise(usd: number): string {
  return usdPreciseFormatter.format(usd);
}

export const COFFEE_LBS_PER_QQ = 83.3;

export function computeEarnings(params: {
  projectedYieldQq: number;
  pricePerLbUsd: number;
  agronomicCostUsd: number;
  farmerSharePct: number;
}): { grossIncomeUsd: number; netProfitUsd: number; farmerEarningsUsd: number } {
  const grossIncomeUsd = params.projectedYieldQq * params.pricePerLbUsd * COFFEE_LBS_PER_QQ;
  const netProfitUsd = grossIncomeUsd - params.agronomicCostUsd;
  const farmerEarningsUsd = netProfitUsd * (params.farmerSharePct / 100);
  return { grossIncomeUsd, netProfitUsd, farmerEarningsUsd };
}
