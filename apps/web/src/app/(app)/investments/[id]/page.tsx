"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Copy, Plus, Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harvverse-monorepo/ui/components/select";

const MILESTONES = [
  { number: 1, nameKey: "soil_prep", capitalPct: 0.111 },
  { number: 2, nameKey: "planting", capitalPct: 0.066 },
  { number: 3, nameKey: "maintenance", capitalPct: 0.051 },
  { number: 4, nameKey: "harvest", capitalPct: 0.061 },
  { number: 5, nameKey: "processing", capitalPct: 0.134 },
  { number: 6, nameKey: "export", capitalPct: 0.012 },
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

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
          <p className="text-white/60">{tp("not_found")}</p>
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
    <div className="max-w-5xl mx-auto px-4 md:px-0 text-[#EEEEEE]">
        <Button
          variant="ghost"
          className="mb-4 md:mb-8 text-white/70 px-0 md:px-4"
          onClick={() => router.push(backPath)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-5 md:p-8 border-primary/20 mb-6 md:mb-8">
            <div className="flex items-start gap-4 mb-6 md:mb-8">
              <span className="flex size-10 md:size-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25 shrink-0">
                <CheckCircle2 className="size-5 md:size-6" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                  <div>
                    <h1 className="font-trenda text-lg md:text-2xl font-bold uppercase text-white leading-tight mb-0.5">{tp("phygital_title")}</h1>
                    <p className="text-primary font-bold text-xs md:text-base truncate">
                      {lot.farmName} • {lot.code ?? tl("lot_id", { id: lot.id })}
                    </p>
                  </div>
                  <Badge
                    className={`self-start uppercase px-2 py-0.5 text-[9px] md:text-xs font-black tracking-widest ${
                      partnership.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }`}
                  >
                    {tp(`status_${partnership.status}` as Parameters<typeof tp>[0]) ?? partnership.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 text-sm">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("lot_label")}</p>
                <p className="text-sm md:text-lg font-bold truncate">{lot.code ?? `#${lot.id}`}</p>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("area_label")}</p>
                <p className="text-sm md:text-lg font-bold">{lot.areaManzanas ?? "—"} mz</p>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("ticket_label")}</p>
                <p className="text-sm md:text-lg font-bold text-primary">
                  ${ticketUsd.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("location_label")}</p>
                <p className="text-sm md:text-lg font-bold truncate">
                  {lot.country}
                </p>
              </div>
            </div>

            {plan && (
              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 md:gap-y-6 text-sm">
                <div>
                  <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("price_lb")}</p>
                  <p className="font-bold text-white/80 text-xs md:text-base">${(plan.priceCentsPerLb / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("farmer_split")}</p>
                  <p className="font-bold text-white/80 text-xs md:text-base">{(plan.splitFarmerBps / 100).toFixed(0)}%</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("proj_yield")}</p>
                  <p className="font-bold text-white/80 text-xs md:text-base">{(plan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-white/40 text-[9px] md:text-[10px] uppercase tracking-wider mb-1 font-semibold">{tp("plan_status")}</p>
                  <Badge variant="outline" className="text-[9px] font-medium border-white/10 text-white/60 capitalize">
                    {plan.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

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
            <GlassCard className="p-5 md:p-6 border-primary/20 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base md:text-xl font-bold uppercase tracking-widest">{tm("title")}</h2>
                <span className="text-[9px] md:text-sm text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-bold">
                  {completedCount} / {MILESTONES.length}
                </span>
              </div>
              <Progress
                value={(completedCount / MILESTONES.length) * 100}
                className="h-1.5"
              />
              {plan && (
                <div className="mt-6 grid grid-cols-3 gap-2 md:gap-4 text-center border-t border-white/5 pt-6">
                  <div>
                    <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-wider mb-1 font-semibold">{tm("total_escrow")}</p>
                    <p className="font-bold text-primary text-sm md:text-lg">${Math.round(ticketUsd).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-wider mb-1 font-semibold">{tm("released_short") ?? "Released"}</p>
                    <p className="font-bold text-emerald-400 text-sm md:text-lg">${Math.round(releasedUsd).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-wider mb-1 font-semibold">{tm("remaining")}</p>
                    <p className="font-bold text-white text-sm md:text-lg">${Math.round(ticketUsd - releasedUsd).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })()}

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MILESTONES.map((ms) => {
            const records = evidenceByMilestone.get(ms.number) ?? [];
            const hasEvidence = records.length > 0;
            const latestRecord = records[records.length - 1];
            const statusColor = hasEvidence
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-white/10 bg-white/[0.02]";

            return (
              <motion.div key={ms.number} variants={item}>
                <GlassCard className={`p-4 h-full flex flex-col ${statusColor} transition-colors hover:border-white/20`}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ring-1 transition-all ${
                        hasEvidence ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" : "bg-white/5 text-white/40 ring-white/10"
                      }`}>
                        {ms.number}
                      </span>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-tight font-semibold">
                          {tm("milestone_number", { number: ms.number })}
                        </p>
                        <p className="font-trenda text-sm font-bold text-white leading-tight">{tm(ms.nameKey)}</p>
                      </div>
                    </div>
                    {hasEvidence ? (
                      <div className="p-1 rounded-full bg-emerald-500/10">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-white/5">
                        <Clock className="size-3.5 text-white/30" />
                      </div>
                    )}
                  </div>

                  {plan && (
                    <div className="mb-4">
                      {hasEvidence ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded">
                          <TrendingUp className="size-2.5" />
                          {tm("capital_released")}
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/40 font-medium">
                          {tm("capital_pending", { amount: Math.round(ticketUsd * ms.capitalPct).toLocaleString() })}
                        </div>
                      )}
                    </div>
                  )}

                  {records.length > 0 && (
                    <div className="mb-4 flex flex-col gap-1.5">
                      {records.slice(-2).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex flex-col gap-1 rounded-lg bg-black/20 border border-white/5 px-2.5 py-2 text-[10px]"
                        >
                          <div className="flex justify-between items-center">
                            <span
                              className={`font-bold uppercase tracking-tighter ${
                                ev.status === "attested"
                                  ? "text-emerald-400"
                                  : ev.status === "recorded"
                                    ? "text-yellow-400"
                                    : "text-white/40"
                              }`}
                            >
                              {ev.evidenceType.replace(/_/g, " ")}
                            </span>
                          </div>
                          {ev.notes && (
                            <p className="text-white/60 line-clamp-1 italic">"{ev.notes}"</p>
                          )}
                        </div>
                      ))}
                      {records.length > 2 && (
                        <p className="text-[9px] text-white/30 text-center italic">
                          + {records.length - 2} more records
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full border-white/10 bg-white/5 text-[10px] font-bold text-white/70 hover:border-white/30 hover:text-white transition-all"
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
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        {(() => {
          const allRecorded = evidenceRecords.length >= 6;

          if (partnership.status === "settled") {
            return (
              <GlassCard className="p-5 md:p-6 border-emerald-500/20">
                <h2 className="text-lg md:text-xl font-bold mb-4">{tm("settlement")}</h2>
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  <span className="font-semibold text-sm md:text-base">{tm("settlement_settled")}</span>
                </div>
              </GlassCard>
            );
          }

          if (!allRecorded) {
            return (
              <GlassCard className="p-6 border-white/10">
                <h2 className="text-xl font-bold mb-4">{tm("settlement")}</h2>
                <p className="text-white/60 text-sm">
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
              <GlassCard className="p-5 md:p-6 border-emerald-500/20">
                <h2 className="text-lg md:text-xl font-bold mb-4">{tm("settlement")}</h2>
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle2 className="size-5" />
                  <span className="font-semibold text-sm md:text-base">{tm("settlement_requested")}</span>
                </div>
                <p className="text-xs md:text-sm text-white/50 mb-6">
                  {tm("pending_review", { status: displayStatus.replace(/_/g, " ") })}
                </p>
                <div className="space-y-3 text-sm border-t border-white/5 pt-6">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white/40 text-xs uppercase tracking-wider">{tm("gross_revenue")}</span>
                    <span className="font-bold text-white">{fmt(displayRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white/40 text-xs uppercase tracking-wider">{tm("agronomic_cost")}</span>
                    <span className="font-bold text-red-400">−{fmt(displayCost)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-300/60 text-xs uppercase tracking-wider">{tm("net_profit")}</span>
                    <span className="font-bold text-emerald-300">{fmt(displayProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-primary/20 mt-4">
                    <span className="text-primary/60 text-xs uppercase tracking-wider">
                      {tm("your_share", { pct: (partnerBps / 100).toFixed(0) })}
                    </span>
                    <span className="font-black text-primary text-base md:text-lg">{fmt(displayPartnerCents)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white/40 text-xs uppercase tracking-wider">
                      {tm("farmer_share", { pct: (farmerBps / 100).toFixed(0) })}
                    </span>
                    <span className="font-bold text-white/80">{fmt(displayFarmerCents)}</span>
                  </div>
                </div>
              </GlassCard>
            );
          }

          return (
            <GlassCard className="p-5 md:p-6 border-primary/20">
              <h2 className="text-lg md:text-xl font-bold mb-4">{tm("settlement")}</h2>
              <div className="flex items-center gap-2 text-emerald-400 mb-6">
                <CheckCircle2 className="size-5" />
                <span className="font-semibold text-sm md:text-base">{tm("all_recorded")}</span>
              </div>

              {plan ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 text-sm">
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.08] transition-colors">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tm("revenue_label")}</p>
                    <p className="text-base font-bold text-white">{fmt(revenueCents)}</p>
                    <p className="text-[10px] text-white/30 mt-1">
                      {yieldLbs.toLocaleString()} lbs × ${(plan.priceCentsPerLb / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.08] transition-colors">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tm("cost_label")}</p>
                    <p className="text-base font-bold text-white">{fmt(costCents)}</p>
                    <p className="text-[10px] text-white/30 mt-1">{tm("agronomic_investment")}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.08] transition-colors">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tm("profit_label")}</p>
                    <p className="text-base font-bold text-emerald-400">{fmt(profitCents)}</p>
                    <p className="text-[10px] text-white/30 mt-1">{tm("revenue_minus_cost")}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.08] transition-colors">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tm("farmer_share_label")}</p>
                    <p className="text-base font-bold text-primary">{fmt(farmerCents)}</p>
                    <p className="text-[10px] text-white/30 mt-1">{tm("pct_of_profit", { pct: (farmerBps / 100).toFixed(0) })}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.08] transition-colors">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tm("partner_share_label")}</p>
                    <p className="text-base font-bold text-primary">{fmt(partnerCents)}</p>
                    <p className="text-[10px] text-white/30 mt-1">{tm("pct_of_profit", { pct: (partnerBps / 100).toFixed(0) })}</p>
                  </div>
                </div>
              ) : (
                <p className="text-white/60 text-sm mb-6">
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
            <p className="text-sm text-white/60 mb-4">
              {tp("wallet_info_desc", {
                amount: plan
                  ? `$${(plan.ticketCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "—",
              })}
            </p>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="font-semibold text-white mb-0.5">MetaMask</p>
                <p className="text-white/60">{tp("wallet_metamask")}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="font-semibold text-white mb-0.5">MiniPay</p>
                <p className="text-white/60">{tp("wallet_minipay")}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <p className="text-white/60">{tp("wallet_help")}</p>
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
            <DialogDescription className="text-white/60">
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={tm("evidence_type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo_fixture">{tm("evidence_demo")}</SelectItem>
                          <SelectItem value="photo">{tm("evidence_photo")}</SelectItem>
                          <SelectItem value="sensor_snapshot">{tm("evidence_sensor")}</SelectItem>
                          <SelectItem value="receipt">{tm("evidence_receipt")}</SelectItem>
                          <SelectItem value="agronomist_review">{tm("evidence_agronomist")}</SelectItem>
                          <SelectItem value="harvest_result">{tm("evidence_harvest")}</SelectItem>
                        </SelectContent>
                      </Select>
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
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/35"
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
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/35"
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
