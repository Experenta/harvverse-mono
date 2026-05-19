"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Copy, Plus, Loader2 } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Progress } from "@harvverse-monorepo/ui/components/progress";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@harvverse-monorepo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";
import { Textarea } from "@harvverse-monorepo/ui/components/textarea";

import { queryClient, trpc } from "@/utils/trpc";
import { useCurrentUser } from "@/hooks/use-auth";

const MILESTONES = [
  { number: 1, nameKey: "soil_prep", icon: "🌱", capitalPct: 0.111 },
  { number: 2, nameKey: "planting", icon: "🌿", capitalPct: 0.066 },
  { number: 3, nameKey: "maintenance", icon: "🔧", capitalPct: 0.051 },
  { number: 4, nameKey: "harvest", icon: "🌾", capitalPct: 0.061 },
  { number: 5, nameKey: "processing", icon: "⚙️", capitalPct: 0.134 },
  { number: 6, nameKey: "export", icon: "🚢", capitalPct: 0.012 },
] as const;

const evidenceSchema = z.object({
  evidenceType: z.enum([
    "photo",
    "sensor_snapshot",
    "receipt",
    "agronomist_review",
    "harvest_result",
    "demo_fixture",
  ]),
  notes: z.string().optional(),
  description: z.string().min(1, "Description required"),
});

