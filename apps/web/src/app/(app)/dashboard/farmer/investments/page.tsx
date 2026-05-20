"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, DollarSign, AlertCircle } from "lucide-react";

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
  milestones_attested: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awaiting_settlement: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  settled: "bg-gray-500/20 text-white/60 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function FarmerInvestmentsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("investments");
  const tp = useTranslations("partnership");
  const tl = useTranslations("lot");

  const {
    data: partnerships,
    isLoading: partnershipLoading,
    isError,
  } = useQuery(
    trpc.partnerships.forFarmer.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || partnershipLoading;

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
            <DollarSign className="size-6 md:size-8 text-primary shrink-0" />
            <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white">
              {t("farmer_title")}
            </h1>
          </div>
        </div>
        <p className="text-white/50 text-sm md:text-base sm:ml-12">{t("farmer_subtitle")}</p>
      </div>

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
        <GlassCard className="p-12 text-center border-primary/20">
          <DollarSign className="mx-auto mb-4 size-12 text-white/60" />
          <p className="mb-2 text-lg text-white/60">{t("no_partnerships")}</p>
          <p className="text-sm text-white/45">{t("partnerships_appear")}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {partnerships.map((p) => (
            <InvestmentCard key={p.id} partnership={p} variant="farmer" />
          ))}
        </div>
      )}
    </div>
  );
}
