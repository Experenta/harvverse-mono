"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";
import { ProposalCard } from "@/components/proposal-card";

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-gray-500/20 text-white/60 border-gray-500/30",
};

export default function MyProposalsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("proposals");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const {
    data: proposals,
    isLoading: proposalsLoading,
    isError,
  } = useQuery(
    trpc.proposals.myProposals.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || proposalsLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70 px-0 md:px-4"
          onClick={() => router.push("/dashboard/player" as Route)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tc("back_to_dashboard")}
        </Button>

        <header className="mb-8">
          <h1 className="font-trenda text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">{t("my_proposals_title")}</h1>
          <p className="text-sm md:text-base text-white/60">{t("my_proposals_subtitle")}</p>
        </header>

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
            <FileText className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-2">{t("no_my_proposals")}</p>
            <p className="text-white/45 text-sm mb-6">{t("no_my_proposals_subtitle")}</p>
            <Button
              onClick={() => router.push("/dashboard/player/explore" as Route)}
              className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
            >
              {t("explore_lots")}
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} variant="player" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
