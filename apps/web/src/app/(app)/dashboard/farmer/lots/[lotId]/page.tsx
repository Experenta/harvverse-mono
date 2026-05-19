"use client";

import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin, Mountain, Pencil, Sprout, TreePine } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  reserved: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  settled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function FarmerLotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);
  const lotIdValid = Number.isFinite(lotId) && lotId > 0;
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("lot");
  const tc = useTranslations("common");

  const { data: lot, isLoading: lotLoading } = useQuery(
    trpc.lots.byId.queryOptions({ id: lotId }, { enabled: lotIdValid }),
  );

  if (!userLoading && user && user.role !== "farmer") {
    router.replace("/dashboard/player");
    return null;
  }

  const isLoading = userLoading || lotLoading;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lot) {
    return (
      <GlassCard className="p-12 text-center border-primary/20">
        <p className="text-gray-400">{t("not_found")}</p>
      </GlassCard>
    );
  }

  const activePlan = lot.plans?.find((p) => p.status === "approved_for_demo") ?? lot.plans?.[0];
  const statusColor = STATUS_COLORS[lot.status] ?? STATUS_COLORS.available;

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() =>
          router.push(`/dashboard/farmer/farms/${lot.farmId}` as Route)
        }
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_farm")}
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        <GlassCard className="p-8 border-primary/20">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {lot.code ?? t("lot_id", { id: lot.id })}
              </h1>
              <p className="text-gray-400 text-sm">{t("farmer_detail_title")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`uppercase ${statusColor}`}>
                {lot.status}
              </Badge>
              <Button
                className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
                onClick={() =>
                  router.push(`/dashboard/farmer/lots/${lot.id}/edit` as Route)
                }
              >
                <Pencil className="w-4 h-4 mr-2" />
                {t("edit_lot_btn")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{lot.region}, {lot.country}</span>
            </div>
            {lot.altitudeMasl != null && (
              <div className="flex items-center gap-2 text-gray-400">
                <Mountain className="w-4 h-4 shrink-0" />
                <span>{lot.altitudeMasl} MASL</span>
              </div>
            )}
            {lot.variety && (
              <div className="flex items-center gap-2 text-gray-400">
                <Sprout className="w-4 h-4 shrink-0" />
                <span>{lot.variety}</span>
              </div>
            )}
            {lot.numTrees != null && (
              <div className="flex items-center gap-2 text-gray-400">
                <TreePine className="w-4 h-4 shrink-0" />
                <span>{lot.numTrees.toLocaleString()} {tc("unknown" as never)}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {lot.areaManzanas != null || lot.plantAgeYears != null || lot.harvestYear != null ? (
          <GlassCard className="p-6 border-primary/20">
            <h2 className="text-lg font-semibold mb-4">{t("section_c_title")}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lot.areaManzanas != null && (
                <div>
                  <p className="text-gray-400">{t("area_manzanas")}</p>
                  <p className="text-white font-medium">{Number(lot.areaManzanas).toFixed(2)} mz</p>
                </div>
              )}
              {lot.plantAgeYears != null && (
                <div>
                  <p className="text-gray-400">{t("plant_age")}</p>
                  <p className="text-white font-medium">{lot.plantAgeYears} yrs</p>
                </div>
              )}
              {lot.harvestYear != null && (
                <div>
                  <p className="text-gray-400">{t("harvest_year")}</p>
                  <p className="text-white font-medium">{lot.harvestYear}</p>
                </div>
              )}
              {lot.numTrees != null && (
                <div>
                  <p className="text-gray-400">{t("num_trees")}</p>
                  <p className="text-white font-medium">{lot.numTrees.toLocaleString()}</p>
                </div>
              )}
            </div>
            {lot.cycleNotes && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-gray-400 text-sm mb-1">{t("cycle_notes")}</p>
                <p className="text-white text-sm whitespace-pre-line">{lot.cycleNotes}</p>
              </div>
            )}
          </GlassCard>
        ) : null}

        {activePlan && (
          <GlassCard className="p-6 border-primary/20">
            <h2 className="text-lg font-semibold mb-4">{t("section_a_title")}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">{t("ticket")}</p>
                <p className="text-white font-medium">{formatUsdFromCents(activePlan.ticketCents)}</p>
              </div>
              <div>
                <p className="text-gray-400">{t("price_per_lb")}</p>
                <p className="text-white font-medium">{formatUsdFromCents(activePlan.priceCentsPerLb)}/lb</p>
              </div>
              <div>
                <p className="text-gray-400">{t("farmer_split_pct")}</p>
                <p className="text-white font-medium">{((activePlan.splitFarmerBps ?? 0) / 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-400">{t("partner_split_pct")}</p>
                <p className="text-white font-medium">{((activePlan.splitPartnerBps ?? 0) / 100).toFixed(1)}%</p>
              </div>
            </div>
          </GlassCard>
        )}

        {lot.riskScore != null && (
          <GlassCard className="p-6 border-primary/20">
            <h2 className="text-lg font-semibold mb-3">{t("risk_score")}</h2>
            <p className="text-4xl font-bold text-primary">{lot.riskScore}</p>
            <p className="text-gray-400 text-sm mt-1">{t("out_of_100")}</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
