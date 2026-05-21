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

import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

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
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
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
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white">
            {t("welcome", { name: user?.displayName ?? "" })}
          </h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-white/70">
            {t("logged_as_farmer")}{" "}
            <span className="text-primary font-semibold">{t("partner_role")}</span>
          </p>
        </div>
        <Button
          className="bg-primary text-[#001020] hover:bg-primary/90 w-full md:w-auto"
          onClick={() => router.push("/dashboard/player/explore" as Route)}
        >
          {t("explore_farms")}
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </header>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20 mb-8">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load_investments")}
          </p>
        </GlassCard>
      ) : !partnerships || partnerships.length === 0 ? (
        <GlassCard className="p-8 md:p-12 text-center border-primary/20 flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sprout className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-3">
            {t("no_investments_title")}
          </h2>
          <p className="text-white/60 max-w-md mx-auto mb-8 text-sm md:text-base">
            {t("no_investments_subtitle")}
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-[#001020] font-bold w-full md:w-auto"
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
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8"
          >
            <motion.div variants={item}>
              <GlassCard className="border-primary/20 bg-white/[0.03] p-4 md:p-6 flex items-center md:flex-col md:text-center group hover:border-primary/40 transition-colors h-full gap-4 md:gap-0">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center md:mb-4 group-hover:scale-110 transition-transform shrink-0">
                  <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex flex-col md:items-center flex-1">
                  <p className="stat-label mb-0.5 md:mb-1 text-[10px] md:text-xs text-left md:text-center">{t("total_invested")}</p>
                  <p className="stat-value text-2xl md:text-3xl text-left md:text-center leading-none">
                    {formatUsdFromCents(totalInvestedCents)}
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div variants={item}>
              <GlassCard className="border-primary/20 bg-white/[0.03] p-4 md:p-6 flex items-center md:flex-col md:text-center group hover:border-primary/40 transition-colors h-full gap-4 md:gap-0">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center md:mb-4 group-hover:scale-110 transition-transform shrink-0">
                  <Sprout className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex flex-col md:items-center flex-1">
                  <p className="stat-label mb-0.5 md:mb-1 text-[10px] md:text-xs text-left md:text-center">{t("active_farms")}</p>
                  <p className="stat-value text-2xl md:text-3xl text-left md:text-center leading-none">
                    {activeFarmsCount}
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div variants={item} className="col-span-1 sm:col-span-1">
              <GlassCard className="border-primary/20 bg-white/[0.03] p-4 md:p-6 flex items-center md:flex-col md:text-center group hover:border-primary/40 transition-colors h-full gap-4 md:gap-0">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center md:mb-4 group-hover:scale-110 transition-transform shrink-0">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="flex flex-col md:items-center flex-1">
                  <p className="stat-label mb-0.5 md:mb-1 text-[10px] md:text-xs text-left md:text-center">{t("avg_partner_split")}</p>
                  <p className="stat-value text-2xl md:text-3xl text-left md:text-center leading-none">
                    {avgSplitBps != null
                      ? `${(avgSplitBps / 100).toFixed(1)}%`
                      : "--"}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>

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
