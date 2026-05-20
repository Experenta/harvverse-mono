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
import { ProposalCard } from "@/components/proposal-card";

const PROPOSAL_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-gray-500/20 text-white/60 border-gray-500/30",
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
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard/farmer")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Inbox className="size-6 md:size-8 text-primary shrink-0" />
            <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              {t("title")}
              {pendingCount > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] md:text-xs font-black rounded-full px-2 py-0.5 shadow-lg shadow-yellow-500/20">
                  {pendingCount}
                </span>
              )}
            </h1>
          </div>
        </div>
        <p className="text-white/50 text-sm md:text-base sm:ml-12">{t("subtitle")}</p>
      </div>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {tc("error")}
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <Inbox className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <p className="text-white/60 text-lg mb-2">{t("no_proposals")}</p>
          <p className="text-white/45 text-sm">{t("no_proposals_subtitle")}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              variant="farmer"
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={approve.isPending || reject.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
