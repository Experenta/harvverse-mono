"use client";

import dynamic from "next/dynamic";
import type { Route } from "next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Polygon } from "geojson";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  ExternalLink,
  HandCoins,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sprout,
  XCircle,
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

import { useAccount, useConnect } from "wagmi";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";
import { useReservePartnership, type ReserveStep } from "@/hooks/use-reserve-partnership";
import { wagmiConfig } from "@/lib/wagmi";

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

function polygonCentroid(coords: number[][]): [number, number] | null {
  const pts = coords.slice(0, -1);
  if (pts.length === 0) return null;
  const lat = pts.reduce((s, c) => s + (c[1] ?? 0), 0) / pts.length;
  const lng = pts.reduce((s, c) => s + (c[0] ?? 0), 0) / pts.length;
  return [lat, lng];
}

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function LotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);
  const t = useTranslations("lot");
  const tp = useTranslations("partnership");
  const trs = useTranslations("risk_score");
  const tc = useTranslations("common");
  const tpr = useTranslations("proposals");

  const { data: user, clerkUser } = useCurrentUser();
  const { address } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: lot, isLoading, isError } = useQuery(
    trpc.lots.byId.queryOptions(
      { id: lotId },
      { enabled: Number.isFinite(lotId) },
    ),
  );

  const computeScore = useMutation(
    trpc.lots.computeRiskScore.mutationOptions(),
  );

  const { data: myProposals } = useQuery(
    trpc.proposals.myProposals.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const lotProposal = myProposals?.find((p) => p.lotId === lotId) ?? null;

  const createProposal = useMutation(trpc.proposals.create.mutationOptions());

  const activePlan = lot?.plans.find((p) => p.status !== "revoked") ?? null;
  const projections = activePlan ? computeProjections(activePlan) : null;

  const reserve = useReservePartnership({
    lot: lot ?? null,
    activePlan: activePlan ?? null,
    projections,
    existingProposalId: lotProposal?.status === "signed" ? lotProposal.id : null,
  });

  // Navigate on successful confirmation
  useEffect(() => {
    if (reserve.step === "done") {
      setConfirmDialogOpen(false);
      router.push("/my-investments" as Route);
    }
  }, [reserve.step, router]);

  useEffect(() => {
    if (!confirmDialogOpen && reserve.step === "error") reserve.reset();
  }, [confirmDialogOpen, reserve]);

  const isPartner = !!user && user.role === "partner";
  const canRequest =
    !!activePlan &&
    lot?.status === "available" &&
    isPartner &&
    !lotProposal;

  const si = stepIndex(reserve.step);

  function getStepLabel(step: ReserveStep): string {
    const map: Record<ReserveStep, string> = {
      idle: tp("step_idle"),
      approving: tp("step_approving"),
      approved: tp("step_approved"),
      opening: tp("step_opening"),
      confirmed: tp("step_confirmed"),
      saving: tp("step_saving"),
      done: tp("step_done"),
      error: tp("step_error"),
    };
    return map[step];
  }

  async function handleSendRequest() {
    if (!activePlan || !projections || !user) return;
    const proposalHash = await sha256Hex(
      JSON.stringify({ lotId, planId: activePlan.id, userId: user.id, ts: Date.now() }),
    );
    await createProposal.mutateAsync({
      lotId,
      planId: activePlan.id,
      userId: user.id,
      walletAddress: "",
      partnershipType: "phygital",
      status: "pending",
      revenueCents: projections.revenueCents,
      profitCents: projections.profitCents,
      farmerCents: projections.farmerCents,
      partnerCents: projections.partnerCents,
      proposalHash,
      message: partnerMessage || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await queryClient.invalidateQueries({
      queryKey: trpc.proposals.myProposals.queryKey({ clerkId: clerkUser?.id }),
    });
    setRequestDialogOpen(false);
    setPartnerMessage("");
  }

  function renderProposalButton() {
    if (!isPartner) {
      return (
        <Button
          className="bg-primary hover:bg-primary/90 text-[#001020] font-bold py-6 px-8"
          disabled
        >
          <HandCoins className="w-5 h-5 mr-2" />
          {!user ? t("sign_in_invest") : t("partner_required")}
        </Button>
      );
    }

    if (!activePlan) {
      return (
        <Button className="bg-primary/50 text-[#001020] font-bold py-6 px-8" disabled>
          <HandCoins className="w-5 h-5 mr-2" />
          {t("no_plan_btn")}
        </Button>
      );
    }

    if (lot?.status !== "available") {
      return (
        <Button className="bg-primary/50 text-[#001020] font-bold py-6 px-8" disabled>
          <HandCoins className="w-5 h-5 mr-2" />
          {t("lot_status", { status: lot?.status ?? "" })}
        </Button>
      );
    }

    if (!lotProposal) {
      return (
        <Button
          className="bg-primary hover:bg-primary/90 text-[#001020] font-bold py-6 px-8"
          onClick={() => setRequestDialogOpen(true)}
        >
          <HandCoins className="w-5 h-5 mr-2" />
          {tpr("send_request")}
        </Button>
      );
    }

    if (lotProposal.status === "pending" || lotProposal.status === "submitted") {
      return (
        <Button
          className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold py-6 px-8 cursor-default"
          disabled
        >
          <Clock className="w-5 h-5 mr-2" />
          {tpr("pending")}
        </Button>
      );
    }

    if (lotProposal.status === "signed") {
      return (
        <Button
          className="bg-green-500/20 border border-green-500/40 text-green-300 font-bold py-6 px-8 hover:bg-green-500/30"
          onClick={() => setConfirmDialogOpen(true)}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {tpr("approved")}
        </Button>
      );
    }

    if (lotProposal.status === "failed" || lotProposal.status === "expired") {
      return (
        <div className="space-y-2">
          <Button
            className="bg-red-500/20 border border-red-500/40 text-red-300 font-bold py-6 px-8 cursor-default"
            disabled
          >
            <XCircle className="w-5 h-5 mr-2" />
            {tpr("rejected")}
          </Button>
        </div>
      );
    }

    return null;
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back")}
      </Button>

      {isLoading ? (
        <div className="max-w-4xl space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <GlassCard className="p-12 text-center border-red-500/20">
          <p className="flex items-center gap-2 text-red-400 justify-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load")}
          </p>
        </GlassCard>
      ) : !lot ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">{t("not_found")}</p>
        </GlassCard>
      ) : (
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            {(() => {
              const farmPolygon = lot.farm?.polygon != null
                ? (lot.farm.polygon as Polygon)
                : null;
              const mapsUrl = (() => {
                if (lot.gpsLat != null && lot.gpsLng != null) {
                  return `https://www.google.com/maps?q=${lot.gpsLat},${lot.gpsLng}`;
                }
                if (farmPolygon) {
                  const centroid = polygonCentroid(farmPolygon.coordinates[0] ?? []);
                  if (centroid) return `https://www.google.com/maps?q=${centroid[0]},${centroid[1]}`;
                }
                return null;
              })();
              return (
                <>
                  {farmPolygon ? (
                    <div className="h-[200px] rounded-lg overflow-hidden mb-2 border border-white/10">
                      <PolygonDisplayMap polygon={farmPolygon} />
                    </div>
                  ) : null}
                  {mapsUrl ? (
                    <div className="flex justify-end mb-4">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#67B9C1] hover:text-[#67B9C1]/80 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t("open_in_maps")}
                      </a>
                    </div>
                  ) : null}
                </>
              );
            })()}

            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {lot.code ?? t("lot_id", { id: lot.id })}
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
                  {t("eudr_compliant")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard className="p-6 border-primary/20 md:col-span-2">
              <h2 className="text-xl font-bold mb-4">{t("plan_terms")}</h2>
              {activePlan ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-400">{t("plan_code")}</dt>
                    <dd className="text-white">{activePlan.planCode}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("ticket")}</dt>
                    <dd className="text-primary font-bold text-lg">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("price_per_lb")}</dt>
                    <dd className="text-white">
                      {formatUsdFromCents(activePlan.priceCentsPerLb)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("floor_per_lb")}</dt>
                    <dd className="text-white">
                      {formatUsdFromCents(activePlan.priceFloorCentsPerLb)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("proj_yield_y1")}</dt>
                    <dd className="text-white">
                      {(activePlan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("yield_cap_y1")}</dt>
                    <dd className="text-white">
                      {(activePlan.yieldCapY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("farmer_split_pct")}</dt>
                    <dd className="text-white">
                      {activePlan.splitFarmerBps / 100}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">{t("partner_split_pct")}</dt>
                    <dd className="text-white">
                      {activePlan.splitPartnerBps
                        ? `${activePlan.splitPartnerBps / 100}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-gray-400 text-sm">{t("no_active_plan")}</p>
              )}
            </GlassCard>

            <GlassCard className="p-6 border-primary/20">
              <h2 className="text-xl font-bold mb-4">{t("risk_score")}</h2>
              {(() => {
                const displayScore =
                  computeScore.data?.score ?? lot.riskScore;
                return displayScore != null ? (
                  <>
                    <div className="text-5xl font-bold text-primary mb-1">
                      {displayScore}
                    </div>
                    <p className="text-xs text-gray-400 mb-4">{t("out_of_100")}</p>
                    <Progress value={displayScore} className="mb-4" />
                    <p className="text-xs text-gray-400">
                      {lot.eudrCompliant
                        ? t("eudr_verified")
                        : t("eudr_pending")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">
                    {t("no_risk_score")}
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
                      {computeScore.isPending ? t("calculating_score") : t("calculate_score")}
                    </Button>
                    {!canScore ? (
                      <p className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {t("farm_polygon_required")}
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

            let maxDry = 0, dryRun = 0;
            for (const m of climate) {
              if (m.precipMm < 100) { dryRun++; if (dryRun > maxDry) maxDry = dryRun; }
              else dryRun = 0;
            }
            const rainyMonths = climate.filter((m) => m.precipMm > 150).length;

            const rainyStr = rainyMonths >= 4
              ? t("rain_yes_months", { count: rainyMonths })
              : t("rain_no_months", { count: rainyMonths });
            const dryStr = maxDry >= 2
              ? t("dry_yes", { count: maxDry })
              : t("dry_no", { count: maxDry });

            const rows: {
              label: string;
              value: number | null;
              weight: string | null;
              note?: string;
              detail: string;
            }[] = [
              {
                label: trs("ndvi_avg"),
                value: sd.breakdown.ndviAvg,
                weight: sd.hasSentinel ? "20%" : null,
                note: !sd.hasSentinel ? t("no_sentinel_credentials") : undefined,
                detail: avgNdvi != null
                  ? t("ndvi_measured", { value: avgNdvi.toFixed(3), months: ndviValid.length })
                  : t("ndvi_no_data"),
              },
              {
                label: trs("ndvi_stability"),
                value: sd.breakdown.ndviStability,
                weight: sd.hasSentinel ? "10%" : null,
                note: !sd.hasSentinel ? t("no_sentinel_credentials") : undefined,
                detail: ndviValid.length >= 2
                  ? t("ndvi_stability_has_data", { months: ndviValid.length })
                  : t("ndvi_stability_no_data"),
              },
              {
                label: trs("annual_precip"),
                value: sd.breakdown.annualPrecip,
                weight: sd.hasSentinel ? "15%" : "25%",
                detail: t("precip_detail", { mm: Math.round(annualPrecipMm).toLocaleString(), years: Math.round(climate.length / 12) }),
              },
              {
                label: trs("rain_distrib"),
                value: sd.breakdown.rainDistrib,
                weight: sd.hasSentinel ? "15%" : "25%",
                detail: t("rain_detail", { rainy: rainyStr, dry: dryStr }),
              },
              {
                label: trs("temperature"),
                value: sd.breakdown.temperature,
                weight: sd.hasSentinel ? "10%" : "17%",
                detail: t("temp_detail", { temp: avgTempC.toFixed(1), months: climate.length }),
              },
              {
                label: trs("eudr_compliance"),
                value: sd.breakdown.eudr,
                weight: sd.hasSentinel ? "20%" : "33%",
                detail: sd.eudrCompliant === true
                  ? t("eudr_compliant_detail")
                  : sd.eudrCompliant === false
                  ? t("eudr_non_compliant_detail")
                  : t("eudr_pending_detail"),
              },
            ];

            return (
              <GlassCard className="p-6 border-primary/20 mb-8">
                <h2 className="text-lg font-bold mb-1">{t("score_breakdown")}</h2>
                <p className="text-xs text-gray-400 mb-4">
                  {sd.hasSentinel
                    ? t("score_source_sentinel")
                    : t("score_source_climate")}
                </p>
                <div className="space-y-1">
                  {rows.map(({ label, value, weight, note, detail }) => {
                    const isOpen = expandedRow === label;
                    return (
                      <div key={label}>
                        <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2">
                          <div>
                            <p className="text-sm text-white font-medium">{label}</p>
                            {note ? (
                              <p className="text-xs text-yellow-500/70">{note}</p>
                            ) : null}
                          </div>
                          <span className="hidden md:block text-xs text-gray-500 w-10 text-right">
                            {weight ?? "—"}
                          </span>
                          {value != null ? (
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={value} className="flex-1 h-1.5 [&>div]:bg-primary" />
                              <span className="text-xs font-mono text-primary font-bold w-8 text-right">
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
                  <span className="text-sm text-gray-400">{t("score_total")}</span>
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

          {/* CTA button — proposal-based flow */}
          {renderProposalButton()}

          {/* Approved proposal confirmation banner */}
          {lotProposal?.status === "signed" && activePlan && projections && (
            <GlassCard className="mt-6 p-6 border-green-500/30 bg-green-500/5">
              <h3 className="text-lg font-bold text-green-300 mb-2">
                {tpr("confirm_title")}
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                {tpr("confirm_desc", { amount: formatUsdFromCents(activePlan.ticketCents) })}
              </p>
            </GlassCard>
          )}

          {/* Send request dialog — no wallet required */}
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogContent className="bg-[#001020] border border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white">
                  {tpr("send_request")}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {tpr("request_dialog_desc", {
                    lot: lot.code ?? t("lot_id", { id: lot.id }),
                  })}
                </DialogDescription>
              </DialogHeader>

              {activePlan && projections && (
                <div className="grid grid-cols-2 gap-3 text-sm my-2">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">{tp("your_ticket")}</p>
                    <p className="font-bold text-primary text-lg">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">{tp("projected_return")}</p>
                    <p className="font-bold text-white text-lg">
                      {formatUsdFromCents(activePlan.ticketCents + projections.partnerCents)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  {tpr("message_label")}
                </label>
                <textarea
                  value={partnerMessage}
                  onChange={(e) => setPartnerMessage(e.target.value)}
                  placeholder={tpr("message_placeholder")}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary text-sm resize-none"
                />
              </div>

              {createProposal.error && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {createProposal.error.message}
                </p>
              )}

              <DialogFooter showCloseButton>
                <Button
                  className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
                  disabled={createProposal.isPending}
                  onClick={handleSendRequest}
                >
                  {createProposal.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {tpr("send_request")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Wallet confirm dialog — shown after farmer approval */}
          {activePlan && projections && (
            <Dialog open={confirmDialogOpen} onOpenChange={(open) => { setConfirmDialogOpen(open); }}>
              <DialogContent className="bg-[#001020] border border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white">
                    {tpr("confirm_title")}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {tpr("confirm_desc", { amount: formatUsdFromCents(activePlan.ticketCents) })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">{tp("your_ticket")}</p>
                      <p className="font-bold text-primary text-lg">
                        {formatUsdFromCents(activePlan.ticketCents)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">{tp("projected_return")}</p>
                      <p className="font-bold text-white text-lg">
                        {formatUsdFromCents(activePlan.ticketCents + projections.partnerCents)}
                      </p>
                    </div>
                  </div>

                  {reserve.step !== "idle" && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      <StepRow
                        label={tp("approve_usdc")}
                        active={reserve.step === "approving"}
                        done={si >= stepIndex("approved")}
                      />
                      <StepRow
                        label={tp("open_chain")}
                        active={reserve.step === "opening"}
                        done={si >= stepIndex("confirmed")}
                      />
                      <StepRow
                        label={tp("save_database")}
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
                    {tp("disclaimer")}
                  </p>
                </div>

                <DialogFooter showCloseButton>
                  {!address ? (
                    <div className="w-full space-y-2">
                      <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {tp("connect_wallet_warning")}
                      </p>
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-bold"
                        disabled={isConnecting}
                        onClick={() =>
                          connect({ connector: wagmiConfig.connectors[1]! })
                        }
                      >
                        {isConnecting && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {tp("connect_wallet")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
                      disabled={reserve.isLoading}
                      onClick={reserve.step === "error" ? reserve.reset : reserve.start}
                    >
                      {reserve.isLoading && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {getStepLabel(reserve.step)}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
