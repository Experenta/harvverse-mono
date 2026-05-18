"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sprout, Plus, ArrowLeft } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { trpc } from "@/utils/trpc";

export default function FarmerFarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("farm");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      { enabled: farmIdValid },
    ),
  );

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/farmer/my-farms")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_my_farms")}
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !farm ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">{t("not_found")}</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="p-8 border-primary/20 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{farm.name}</h1>
                <p className="text-gray-400">
                  📍 {farm.region}, {farm.country}
                  {farm.altitudeMasl ? ` • ⛰️ ${farm.altitudeMasl} MASL` : null}
                </p>
              </div>
              <div className="text-sm bg-primary/20 text-primary px-3 py-1 rounded">
                {farm.verified ? t("verified") : t("pending_verification")}
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {t("investment_lots", { count: farm.lots.length })}
            </h2>
            <Button
              className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
              onClick={() =>
                router.push(
                  `/dashboard/farmer/farms/${farm.id}/create-lot` as Route,
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              {tl("create_btn")}
            </Button>
          </div>

          {farm.lots.length === 0 ? (
            <GlassCard className="p-8 text-center border-primary/20">
              <p className="text-gray-400">{t("no_lots_yet")}</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {farm.lots.map((lot) => (
                <GlassCard
                  key={lot.id}
                  className="p-6 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() =>
                    router.push(`/dashboard/farmer/lots/${lot.id}` as Route)
                  }
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold">
                        {lot.code ?? tl("lot_id", { id: lot.id })}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        <Sprout className="w-3 h-3 inline mr-1" />
                        {lot.variety ?? tc("unknown")} • {lot.areaManzanas ?? "N/A"} manzanas
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase">
                      {lot.status}
                    </Badge>
                  </div>
                  {lot.harvestYear ? (
                    <p className="text-sm text-gray-400">
                      {t("harvest_year", { year: lot.harvestYear })}
                    </p>
                  ) : null}
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
