"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Inbox, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";

const PROPOSAL_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function FarmerProposalsPage() {
  const router = useRouter();
  const { clerkUser } = useCurrentUser();
  const t = useTranslations("proposals");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const {
    data: proposals,
    isLoading,
    isError,
  } = useQuery(
    trpc.proposals.forFarmer.queryOptions(undefined, {
      enabled: !!clerkUser?.id,
    }),
  );

  const approve = useMutation(trpc.proposals.approve.mutationOptions());
  const reject = useMutation(trpc.proposals.reject.mutationOptions());

  async function handleApprove(proposalId: number) {
    await approve.mutateAsync({ proposalId });
    await queryClient.invalidateQueries({
      queryKey: trpc.proposals.forFarmer.queryKey(),
    });
  }

  async function handleReject(proposalId: number) {
    await reject.mutateAsync({ proposalId });
    await queryClient.invalidateQueries({
      queryKey: trpc.proposals.forFarmer.queryKey(),
    });
  }

  const pendingCount = proposals?.filter(
    (p) => p.status === "pending" || p.status === "submitted",
  ).length ?? 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/farmer")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Inbox className="w-8 h-8 text-primary" />
            {t("title")}
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-black text-sm font-bold rounded-full px-2 py-0.5">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400">{t("subtitle")}</p>
        </div>
      </div>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {tc("error")}
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">{t("no_proposals")}</p>
          <p className="text-gray-500 text-sm">{t("no_proposals_subtitle")}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {proposals.map((p) => {
            const plan = p.plan;
            const lot = p.lot;
            const partner = p.user;
            const statusClass =
              PROPOSAL_STATUS_CLASSES[p.status] ??
              "bg-gray-500/20 text-gray-400 border-gray-500/30";
            const isPending = p.status === "pending" || p.status === "submitted";

            return (
              <GlassCard key={p.id} className="p-6 border-primary/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {lot.farmName} — {lot.code ?? tl("lot_id", { id: lot.id })}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {t("partner_label")}:{" "}
                      <span className="text-white font-medium">
                        {partner?.displayName ?? t("unknown_partner")}
                      </span>
                      {partner?.country ? (
                        <span className="text-gray-500 ml-2">· {partner.country}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusClass}>
                      {t(`status_${p.status}` as Parameters<typeof t>[0]) ?? p.status}
                    </Badge>
                    {plan && (
                      <p className="text-xl font-bold text-primary">
                        {formatUsdFromCents(plan.ticketCents)}
                      </p>
                    )}
                  </div>
                </div>

                {plan && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-y border-white/10 text-sm mb-4">
                    <div>
                      <p className="text-xs text-gray-400">{t("ticket_label")}</p>
                      <p className="font-medium mt-1 text-primary">
                        {formatUsdFromCents(plan.ticketCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t("partner_split_label")}</p>
                      <p className="font-medium mt-1">
                        {plan.splitPartnerBps ? `${plan.splitPartnerBps / 100}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t("farmer_split_label")}</p>
                      <p className="font-medium mt-1">
                        {(plan.splitFarmerBps / 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )}

                {p.message ? (
                  <div className="bg-white/5 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-1">{t("partner_message")}</p>
                    <p className="text-sm text-gray-300">{p.message}</p>
                  </div>
                ) : null}

                {isPending && (
                  <div className="flex gap-3">
                    <Button
                      className="bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold flex-1"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => handleApprove(p.id)}
                    >
                      {approve.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {t("approve")}
                    </Button>
                    <Button
                      className="bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold flex-1"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => handleReject(p.id)}
                    >
                      {reject.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {t("reject")}
                    </Button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
