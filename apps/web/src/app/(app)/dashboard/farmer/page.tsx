"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Leaf, Plus, Sprout } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";
import { FarmCard } from "@/components/farm-card";

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

export default function FarmerDashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tf = useTranslations("farm");

  const {
    data: farms,
    isLoading: farmsLoading,
    isError: farmsError,
  } = useQuery(
    trpc.farms.list.queryOptions(
      { farmerId: user?.id },
      {
        enabled: !!user,
        refetchInterval: (query) => {
          const data = query.state.data;
          return data?.some((farm) => farm.riskScore == null)
            ? 5000
            : false;
        },
      },
    ),
  );

  const isLoading = userLoading || farmsLoading;
  const farmsToShow = farms ?? [];
  const firstName = user?.displayName?.split(" ")[0] ?? "";
  const verifiedFarmsCount = farmsToShow.filter((farm) => farm.verified).length;

  if (!userLoading && user && user.role !== "farmer") {
    router.replace("/dashboard/player");
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white">
            {farmsToShow.length > 0
              ? `Bienvenido de nuevo, ${firstName}.`
              : t("welcome", { name: user?.displayName ?? "" })}
          </h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-white/70">
            {t("logged_as_farmer")}{" "}
            <span className="text-primary font-semibold">{t("farmer_role")}</span>
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-[#001020] w-full md:w-auto"
          onClick={() => router.push("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("new_farm")}
        </Button>
      </header>

      {farmsError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load_farms")}
          </p>
        </GlassCard>
      ) : !farms || farms.length === 0 ? (
        <GlassCard className="mx-auto flex max-w-xl flex-col items-center border-primary/20 bg-white/[0.03] p-8 text-center md:p-12">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Leaf className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-3">{tf("empty_title")}</h2>
          <p className="text-white/60 max-w-md mx-auto mb-8 text-sm md:text-base">
            {tf("empty_body")}
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-[#001020] w-full md:w-auto"
            onClick={() => router.push("/dashboard/farmer/create-farm")}
          >
            <Plus className="w-4 h-4 mr-2" />
            {tf("empty_cta")}
          </Button>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-8">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
          >
            <motion.div variants={item}>
              <GlassCard className="border-primary/20 bg-white/[0.03] p-3 md:p-6 flex flex-col items-center text-center group hover:border-primary/40 transition-colors h-full">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                  <Sprout className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                </div>
                <p className="stat-label mb-0.5 md:mb-1 text-[9px] md:text-xs">{t("my_farms")}</p>
                <p className="stat-value text-xl md:text-3xl">{farmsToShow.length}</p>
              </GlassCard>
            </motion.div>

            {/*
              Lot metrics are hidden for now while the onboarding objective is
              farm registration plus Copernicus analysis.
            */}

            <motion.div variants={item}>
              <GlassCard className="border-primary/20 bg-white/[0.03] p-3 md:p-6 flex flex-col items-center text-center group hover:border-primary/40 transition-colors h-full">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                </div>
                <p className="stat-label mb-0.5 md:mb-1 text-[9px] md:text-xs">{tf("verified")}</p>
                <p className="stat-value text-xl md:text-3xl">{verifiedFarmsCount}</p>
              </GlassCard>
            </motion.div>
          </motion.div>
          <div>
            <h2 className="section-title mb-4 text-xl md:text-2xl">{t("my_farms")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {farms.map((farm) => (
                <FarmCard key={farm.id} farm={farm} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
