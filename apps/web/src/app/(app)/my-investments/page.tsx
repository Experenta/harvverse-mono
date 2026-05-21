"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, TrendingUp, AlertCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";
import { InvestmentCard } from "@/components/investment-card";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  milestones_attested:
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awaiting_settlement:
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  settled: "bg-gray-500/20 text-white/60 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MyInvestmentsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("investments");
  const tp = useTranslations("partnership");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const {
    data: partnerships,
    isLoading: partnershipLoading,
    isError,
  } = useQuery(
    trpc.partnerships.myPartnerships.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || partnershipLoading;

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
          <h1 className="font-trenda text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">{t("my_title")}</h1>
          <p className="text-sm md:text-base text-white/60">{t("my_subtitle")}</p>
        </header>

        {isError ? (
          <GlassCard className="p-8 border-red-500/20">
            <p className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {t("failed_load")}
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
        ) : !partnerships || partnerships.length === 0 ? (
          <GlassCard className="p-12 text-center border-white/10">
            <TrendingUp className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <p className="text-white/60 mb-6">{t("no_investments")}</p>
            <Button
              className="bg-primary hover:bg-primary/90 text-[#001020]"
              onClick={() =>
                router.push("/dashboard/player/explore" as Route)
              }
            >
              {t("explore_farms")}
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {partnerships.map((p) => (
              <InvestmentCard key={p.id} partnership={p} variant="player" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
