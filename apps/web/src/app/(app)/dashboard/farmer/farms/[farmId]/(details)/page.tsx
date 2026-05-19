"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ArrowLeft, ExternalLink } from "lucide-react";
import type { Polygon } from "geojson";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { trpc } from "@/utils/trpc";
import { useCurrentUser } from "@/hooks/use-auth";
import { LotCard } from "@/components/lot-card";

export default function FarmerFarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("farm");
  const tl = useTranslations("lot");
  const { clerkUser } = useCurrentUser();

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      { enabled: farmIdValid },
    ),
  );

  const { data: proposals } = useQuery(
    trpc.proposals.forFarmer.queryOptions(undefined, {
      enabled: !!clerkUser?.id,
    }),
  );

  const pendingByLot = proposals?.reduce<Record<number, number>>((acc, p) => {
    if (p.status === "pending" || p.status === "submitted") {
      acc[p.lotId] = (acc[p.lotId] ?? 0) + 1;
    }
    return acc;
  }, {}) ?? {};

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
                {(() => {
                  const mapsUrl = (() => {
                    if (farm.latitude != null && farm.longitude != null) {
                      return `https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`;
                    }
                    const poly = farm.polygon != null ? (farm.polygon as Polygon) : null;
                    if (poly) {
                      const ring = poly.coordinates[0] ?? [];
                      const pts = ring.slice(0, -1);
                      if (pts.length > 0) {
                        const lat = pts.reduce((s, c) => s + (c[1] ?? 0), 0) / pts.length;
                        const lng = pts.reduce((s, c) => s + (c[0] ?? 0), 0) / pts.length;
                        return `https://www.google.com/maps?q=${lat},${lng}`;
                      }
                    }
                    return null;
                  })();
                  return mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#67B9C1] hover:text-[#67B9C1]/80 transition-colors mt-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t("open_in_maps")}
                    </a>
                  ) : null;
                })()}
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
              className="bg-primary hover:bg-primary/90 text-[#001020]"
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
                <LotCard
                  key={lot.id}
                  lot={{ ...lot, farmName: farm.name, region: farm.region, country: farm.country }}
                  variant="farmer"
                  pendingProposals={pendingByLot[lot.id] ?? 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