type EvidenceInput = z.input<typeof evidenceSchema>;
type EvidenceValues = z.output<typeof evidenceSchema>;

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function InvestmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const partnershipId = Number(params.id);
  const partnershipIdValid = Number.isFinite(partnershipId);

  const tm = useTranslations("milestones");
  const tp = useTranslations("partnership");
  const ti = useTranslations("investments");
  const tc = useTranslations("common");
  const tl = useTranslations("lot");

  const fromFarmer = searchParams.get("from") === "farmer";
  const backPath = fromFarmer ? "/dashboard/farmer/investments" : "/my-investments";
  const backLabel = fromFarmer ? ti("back_to_farm_investments") : ti("back_to_my_investments");

  const { data: user } = useCurrentUser();

  const { data: partnership, isLoading, isError } = useQuery(
    trpc.partnerships.byId.queryOptions(
      { id: partnershipId },
      { enabled: partnershipIdValid },
    ),
  );

  const [recordingMilestone, setRecordingMilestone] = useState<number | null>(null);
  const [settlementDone, setSettlementDone] = useState(false);

  const form = useForm<EvidenceInput, unknown, EvidenceValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: { evidenceType: "demo_fixture", notes: "", description: "" },
  });

  const requestSettlement = useMutation(
    trpc.settlements.create.mutationOptions({
      onSuccess: () => {
        setSettlementDone(true);
        void queryClient.invalidateQueries({
          queryKey: trpc.partnerships.byId.queryKey({ id: partnershipId }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.settlements.byPartnership.queryKey({ partnershipId }),
        });
      },
    }),
  );

  const { data: settlement } = useQuery(
    trpc.settlements.byPartnership.queryOptions(
      { partnershipId },
      { enabled: partnershipIdValid },
    ),
  );

  const createEvidence = useMutation(
    trpc.evidence.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.partnerships.byId.queryKey({ id: partnershipId }),
        });
        setRecordingMilestone(null);
        form.reset({ evidenceType: "demo_fixture", notes: "", description: "" });
      },
    }),
  );

  async function onSubmit(values: EvidenceValues) {
    if (!user || !partnership) return;
    const artifactHash = await sha256Hex(values.description);
    createEvidence.mutate({
      partnershipId,
      milestoneNumber: recordingMilestone!,
      evidenceType: values.evidenceType,
      notes: values.notes || undefined,
      artifactHash,
      attesterUserId: user.id,
      attesterRole: user.role,
      demoOnly: false,
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {tp("failed_load")}
          </p>
        </GlassCard>
      </div>
    );
  }

  if (!partnership) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">{tp("not_found")}</p>
        </GlassCard>
      </div>
    );
  }

  const lot = partnership.lot;
  const plan = partnership.plan;
  const evidenceRecords = partnership.evidenceRecords;

  const evidenceByMilestone = new Map<number, typeof evidenceRecords>();
  for (const ev of evidenceRecords) {
    const arr = evidenceByMilestone.get(ev.milestoneNumber) ?? [];
    arr.push(ev);
    evidenceByMilestone.set(ev.milestoneNumber, arr);
  }

  const ticketUsd = plan ? plan.ticketCents / 100 : 0;

  return (
    <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>

        <GlassCard className="p-8 border-primary/20 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-4xl">✨</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold uppercase">{tp("phygital_title")}</h1>
              <p className="text-primary font-semibold">
                {lot.farmName} • {lot.code ?? tl("lot_id", { id: lot.id })}
              </p>
            </div>
            <Badge
              className={
                partnership.status === "active"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }
            >
              {tp(`status_${partnership.status}` as Parameters<typeof tp>[0]) ?? partnership.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-gray-400">{tp("lot_label")}</p>
              <p className="text-lg font-bold">{lot.code ?? `#${lot.id}`}</p>
            </div>
            <div>
              <p className="text-gray-400">{tp("area_label")}</p>
              <p className="text-lg font-bold">{lot.areaManzanas ?? "—"} mz</p>
            </div>
            <div>
              <p className="text-gray-400">{tp("ticket_label")}</p>
              <p className="text-lg font-bold text-primary">
                ${ticketUsd.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400">{tp("location_label")}</p>
              <p className="text-lg font-bold">
                {lot.region}, {lot.country}
              </p>
            </div>
          </div>

          {plan && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">{tp("price_lb")}</p>
                <p className="font-bold">${(plan.priceCentsPerLb / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">{tp("farmer_split")}</p>
                <p className="font-bold">{(plan.splitFarmerBps / 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-gray-400">{tp("proj_yield")}</p>
                <p className="font-bold">{(plan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq</p>
              </div>
              <div>
                <p className="text-gray-400">{tp("plan_status")}</p>
                <p className="font-bold capitalize">{plan.status.replace(/_/g, " ")}</p>
              </div>
            </div>
          )}
        </GlassCard>

        {(() => {
          const completedCount = MILESTONES.filter(
            (ms) => (evidenceByMilestone.get(ms.number) ?? []).length > 0,
          ).length;
          const releasedUsd = plan
            ? MILESTONES.filter(
                (ms) => (evidenceByMilestone.get(ms.number) ?? []).length > 0,
              ).reduce((s, ms) => s + ticketUsd * ms.capitalPct, 0)
            : 0;
          return (
            <GlassCard className="p-6 border-primary/20 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">{tm("title")}</h2>
                <span className="text-sm text-gray-400">
                  {tm("complete_count", { completed: completedCount, total: MILESTONES.length })}
                </span>
              </div>
              <Progress
                value={(completedCount / MILESTONES.length) * 100}
                className="h-2"
              />
              {plan && (
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs text-gray-400">{tm("total_escrow")}</p>
                    <p className="font-bold text-primary">${Math.round(ticketUsd).toLocaleString()} USDC</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{tm("released", { completed: completedCount })}</p>
                    <p className="font-bold text-green-400">${Math.round(releasedUsd).toLocaleString()} USDC</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{tm("remaining")}</p>
                    <p className="font-bold text-white">${Math.round(ticketUsd - releasedUsd).toLocaleString()} USDC</p>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {MILESTONES.map((ms) => {
            const records = evidenceByMilestone.get(ms.number) ?? [];
            const hasEvidence = records.length > 0;
            const latestRecord = records[records.length - 1];
            const statusColor = hasEvidence
              ? "border-emerald-500/30"
              : "border-white/10";

            return (
              <GlassCard key={ms.number} className={`p-5 ${statusColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ms.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500">
                        {tm("milestone_number", { number: ms.number })}
                      </p>
                      <p className="font-bold">{tm(ms.nameKey)}</p>
                    </div>
                  </div>
                  {hasEvidence ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-500 shrink-0" />
                  )}
                </div>

                {plan && (
                  <div className="mb-3">
                    {hasEvidence ? (
                      <span className="text-xs text-primary font-medium">{tm("capital_released")}</span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {tm("capital_pending", { amount: Math.round(ticketUsd * ms.capitalPct).toLocaleString() })}
                      </span>
                    )}
                  </div>
                )}

                {records.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {records.map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs bg-white/5 px-2 py-1.5 rounded space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={
                              ev.status === "attested"
                                ? "text-emerald-400"
                                : ev.status === "recorded"
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                            }
                          >
                            {ev.evidenceType} · {ev.status}
                          </span>
                        </div>
                        {ev.notes && (
                          <p className="text-gray-500">{ev.notes}</p>
                        )}
                        <div className="flex items-center gap-1 text-gray-600 font-mono">
                          <span className="truncate max-w-[180px]">
                            {ev.artifactHash}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard.writeText(ev.artifactHash)
                            }
                            className="shrink-0 hover:text-gray-300 transition-colors"
                            title="Copy hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-white/10 text-white/70 hover:border-white/30 hover:text-white text-xs"
                  onClick={() => {
                    setRecordingMilestone(ms.number);
                    form.reset({
                      evidenceType: "demo_fixture",
                      notes: "",
                      description: "",
                    });
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {latestRecord ? tm("add_more_evidence") : tm("record_evidence")}
                </Button>
              </GlassCard>
            );
          })}
        </div>

        {(() => {
          const allRecorded = evidenceRecords.length >= 6;

          if (partnership.status === "settled") {
            return (
              <GlassCard className="p-6 border-emerald-500/20">
                <h2 className="text-xl font-bold mb-4">{tm("settlement")}</h2>
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{tm("settlement_settled")}</span>
                </div>
              </GlassCard>
            );
          }

          if (!allRecorded) {
            return (
              <GlassCard className="p-6 border-white/10">
                <h2 className="text-xl font-bold mb-4">{tm("settlement")}</h2>
                <p className="text-gray-400 text-sm">
                  {tm("settlement_not_ready", { recorded: evidenceRecords.length })}
                </p>
              </GlassCard>
            );
          }

          const yieldQq = plan ? plan.projectedYieldY1TenthsQq / 10 : 0;
          const yieldLbs = Math.round(yieldQq * 100);
          const revenueCents = plan ? yieldLbs * plan.priceCentsPerLb : 0;
          const costCents = plan ? plan.ticketCents : 0;
          const profitCents = Math.max(0, revenueCents - costCents);
          const farmerBps = plan?.splitFarmerBps ?? 6000;
          const partnerBps = plan?.splitPartnerBps ?? (10000 - farmerBps);
          const farmerCents = Math.round(profitCents * farmerBps / 10000);
          const partnerCents = Math.round(profitCents * partnerBps / 10000);
          const fmt = (c: number) =>
            `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          if (settlementDone || !!settlement || partnership.status === "awaiting_settlement" || partnership.status === "milestones_attested") {
            const s = settlement;
            const displayRevenue = s?.revenueCents ?? revenueCents;
            const displayCost = s ? (s.revenueCents - s.profitCents) : costCents;
            const displayProfit = s?.profitCents ?? profitCents;
            const displayFarmerCents = s?.farmerCents ?? farmerCents;
            const displayPartnerCents = s?.partnerCents ?? partnerCents;
            const displayStatus = s?.status ?? "intent_created";
            return (
              <GlassCard className="p-6 border-emerald-500/20">
                <h2 className="text-xl font-bold mb-4">{tm("settlement")}</h2>
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">{tm("settlement_requested")}</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  {tm("pending_review", { status: displayStatus.replace(/_/g, " ") })}
                </p>
                <div className="space-y-2 text-sm border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{tm("gross_revenue")}</span>
                    <span className="font-semibold">{fmt(displayRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{tm("agronomic_cost")}</span>
                    <span className="font-semibold text-red-400">−{fmt(displayCost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="text-gray-400">{tm("net_profit")}</span>
                    <span className="font-bold text-emerald-400">{fmt(displayProfit)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-400">
                      {tm("your_share", { pct: (partnerBps / 100).toFixed(0) })}
                    </span>
                    <span className="font-bold text-primary">{fmt(displayPartnerCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {tm("farmer_share", { pct: (farmerBps / 100).toFixed(0) })}
                    </span>
                    <span className="font-semibold">{fmt(displayFarmerCents)}</span>
                  </div>
                </div>
              </GlassCard>
            );
          }

          return (
            <GlassCard className="p-6 border-primary/20">
              <h2 className="text-xl font-bold mb-4">{tm("settlement")}</h2>
              <div className="flex items-center gap-2 text-emerald-400 mb-6">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">{tm("all_recorded")}</span>
              </div>

              {plan ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{tm("revenue_label")}</p>
                    <p className="text-base font-bold">{fmt(revenueCents)}</p>
                    <p className="text-xs text-gray-500">
                      {yieldLbs.toLocaleString()} lbs × ${(plan.priceCentsPerLb / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{tm("cost_label")}</p>
                    <p className="text-base font-bold">{fmt(costCents)}</p>
                    <p className="text-xs text-gray-500">{tm("agronomic_investment")}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{tm("profit_label")}</p>
                    <p className="text-base font-bold text-emerald-400">{fmt(profitCents)}</p>
                    <p className="text-xs text-gray-500">{tm("revenue_minus_cost")}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{tm("farmer_share_label")}</p>
                    <p className="text-base font-bold text-primary">{fmt(farmerCents)}</p>
                    <p className="text-xs text-gray-500">{tm("pct_of_profit", { pct: (farmerBps / 100).toFixed(0) })}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">{tm("partner_share_label")}</p>
                    <p className="text-base font-bold text-primary">{fmt(partnerCents)}</p>
                    <p className="text-xs text-gray-500">{tm("pct_of_profit", { pct: (partnerBps / 100).toFixed(0) })}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm mb-6">
                  {tm("no_plan_financials")}
                </p>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-bold h-11"
                disabled={requestSettlement.isPending || !user || !plan}
                onClick={async () => {
                  if (!user || !plan) return;
                  const combined = evidenceRecords
                    .map((ev) => ev.artifactHash)
                    .join("|");
                  const harvestEvidenceHash = await sha256Hex(combined);
                  requestSettlement.mutate({
                    partnershipId,
                    status: "intent_created",
                    year: new Date().getFullYear(),
                    yieldTenthsQq: plan.projectedYieldY1TenthsQq,
                    scaScoreTenths: lot.scaScoreTenths ?? 845,
                    priceCentsPerLb: plan.priceCentsPerLb,
                    revenueCents,
                    profitCents,
                    farmerCents,
                    partnerCents,
                    harvestEvidenceHash,
                  });
                }}
              >
                {requestSettlement.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  tm("request_settlement")
                )}
              </Button>
            </GlassCard>
          );
        })()}

        {fromFarmer && (
          <GlassCard className="mt-6 p-6 border-white/10">
            <h3 className="text-lg font-bold mb-3">{tp("wallet_info_title")}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {tp("wallet_info_desc", {
                amount: plan
                  ? `$${(plan.ticketCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "—",
              })}
            </p>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="font-semibold text-white mb-0.5">MetaMask</p>
                <p className="text-gray-400">{tp("wallet_metamask")}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="font-semibold text-white mb-0.5">MiniPay</p>
                <p className="text-gray-400">{tp("wallet_minipay")}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="text-gray-400">{tp("wallet_help")}</p>
              </div>
            </div>
          </GlassCard>
        )}

      <Dialog
        open={recordingMilestone !== null}
        onOpenChange={(open) => {
          if (!open) setRecordingMilestone(null);
        }}
      >
        <DialogContent className="bg-[#001020] text-white border-primary/20">
          <DialogHeader>
            <DialogTitle>
              {tm("record_dialog_title", { number: recordingMilestone ?? 0 })}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {MILESTONES.find((m) => m.number === recordingMilestone) &&
                tm(MILESTONES.find((m) => m.number === recordingMilestone)!.nameKey)}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-2"
            >
              <FormField
                control={form.control}
                name="evidenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tm("evidence_type")}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full bg-black/20 border border-white/10 text-white p-2 rounded"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="demo_fixture">{tm("evidence_demo")}</option>
                        <option value="photo">{tm("evidence_photo")}</option>
                        <option value="sensor_snapshot">{tm("evidence_sensor")}</option>
                        <option value="receipt">{tm("evidence_receipt")}</option>
                        <option value="agronomist_review">{tm("evidence_agronomist")}</option>
                        <option value="harvest_result">{tm("evidence_harvest")}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tm("description_label")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={tm("description_placeholder")}
                        className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tm("notes_label")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={tm("notes_placeholder")}
                        className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-white/70"
                  onClick={() => setRecordingMilestone(null)}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createEvidence.isPending || !user}
                  className="flex-1 bg-primary hover:bg-primary/90 text-[#001020] font-bold"
                >
                  {createEvidence.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    tm("save_evidence")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
