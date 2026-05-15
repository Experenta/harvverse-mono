"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Clock, Copy, Plus, Loader2 } from "lucide-react";

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
  { number: 1, name: "Soil Preparation", icon: "🌱" },
  { number: 2, name: "Planting", icon: "🌿" },
  { number: 3, name: "Maintenance", icon: "🔧" },
  { number: 4, name: "Harvest", icon: "🌾" },
  { number: 5, name: "Processing", icon: "⚙️" },
  { number: 6, name: "Export / Delivery", icon: "🚢" },
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

  const fromFarmer = searchParams.get("from") === "farmer";
  const backPath = fromFarmer ? "/dashboard/farmer/investments" : "/my-investments";
  const backLabel = fromFarmer ? "Back to Farm Investments" : "Back to My Investments";

  const { data: user } = useCurrentUser();

  const { data: partnership, isLoading } = useQuery(
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
        queryClient.invalidateQueries({
          queryKey: trpc.partnerships.byId.queryKey({ id: partnershipId }),
        });
      },
    }),
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
      demoOnly: true,
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
          <p className="text-gray-400">Partnership not found.</p>
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
              <h1 className="text-2xl font-bold uppercase">PHYGITAL Partnership</h1>
              <p className="text-primary font-semibold">
                {lot.farmName} • {lot.code ?? `Lot #${lot.id}`}
              </p>
            </div>
            <Badge
              className={
                partnership.status === "active"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }
            >
              {partnership.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-gray-400">Lot</p>
              <p className="text-lg font-bold">{lot.code ?? `#${lot.id}`}</p>
            </div>
            <div>
              <p className="text-gray-400">Area</p>
              <p className="text-lg font-bold">{lot.areaManzanas ?? "—"} mz</p>
            </div>
            <div>
              <p className="text-gray-400">Ticket</p>
              <p className="text-lg font-bold text-primary">
                ${ticketUsd.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Location</p>
              <p className="text-lg font-bold">
                {lot.region}, {lot.country}
              </p>
            </div>
          </div>

          {plan && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Price/lb</p>
                <p className="font-bold">${(plan.priceCentsPerLb / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Farmer split</p>
                <p className="font-bold">{(plan.splitFarmerBps / 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-gray-400">Proj. yield Y1</p>
                <p className="font-bold">{(plan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq</p>
              </div>
              <div>
                <p className="text-gray-400">Plan status</p>
                <p className="font-bold capitalize">{plan.status.replace(/_/g, " ")}</p>
              </div>
            </div>
          )}
        </GlassCard>

        {(() => {
          const completedCount = MILESTONES.filter(
            (ms) => (evidenceByMilestone.get(ms.number) ?? []).length > 0,
          ).length;
          return (
            <GlassCard className="p-6 border-primary/20 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">Production Milestones</h2>
                <span className="text-sm text-gray-400">
                  {completedCount} / {MILESTONES.length} complete
                </span>
              </div>
              <Progress
                value={(completedCount / MILESTONES.length) * 100}
                className="h-2"
              />
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
                        Milestone {ms.number}
                      </p>
                      <p className="font-bold">{ms.name}</p>
                    </div>
                  </div>
                  {hasEvidence ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-500 shrink-0" />
                  )}
                </div>

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
                  {latestRecord ? "Add More Evidence" : "Record Evidence"}
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
                <h2 className="text-xl font-bold mb-4">Settlement</h2>
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>This partnership has been settled.</span>
                </div>
              </GlassCard>
            );
          }

          if (!allRecorded) {
            return (
              <GlassCard className="p-6 border-white/10">
                <h2 className="text-xl font-bold mb-4">Settlement</h2>
                <p className="text-gray-400 text-sm">
                  Settlement will be available once evidence is recorded for all
                  6 production milestones ({evidenceRecords.length}/6 recorded).
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

          if (settlementDone || partnership.status === "awaiting_settlement" || partnership.status === "milestones_attested") {
            return (
              <GlassCard className="p-6 border-emerald-500/20">
                <h2 className="text-xl font-bold mb-4">Settlement</h2>
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Settlement intent created</span>
                </div>
                <p className="text-sm text-gray-400">
                  Status:{" "}
                  <span className="text-yellow-400 font-semibold">
                    intent_created
                  </span>{" "}
                  — the settlement operator will process the final payment.
                </p>
              </GlassCard>
            );
          }

          return (
            <GlassCard className="p-6 border-primary/20">
              <h2 className="text-xl font-bold mb-4">Settlement</h2>
              <div className="flex items-center gap-2 text-emerald-400 mb-6">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">All 6 milestones recorded ✓</span>
              </div>

              {plan ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Revenue</p>
                    <p className="text-base font-bold">{fmt(revenueCents)}</p>
                    <p className="text-xs text-gray-500">
                      {yieldLbs.toLocaleString()} lbs × ${(plan.priceCentsPerLb / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Cost</p>
                    <p className="text-base font-bold">{fmt(costCents)}</p>
                    <p className="text-xs text-gray-500">Agronomic investment</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Profit</p>
                    <p className="text-base font-bold text-emerald-400">{fmt(profitCents)}</p>
                    <p className="text-xs text-gray-500">Revenue − Cost</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Farmer Share</p>
                    <p className="text-base font-bold text-primary">{fmt(farmerCents)}</p>
                    <p className="text-xs text-gray-500">{(farmerBps / 100).toFixed(0)}% of profit</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Partner Share</p>
                    <p className="text-base font-bold text-primary">{fmt(partnerCents)}</p>
                    <p className="text-xs text-gray-500">{(partnerBps / 100).toFixed(0)}% of profit</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm mb-6">
                  No plan attached — financials unavailable.
                </p>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-11"
                disabled={requestSettlement.isPending || !user || !plan}
                onClick={() => {
                  if (!user || !plan) return;
                  const harvestHash =
                    evidenceRecords[evidenceRecords.length - 1]?.artifactHash ??
                    "demo_settlement_hash";
                  requestSettlement.mutate({
                    partnershipId,
                    status: "intent_created",
                    year: new Date().getFullYear(),
                    yieldTenthsQq: plan.projectedYieldY1TenthsQq,
                    scaScoreTenths:
                      (lot as unknown as { scaScoreTenths?: number | null })
                        .scaScoreTenths ?? 800,
                    priceCentsPerLb: plan.priceCentsPerLb,
                    revenueCents,
                    profitCents,
                    farmerCents,
                    partnerCents,
                    harvestEvidenceHash: harvestHash,
                  });
                }}
              >
                {requestSettlement.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Request Settlement"
                )}
              </Button>
            </GlassCard>
          );
        })()}

      <Dialog
        open={recordingMilestone !== null}
        onOpenChange={(open) => {
          if (!open) setRecordingMilestone(null);
        }}
      >
        <DialogContent className="bg-[#1a1f3a] text-white border-primary/20">
          <DialogHeader>
            <DialogTitle>
              Record Evidence — Milestone {recordingMilestone}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {MILESTONES.find((m) => m.number === recordingMilestone)?.name}
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
                    <FormLabel>Evidence Type</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full bg-black/20 border border-white/10 text-white p-2 rounded"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="demo_fixture">Demo Fixture</option>
                        <option value="photo">Photo</option>
                        <option value="sensor_snapshot">Sensor Snapshot</option>
                        <option value="receipt">Receipt</option>
                        <option value="agronomist_review">Agronomist Review</option>
                        <option value="harvest_result">Harvest Result</option>
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
                    <FormLabel>Description (hashed as artifact fingerprint)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the evidence in detail..."
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
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEvidence.isPending || !user}
                  className="flex-1 bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
                >
                  {createEvidence.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Evidence"
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
