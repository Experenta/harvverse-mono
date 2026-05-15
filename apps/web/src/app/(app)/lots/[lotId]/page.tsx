"use client";

import dynamic from "next/dynamic";
import type { Route } from "next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Polygon } from "geojson";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  HandCoins,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Progress } from "@harvverse-monorepo/ui/components/progress";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@harvverse-monorepo/ui/components/dialog";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";
import { useReservePartnership, type ReserveStep } from "@/hooks/use-reserve-partnership";
import { useState } from "react";

const PolygonDisplayMap = dynamic(() => import("@/components/polygon-display-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] rounded-lg bg-black/20 border border-white/10 animate-pulse" />
  ),
});

function computeProjections(plan: {
  projectedYieldY1TenthsQq: number;
  priceCentsPerLb: number;
  agronomicCostCents: number;
  contingencyCents: number | null;
  platformFeeCents: number | null;
  splitFarmerBps: number;
  splitPartnerBps: number | null;
}) {
  const yieldQq = plan.projectedYieldY1TenthsQq / 10;
  const revenueCents = Math.round(yieldQq * 100 * plan.priceCentsPerLb);
  const costCents =
    plan.agronomicCostCents +
    (plan.contingencyCents ?? 0) +
    (plan.platformFeeCents ?? 0);
  const profitCents = Math.max(0, revenueCents - costCents);
  const farmerCents = Math.round((profitCents * plan.splitFarmerBps) / 10000);
  const partnerCents = plan.splitPartnerBps
    ? Math.round((profitCents * plan.splitPartnerBps) / 10000)
    : profitCents - farmerCents;
  return { revenueCents, profitCents, farmerCents, partnerCents };
}

const STEP_LABELS: Record<ReserveStep, string> = {
  idle: "Confirm & Reserve",
  approving: "Approving USDC…",
  approved: "Approved",
  opening: "Opening partnership…",
  confirmed: "Confirmed",
  saving: "Saving…",
  done: "Done",
  error: "Try again",
};

function StepRow({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      ) : active ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-white/20 shrink-0" />
      )}
      <span className={done ? "text-green-400" : active ? "text-white" : "text-white/30"}>
        {label}
      </span>
    </div>
  );
}

function stepIndex(step: ReserveStep): number {
  return ["idle", "approving", "approved", "opening", "confirmed", "saving", "done", "error"].indexOf(step);
}

