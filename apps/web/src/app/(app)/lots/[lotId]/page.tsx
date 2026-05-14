"use client";

import dynamic from "next/dynamic";
import type { Route } from "next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import type { Polygon } from "geojson";
import {
  ArrowLeft,
  MapPin,
  Mountain,
  ShieldCheck,
  Sprout,
  Loader2,
  HandCoins,
  RefreshCw,
  AlertCircle,
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
import { useState } from "react";

const PolygonDisplayMap = dynamic(() => import("@/components/polygon-display-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] rounded-lg bg-black/20 border border-white/10 animate-pulse" />
  ),
});

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

export default function LotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);

  const { data: user } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reserving, setReserving] = useState(false);

  const { data: lot, isLoading } = useQuery(
    trpc.lots.byId.queryOptions(
      { id: lotId },
      { enabled: Number.isFinite(lotId) },
    ),
  );

  const createProposal = useMutation(trpc.proposals.create.mutationOptions());
  const createPartnership = useMutation(
    trpc.partnerships.create.mutationOptions(),
  );
  const updateLotStatus = useMutation(
    trpc.lots.updateStatus.mutationOptions(),
  );
  const computeScore = useMutation(
    trpc.lots.computeRiskScore.mutationOptions(),
  );

  const activePlan = lot?.plans.find((p) => p.status !== "revoked") ?? null;
  const projections = activePlan ? computeProjections(activePlan) : null;

  const canReserve =
    !!activePlan &&
    lot?.status === "available" &&
    !!user &&
    user.role === "partner";

  async function handleReserve() {
    if (!lot || !activePlan || !user || !projections) return;
    setReserving(true);
    try {
      const proposalHash = await sha256Hex(
        JSON.stringify({
          lotId: lot.id,
          planId: activePlan.id,
          userId: user.id,
          ts: Date.now(),
        }),
      );

      const proposal = await createProposal.mutateAsync({
        lotId: lot.id,
        planId: activePlan.id,
        userId: user.id,
        walletAddress: user.walletAddress,
        partnershipType: "phygital",
        status: "signed",
        revenueCents: projections.revenueCents,
        profitCents: projections.profitCents,
        farmerCents: projections.farmerCents,
        partnerCents: projections.partnerCents,
        proposalHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await createPartnership.mutateAsync({
        proposalId: proposal.id,
        lotId: lot.id,
        planId: activePlan.id,
        partnerUserId: user.id,
        partnerWallet: user.walletAddress,
        farmerWallet: lot.farmerWallet,
        status: "active",
        chainKey: "celoSepolia",
      });

      await updateLotStatus.mutateAsync({
        id: lot.id,
        status: "reserved",
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.lots.byId.queryKey({ id: lot.id }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.lots.list.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.partnerships.myPartnerships.queryKey({
            walletAddress: user.walletAddress,
          }),
        }),
      ]);

      setDialogOpen(false);
      router.push("/my-investments" as Route);
    } catch {
      // Error toast handled by queryClient's QueryCache onError
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-8">
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

          {computeScore.data && (
            <GlassCard className="p-6 border-primary/20 mb-8">
              <h2 className="text-lg font-bold mb-1">Score Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">
                {computeScore.data.hasSentinel
                  ? "Sentinel-2 NDVI + ERA5 climate (Open-Meteo) · last 24 months"
                  : "ERA5 climate (Open-Meteo) · last 24 months · add Sentinel Hub credentials to include NDVI"}
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "NDVI Average",
                    value: computeScore.data.breakdown.ndviAvg,
                    weight: computeScore.data.hasSentinel ? "20%" : null,
                    note: !computeScore.data.hasSentinel
                      ? "No Sentinel Hub credentials"
                      : undefined,
                  },
                  {
                    label: "NDVI Stability",
                    value: computeScore.data.breakdown.ndviStability,
                    weight: computeScore.data.hasSentinel ? "10%" : null,
                    note: !computeScore.data.hasSentinel
                      ? "No Sentinel Hub credentials"
                      : undefined,
                  },
                  {
                    label: "Annual Precipitation",
                    value: computeScore.data.breakdown.annualPrecip,
                    weight: computeScore.data.hasSentinel ? "15%" : "25%",
                  },
                  {
                    label: "Rain Distribution",
                    value: computeScore.data.breakdown.rainDistrib,
                    weight: computeScore.data.hasSentinel ? "15%" : "25%",
                  },
                  {
                    label: "Temperature",
                    value: computeScore.data.breakdown.temperature,
                    weight: computeScore.data.hasSentinel ? "10%" : "17%",
                  },
                  {
                    label: "EUDR Compliance",
                    value: computeScore.data.breakdown.eudr,
                    weight: computeScore.data.hasSentinel ? "20%" : "33%",
                  },
                ].map(({ label, value, weight, note }) => (
                  <div key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
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
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 mt-4 pt-3 flex justify-between items-center">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {computeScore.data.score}
                  <span className="text-sm text-gray-400 font-normal ml-1">/ 100</span>
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Hash: {computeScore.data.hash.slice(0, 16)}…
              </p>
            </GlassCard>
          )}

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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="bg-[#1a1f3a] border border-white/10 text-white max-w-md">
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

                  <p className="text-xs text-gray-500 leading-relaxed">
                    By confirming, you reserve a Phygital partnership for this
                    lot. Settlement happens after harvest based on actual yield.
                    All projected returns are estimates.
                  </p>
                </div>

                <DialogFooter showCloseButton>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
                    disabled={reserving}
                    onClick={handleReserve}
                  >
                    {reserving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {reserving ? "Reserving..." : "Confirm & Reserve"}
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
