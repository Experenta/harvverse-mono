"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, Sprout, TrendingUp, ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

export default function PlayerDashboardPage() {
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const t = useTranslations("dashboard");

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

  if (!userLoading && user && user.role !== "partner") {
    router.replace("/dashboard/farmer");
    return null;
  }

  if (isLoading) {
    return (
      <div>
        <header className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const totalInvestedCents = partnerships?.reduce(
    (sum, p) => sum + (p.plan?.ticketCents ?? 0),
    0,
  ) ?? 0;

  const activeFarmsCount = new Set(
    partnerships
      ?.filter((p) => p.status === "active")
      .map((p) => p.lot.farmId),
  ).size;

  const avgSplitBps =
    partnerships && partnerships.length > 0
      ? partnerships.reduce((sum, p) => sum + (p.plan?.splitPartnerBps ?? 0), 0) /
        partnerships.length
      : null;

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("welcome", { name: user?.displayName ?? "" })}</h1>
          <p className="text-gray-400">
            {t("logged_as_farmer")}{" "}
            <span className="text-primary font-semibold">{t("partner_role")}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-600 border border-white/10" />
      </header>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20 mb-8">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load_investments")}
          </p>
        </GlassCard>
      ) : !partnerships || partnerships.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sprout className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {t("no_investments_title")}
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            {t("no_investments_subtitle")}
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
            onClick={() =>
              router.push("/dashboard/player/explore" as Route)
            }
          >
            {t("explore_farms")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <GlassCard className="p-6 border-primary/20">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">{t("total_invested")}</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatUsdFromCents(totalInvestedCents)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-primary/20">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">{t("active_farms")}</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {activeFarmsCount}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-primary/20">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">{t("avg_partner_split")}</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {avgSplitBps != null
                      ? `${(avgSplitBps / 100).toFixed(1)}%`
                      : "--"}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() =>
                router.push("/my-investments" as Route)
              }
            >
              {t("view_all_investments")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