export default function LotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);

  const { data: user } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: lot, isLoading } = useQuery(
    trpc.lots.byId.queryOptions(
      { id: lotId },
      { enabled: Number.isFinite(lotId) },
    ),
  );

  const computeScore = useMutation(
    trpc.lots.computeRiskScore.mutationOptions(),
  );

  const activePlan = lot?.plans.find((p) => p.status !== "revoked") ?? null;
  const projections = activePlan ? computeProjections(activePlan) : null;

  const reserve = useReservePartnership({
    lot: lot ?? null,
    activePlan: activePlan ?? null,
    projections,
  });

  // Navigate on successful reservation
  useEffect(() => {
    if (reserve.step === "done") {
      setDialogOpen(false);
      router.push("/my-investments" as Route);
    }
  }, [reserve.step, router]);

  // Reset hook state when dialog closes
  useEffect(() => {
    if (!dialogOpen && reserve.step === "error") reserve.reset();
  }, [dialogOpen, reserve]);

  const canReserve =
    !!activePlan &&
    lot?.status === "available" &&
    !!user &&
    user.role === "partner";

  const si = stepIndex(reserve.step);

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {isLoading ? (
        <div className="max-w-4xl space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !lot ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">Lot not found.</p>
        </GlassCard>
      ) : (
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            {(() => {
              const farmPolygon = lot.farm?.polygon != null
                ? (lot.farm.polygon as Polygon)
                : null;
              return farmPolygon ? (
                <div className="h-[200px] rounded-lg overflow-hidden mb-4 border border-white/10">
                  <PolygonDisplayMap polygon={farmPolygon} />
                </div>
              ) : null;
            })()}

            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {lot.code ?? `Lot #${lot.id}`}
                </h1>
                <p className="text-gray-400">{lot.farmName}</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase">
                {lot.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {lot.region}, {lot.country}
              </span>
              {lot.altitudeMasl ? (
                <span className="flex items-center gap-1">
                  <Mountain className="w-4 h-4" />
                  {lot.altitudeMasl} MASL
                </span>
              ) : null}
              {lot.variety ? (
                <span className="flex items-center gap-1">
                  <Sprout className="w-4 h-4" />
                  {lot.variety}
                </span>
              ) : null}
              {lot.eudrCompliant ? (
                <span className="flex items-center gap-1 text-green-400">
                  <ShieldCheck className="w-4 h-4" />
                  EUDR compliant
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard className="p-6 border-primary/20 md:col-span-2">
              <h2 className="text-xl font-bold mb-4">Plan Terms</h2>
              {activePlan ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-400">Plan Code</dt>
                    <dd className="text-white">{activePlan.planCode}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Ticket</dt>
                    <dd className="text-primary font-bold text-lg">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Price / lb</dt>
                    <dd className="text-white">
                      {formatUsdFromCents(activePlan.priceCentsPerLb)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Floor / lb</dt>
                    <dd className="text-white">
                      {formatUsdFromCents(activePlan.priceFloorCentsPerLb)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Projected yield Y1</dt>
                    <dd className="text-white">
                      {(activePlan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Yield cap Y1</dt>
                    <dd className="text-white">
                      {(activePlan.yieldCapY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Farmer split</dt>
                    <dd className="text-white">
                      {activePlan.splitFarmerBps / 100}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Partner split</dt>
                    <dd className="text-white">
                      {activePlan.splitPartnerBps
                        ? `${activePlan.splitPartnerBps / 100}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-gray-400 text-sm">
                  No active plan published for this lot yet.
                </p>
              )}
            </GlassCard>

            <GlassCard className="p-6 border-primary/20">
              <h2 className="text-xl font-bold mb-4">Risk Score</h2>
              {(() => {
                const displayScore =
                  computeScore.data?.score ?? lot.riskScore;
                return displayScore != null ? (
                  <>
                    <div className="text-5xl font-bold text-primary mb-1">
                      {displayScore}
                    </div>
                    <p className="text-xs text-gray-400 mb-4">out of 100</p>
                    <Progress value={displayScore} className="mb-4" />
                    <p className="text-xs text-gray-400">
                      {lot.eudrCompliant
                        ? "EUDR-compliant verified."
                        : "EUDR verification pending."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">
                    No risk score recorded yet.
                  </p>
                );
              })()}
              {(() => {
                const hasFarmPolygon = lot.farm?.polygon != null;
                const hasGps = lot.gpsLat != null && lot.gpsLng != null;
                const canScore = hasFarmPolygon || hasGps;
                return (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                      disabled={computeScore.isPending || !canScore}
                      onClick={() => {
                        computeScore.mutate(
                          { id: lotId },
                          {
                            onSuccess: () =>
                              queryClient.invalidateQueries({
                                queryKey: trpc.lots.byId.queryKey({ id: lotId }),
                              }),
                          },
                        );
                      }}
                    >
                      {computeScore.isPending ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-2" />
                      )}
                      {computeScore.isPending ? "Calculating…" : "Calculate Risk Score"}
                    </Button>
                    {!canScore ? (
                      <p className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Farm polygon or GPS coordinates required
                      </p>
                    ) : null}
                  </>
                );
              })()}
              {computeScore.error ? (
                <p className="text-xs text-red-400 mt-2">
                  {computeScore.error.message}
                </p>
              ) : null}
            </GlassCard>
          </div>

          {computeScore.data && (() => {
            const sd = computeScore.data;
            const climate = sd.climateMonths;
            const ndviValid = sd.ndviMonths.filter((m) => m.mean != null).map((m) => m.mean as number);

            const annualPrecipMm = climate.length > 0
              ? (climate.reduce((s, m) => s + m.precipMm, 0) / climate.length) * 12
              : 0;
            const avgTempC = climate.length > 0
              ? climate.reduce((s, m) => s + m.tempC, 0) / climate.length
              : 0;
            const avgNdvi = ndviValid.length > 0
              ? ndviValid.reduce((a, b) => a + b, 0) / ndviValid.length
              : null;

            // Dry-season count for rain distribution detail
            let maxDry = 0, dryRun = 0;
            for (const m of climate) {
              if (m.precipMm < 100) { dryRun++; if (dryRun > maxDry) maxDry = dryRun; }
              else dryRun = 0;
            }
            const rainyMonths = climate.filter((m) => m.precipMm > 150).length;

            const rows: {
              label: string;
              value: number | null;
              weight: string | null;
              note?: string;
              detail: string;
            }[] = [
              {
                label: "NDVI Average",
                value: sd.breakdown.ndviAvg,
                weight: sd.hasSentinel ? "20%" : null,
                note: !sd.hasSentinel ? "No Sentinel Hub credentials" : undefined,
                detail: avgNdvi != null
                  ? `Measured: ${avgNdvi.toFixed(3)} avg NDVI over ${ndviValid.length} months (0 = bare soil, 1 = dense vegetation)`
                  : "No Sentinel-2 data available — add credentials to enable NDVI scoring",
              },
              {
                label: "NDVI Stability",
                value: sd.breakdown.ndviStability,
                weight: sd.hasSentinel ? "10%" : null,
                note: !sd.hasSentinel ? "No Sentinel Hub credentials" : undefined,
                detail: ndviValid.length >= 2
                  ? `Coefficient of variation across ${ndviValid.length} monthly readings — lower CV = more stable canopy`
                  : "Need at least 2 NDVI readings to compute stability",
              },
              {
                label: "Annual Precipitation",
                value: sd.breakdown.annualPrecip,
                weight: sd.hasSentinel ? "15%" : "25%",
                detail: `Measured: ${Math.round(annualPrecipMm).toLocaleString()} mm/yr (average over ${Math.round(climate.length / 12)} years · optimal range 1,500–2,000 mm/yr)`,
              },
              {
                label: "Rain Distribution",
                value: sd.breakdown.rainDistrib,
                weight: sd.hasSentinel ? "15%" : "25%",
                detail: `Rainy season: ${rainyMonths >= 4 ? `Yes (${rainyMonths} months >150 mm)` : `No (only ${rainyMonths} months >150 mm, need ≥4)`} · Dry season: ${maxDry >= 2 ? `Yes (${maxDry} consecutive months <100 mm)` : `No (longest dry run: ${maxDry} month)`}`,
              },
              {
                label: "Temperature",
                value: sd.breakdown.temperature,
                weight: sd.hasSentinel ? "10%" : "17%",
                detail: `Measured: ${avgTempC.toFixed(1)} °C avg over ${climate.length} months (optimal 18–22 °C · 15–18 °C good for specialty)`,
              },
              {
                label: "EUDR Compliance",
                value: sd.breakdown.eudr,
                weight: sd.hasSentinel ? "20%" : "33%",
                detail: sd.eudrCompliant === true
                  ? "Compliant — lot is deforestation-free per EUDR regulation"
                  : sd.eudrCompliant === false
                  ? "Non-compliant — deforestation detected or reported"
                  : "Pending assessment — compliance status not yet verified",
              },
            ];

            return (
              <GlassCard className="p-6 border-primary/20 mb-8">
                <h2 className="text-lg font-bold mb-1">Score Breakdown</h2>
                <p className="text-xs text-gray-400 mb-4">
                  {sd.hasSentinel
                    ? "Sentinel-2 NDVI + ERA5 climate (Open-Meteo) · last 24 months"
                    : "ERA5 climate (Open-Meteo) · last 24 months · add Sentinel Hub credentials to include NDVI"}
                </p>
                <div className="space-y-1">
                  {rows.map(({ label, value, weight, note, detail }) => {
                    const isOpen = expandedRow === label;
                    return (
                      <div key={label}>
                        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2">
                          <div>
                            <p className="text-sm text-white/80">{label}</p>
                            {note ? (
                              <p className="text-xs text-yellow-500/70">{note}</p>
                            ) : null}
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {weight ?? "—"}
                          </span>
                          {value != null ? (
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={value} className="flex-1 h-1.5" />
                              <span className="text-xs font-mono text-white/70 w-8 text-right">
                                {Math.round(value)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 w-32 text-right">N/A</span>
                          )}
                          <button
                            onClick={() => setExpandedRow(isOpen ? null : label)}
                            className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                            aria-label={isOpen ? "Collapse detail" : "Expand detail"}
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                        {isOpen && (
                          <p className="text-xs text-gray-400 pb-2 pl-0 pr-8 leading-relaxed">
                            {detail}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-white/10 mt-4 pt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {sd.score}
                    <span className="text-sm text-gray-400 font-normal ml-1">/ 100</span>
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Hash: {sd.hash.slice(0, 16)}…
                </p>
              </GlassCard>
            );
          })()}

          <Button
            className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold py-6 px-8"
            disabled={!canReserve}
            onClick={() => setDialogOpen(true)}
          >
            <HandCoins className="w-5 h-5 mr-2" />
            {lot.status !== "available"
              ? `Lot ${lot.status}`
              : !activePlan
                ? "No active plan"
                : !user
                  ? "Sign in to invest"
                  : user.role !== "partner"
                    ? "Partner account required"
                    : "Reserve Partnership"}
          </Button>

          {activePlan && projections && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); }}>
              <DialogContent className="bg-[#1a1f3a] border border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white">
                    Confirm Investment
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Review the terms before reserving your partnership in{" "}
                    <span className="text-white font-medium">
                      {lot.code ?? `Lot #${lot.id}`}
                    </span>
                    .
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Your ticket</p>
                      <p className="font-bold text-primary text-lg">
                        {formatUsdFromCents(activePlan.ticketCents)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">
                        Your projected return
                      </p>
                      <p className="font-bold text-white text-lg">
                        {formatUsdFromCents(
                          activePlan.ticketCents + projections.partnerCents,
                        )}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">
                        Projected revenue
                      </p>
                      <p className="text-white">
                        {formatUsdFromCents(projections.revenueCents)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">
                        Your profit share ({activePlan.splitPartnerBps ? activePlan.splitPartnerBps / 100 : "—"}%)
                      </p>
                      <p className="text-white">
                        {formatUsdFromCents(projections.partnerCents)}
                      </p>
                    </div>
                  </div>

                  {/* Transaction step tracker */}
                  {reserve.step !== "idle" && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      <StepRow
                        label="Approve USDC"
                        active={reserve.step === "approving"}
                        done={si >= stepIndex("approved")}
                      />
                      <StepRow
                        label="Open partnership on-chain"
                        active={reserve.step === "opening"}
                        done={si >= stepIndex("confirmed")}
                      />
                      <StepRow
                        label="Save to database"
                        active={reserve.step === "saving"}
                        done={reserve.step === "done"}
                      />
                    </div>
                  )}

                  {reserve.error && (
                    <p className="text-xs text-red-400 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      {reserve.error}
                    </p>
                  )}

                  {reserve.txHash && reserve.step !== "done" && (
                    <p className="text-xs text-gray-500 font-mono truncate">
                      tx: {reserve.txHash}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 leading-relaxed break-words">
                    By confirming, you reserve a Phygital partnership for this
                    lot. Settlement happens after harvest based on actual yield.
                    All projected returns are estimates.
                  </p>
                </div>

                <DialogFooter showCloseButton>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
                    disabled={reserve.isLoading}
                    onClick={reserve.step === "error" ? reserve.reset : reserve.start}
                  >
                    {reserve.isLoading && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {STEP_LABELS[reserve.step]}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
