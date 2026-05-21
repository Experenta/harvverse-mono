"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sprout, Plus, ArrowLeft, AlertCircle } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";
import { FarmCard } from "@/components/farm-card";


export default function MyFarmsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("farm");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const { data: farms, isLoading, isError } = useQuery(
    trpc.farms.list.queryOptions(
      { farmerId: user?.id },
      { enabled: !!user },
    ),
  );

  const farmsToShow = farms ?? [];
  const isLoadingFarms = userLoading || isLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 hover:bg-white/5 hover:text-white px-0 md:px-4"
        onClick={() => router.push("/dashboard/farmer")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back_to_dashboard")}
      </Button>

      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white leading-tight">{tn("my_farms")}</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-white/60">{t("no_farms_subtitle")}</p>
        </div>
        <Button
          className="bg-primary font-bold text-[#001020] hover:bg-primary/90 w-full md:w-auto"
          onClick={() => router.push("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-2" />
          {tc("add_farm")}
        </Button>
      </header>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load")}
          </p>
        </GlassCard>
      ) : isLoadingFarms ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <GlassCard key={idx} className="p-6 border-primary/20">
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-9 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : farmsToShow.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Sprout className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-trenda text-2xl font-bold text-white mb-3">{t("no_farms_yet")}</h2>
          <p className="text-white/70 mb-8 max-w-md">{t("no_farms_subtitle")}</p>
          <Button
            className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
            onClick={() => router.push("/dashboard/farmer/create-farm")}
          >
            {t("register_first")}
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {farmsToShow.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </div>
  );
}
