"use client";

import dynamic from "next/dynamic";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Polygon } from "geojson";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  HandCoins,
  Loader2,
  MapPin,
  Mountain,
  AlertCircle,
  ShieldCheck,
  Sprout,
  XCircle,
} from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
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
import { trpc } from "@/utils/trpc";
import { useReservePartnership, type ReserveStep } from "@/hooks/use-reserve-partnership";
import { wagmiConfig } from "@/lib/wagmi";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";

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

function riskScoreFromLot(lot: {
  riskScore?: number | null;
  eudrCompliant?: boolean | null;
  scoreHash?: string | null;
}): RiskScoreData | null {
  if (lot.riskScore == null) return null;
  return {
    score: lot.riskScore,
    eudrCompliant: lot.eudrCompliant ?? null,
    hash: lot.scoreHash ?? null,
  };
}

function formatRelativeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, "day");
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, "hour");
  const diffMinutes = Math.round(diffMs / 60_000);
  return rtf.format(diffMinutes, "minute");
}

export default function LotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);
  const t = useTranslations("lot");
  const tp = useTranslations("partnership");
  const tc = useTranslations("common");
  const tpr = useTranslations("proposals");
  const queryClient = useQueryClient();

  const { data: user, clerkUser } = useCurrentUser();
  const { address } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState("");
  const { data: lot, isLoading, isError } = useQuery(
    trpc.lots.byId.queryOptions(
      { id: lotId },
      { enabled: Number.isFinite(lotId) },
    ),
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
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-8 text-white/70 px-0 md:px-4"
        onClick={() => router.push("/dashboard/player/explore" as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_explore")}
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
          <p className="text-white/60">{t("not_found")}</p>
        </GlassCard>
      ) : (
        <div className="max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            {(() => {
              const lotPolygon = lot.polygon != null
                ? (lot.polygon as Polygon)
                : null;
              const farmPolygon = lot.farm?.polygon != null
                ? (lot.farm.polygon as Polygon)
                : null;
              const displayPolygon = lotPolygon ?? farmPolygon;
              const mapsUrl = (() => {
                if (lot.gpsLat != null && lot.gpsLng != null) {
                  return `https://www.google.com/maps?q=${lot.gpsLat},${lot.gpsLng}`;
                }
                if (displayPolygon) {
                  const centroid = polygonCentroid(displayPolygon.coordinates[0] ?? []);
                  if (centroid) return `https://www.google.com/maps?q=${centroid[0]},${centroid[1]}`;
                }
                return null;
              })();
              return (
                <>
                  {displayPolygon ? (
                    <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                      <div className="h-[220px]">
                        <PolygonDisplayMap
                          polygon={displayPolygon}
                          color={lotPolygon ? "#93D832" : "#67B9C1"}
                          fillOpacity={lotPolygon ? 0.25 : 0.14}
                        />
                      </div>
                      {!lotPolygon && farmPolygon ? (
                        <p className="border-t border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#67B9C1]">
                          {t("polygon_fallback")}
                        </p>
                      ) : null}
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

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-trenda text-4xl font-bold text-white mb-2">
                  {lot.code ?? t("lot_id", { id: lot.id })}
                </h1>
                <p className="text-lg text-white/70">{lot.farmName}</p>
              </div>
              <Badge className="rounded-full bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase">
                {lot.status}
              </Badge>
            </div>

            <div className="mb-6 flex flex-wrap gap-4 text-sm text-white/60">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <GlassCard className="border-primary/20 bg-white/5 p-4 flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t("ticket")}</p>
                <p className="text-xl font-bold text-primary">
                  {activePlan ? formatUsdFromCents(activePlan.ticketCents) : "--"}
                </p>
              </GlassCard>
              <GlassCard className="border-primary/20 bg-white/5 p-4 flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t("partner_split_pct")}</p>
                <p className="text-xl font-bold text-white">
                  {activePlan?.splitPartnerBps
                    ? `${activePlan.splitPartnerBps / 100}%`
                    : "--"}
                </p>
              </GlassCard>
              <GlassCard className="border-primary/20 bg-white/5 p-4 flex flex-col items-center text-center sm:col-span-2 lg:col-span-1 group hover:bg-white/10 transition-colors">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{t("altitude")}</p>
                <p className="text-xl font-bold text-white">
                  {lot.altitudeMasl ? `${lot.altitudeMasl}m` : "--"}
                </p>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <GlassCard className="p-6 md:p-8 border-primary/20 lg:col-span-2">
              <h2 className="section-title mb-6 uppercase text-sm tracking-widest font-bold text-primary">{t("plan_terms")}</h2>
              {activePlan ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("plan_code")}</dt>
                    <dd className="text-white font-medium">{activePlan.planCode}</dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("ticket")}</dt>
                    <dd className="text-primary font-black text-lg">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("price_per_lb")}</dt>
                    <dd className="text-white font-medium">
                      {formatUsdFromCents(activePlan.priceCentsPerLb)}
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("floor_per_lb")}</dt>
                    <dd className="text-white font-medium">
                      {formatUsdFromCents(activePlan.priceFloorCentsPerLb)}
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("proj_yield_y1")}</dt>
                    <dd className="text-white font-medium">
                      {(activePlan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("yield_cap_y1")}</dt>
                    <dd className="text-white font-medium">
                      {(activePlan.yieldCapY1TenthsQq / 10).toFixed(1)} qq
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("farmer_split_pct")}</dt>
                    <dd className="text-white font-medium">
                      {activePlan.splitFarmerBps / 100}%
                    </dd>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <dt className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("partner_split_pct")}</dt>
                    <dd className="text-white font-medium">
                      {activePlan.splitPartnerBps
                        ? `${activePlan.splitPartnerBps / 100}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-white/40 text-sm italic">{t("no_active_plan")}</p>
              )}
            </GlassCard>

            <div>
              {(() => {
                const riskData = riskScoreFromLot(lot);
                const updatedLabel = formatRelativeDate(lot.scoreUpdatedAt);
                if (!riskData) {
                  return (
                    <GlassCard className="border-white/10 p-6">
                      <h2 className="mb-2 font-trenda text-xl font-bold text-white">
                        {t("score_pending")}
                      </h2>
                      <p className="text-sm text-white/60">{t("score_pending_desc")}</p>
                    </GlassCard>
                  );
                }
                return (
                  <div className="flex flex-col gap-2">
                    <RiskScorePreview data={riskData} />
                    {updatedLabel ? (
                      <p className="text-xs text-white/55">
                        {t("score_last_updated", { date: updatedLabel })}
                      </p>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>

          <GlassCard className="p-6 border-primary/25 bg-primary/5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="section-title">{t("reserve_partnership")}</h2>
                <p className="mt-1 text-sm text-white/70">
                  {activePlan
                    ? formatUsdFromCents(activePlan.ticketCents)
                    : t("no_active_plan")}
                </p>
              </div>
              {renderProposalButton()}
            </div>
          </GlassCard>

          {/* Approved proposal confirmation banner */}
          {lotProposal?.status === "signed" && activePlan && projections && (
            <GlassCard className="mt-6 p-6 border-green-500/30 bg-green-500/5">
              <h3 className="text-lg font-bold text-green-300 mb-2">
                {tpr("confirm_title")}
              </h3>
              <p className="text-sm text-white/80 mb-4">
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
                <DialogDescription className="text-white/60">
                  {tpr("request_dialog_desc", {
                    lot: lot.code ?? t("lot_id", { id: lot.id }),
                  })}
                </DialogDescription>
              </DialogHeader>

              {activePlan && projections && (
                <div className="grid grid-cols-2 gap-3 text-sm my-2">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs mb-1">{tp("your_ticket")}</p>
                    <p className="font-bold text-primary text-lg">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs mb-1">{tp("projected_return")}</p>
                    <p className="font-bold text-white text-lg">
                      {formatUsdFromCents(activePlan.ticketCents + projections.partnerCents)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-white/60">
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
                  <DialogDescription className="text-white/60">
                    {tpr("confirm_desc", { amount: formatUsdFromCents(activePlan.ticketCents) })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">{tp("your_ticket")}</p>
                      <p className="font-bold text-primary text-lg">
                        {formatUsdFromCents(activePlan.ticketCents)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">{tp("projected_return")}</p>
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
                    <p className="text-xs text-white/45 font-mono truncate">
                      tx: {reserve.txHash}
                    </p>
                  )}

                  <p className="text-xs text-white/45 leading-relaxed break-words">
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
