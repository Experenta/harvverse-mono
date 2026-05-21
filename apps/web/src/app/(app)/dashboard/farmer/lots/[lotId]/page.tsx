"use client";

import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, HelpCircle, MapPin, Mountain, Pencil, Sprout, TreePine } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@harvverse-monorepo/ui/components/tooltip";

import { computeEarnings, formatUsd, formatUsdFromCents, formatUsdPrecise } from "@/lib/format";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-white/70 border-gray-500/30",
  available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  reserved: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  settled: "bg-gray-500/20 text-white/60 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function riskScoreFromLot(lot: {
  riskScore?: number | null;
  eudrCompliant?: boolean | null;
  scoreHash?: string | null;
}): RiskScoreData | null {
  if (lot.riskScore == null) return null;
  return {
    score: lot.riskScore,
    eudrCompliant: lot.eudrCompliant ?? null,
    hash: lot.scoreHash ?? undefined,
  };
}

function formatRelativeDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(diffSeconds, "second");
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(Math.round(diffMonths / 12), "year");
}

export default function FarmerLotDetailPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);
  const lotIdValid = Number.isFinite(lotId) && lotId > 0;
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("lot");
  const tc = useTranslations("common");
  const tLF = useTranslations("lot_financial");

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
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lot) {
    return (
      <GlassCard className="p-12 text-center border-primary/20">
        <p className="text-white/60">{t("not_found")}</p>
      </GlassCard>
    );
  }

  const activePlan = lot.plans?.find((p) => p.status === "approved_for_demo") ?? lot.plans?.[0];
  const statusColor = STATUS_COLORS[lot.status] ?? STATUS_COLORS.available;
  const riskData = riskScoreFromLot(lot);
  const updatedLabel = formatRelativeDate(lot.scoreUpdatedAt);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 px-0 md:px-4"
        onClick={() =>
          router.push(`/dashboard/farmer/farms/${lot.farmId}` as Route)
        }
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_farm")}
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        {lot.status === "draft" ? (
          <GlassCard className="border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-trenda text-base font-bold text-amber-300">
                {t("draft_banner")}
              </p>
              <Button
                size="sm"
                className="bg-primary text-[#001020] hover:bg-primary/90 font-bold"
                onClick={() =>
                  router.push(`/dashboard/farmer/lots/${lot.id}/edit?section=terms` as Route)
                }
              >
                {t("add_terms_to_publish")}
              </Button>
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="p-6 md:p-8 border-primary/20">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
            <div className="min-w-0">
              <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white mb-1 leading-tight break-words">
                {lot.code ?? t("lot_id", { id: lot.id })}
              </h1>
              <p className="text-white/50 text-sm">{t("farmer_detail_title")}</p>
            </div>
            <div className="flex items-center gap-3 self-start">
              <Badge className={`uppercase px-3 py-1 text-[10px] md:text-xs font-bold tracking-wider ${statusColor}`}>
                {lot.status}
              </Badge>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-[#001020] font-black uppercase text-[10px] tracking-widest px-4"
                onClick={() =>
                  router.push(`/dashboard/farmer/lots/${lot.id}/edit` as Route)
                }
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                {t("edit_lot_btn")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="w-4 h-4 shrink-0 text-primary/60" />
              <span className="truncate">{lot.region}, {lot.country}</span>
            </div>
            {lot.altitudeMasl != null && (
              <div className="flex items-center gap-2 text-white/70">
                <Mountain className="w-4 h-4 shrink-0 text-primary/60" />
                <span>{lot.altitudeMasl} MASL</span>
              </div>
            )}
            {lot.variety && (
              <div className="flex items-center gap-2 text-white/70">
                <Sprout className="w-4 h-4 shrink-0 text-primary/60" />
                <span>{lot.variety}</span>
              </div>
            )}
            {lot.numTrees != null && (
              <div className="flex items-center gap-2 text-white/70">
                <TreePine className="w-4 h-4 shrink-0 text-primary/60" />
                <span>{lot.numTrees.toLocaleString()} trees</span>
              </div>
            )}
          </div>
        </GlassCard>

        {lot.areaManzanas != null || lot.plantAgeYears != null || lot.harvestYear != null ? (
          <GlassCard className="p-6 md:p-8 border-primary/20">
            <h2 className="font-trenda text-base font-bold text-white uppercase tracking-wider mb-6">{t("section_c_title")}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
              {lot.areaManzanas != null && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("area_manzanas")}</p>
                  <p className="text-white font-bold">{Number(lot.areaManzanas).toFixed(2)} mz</p>
                </div>
              )}
              {lot.plantAgeYears != null && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("plant_age")}</p>
                  <p className="text-white font-bold">{lot.plantAgeYears} yrs</p>
                </div>
              )}
              {lot.harvestYear != null && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("harvest_year")}</p>
                  <p className="text-white font-bold">{lot.harvestYear}</p>
                </div>
              )}
              {lot.numTrees != null && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{t("num_trees")}</p>
                  <p className="text-white font-bold">{lot.numTrees.toLocaleString()}</p>
                </div>
              )}
            </div>
            {lot.cycleNotes && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">{t("cycle_notes")}</p>
                <p className="text-white/80 text-sm whitespace-pre-line leading-relaxed italic">{lot.cycleNotes}</p>
              </div>
            )}
          </GlassCard>
        ) : null}

        {activePlan && (() => {
          const farmerSharePct = (activePlan.splitFarmerBps ?? 0) / 100;
          const partnerSharePct = (activePlan.splitPartnerBps ?? 0) / 100;
          const earnings = computeEarnings({
            projectedYieldQq: (activePlan.projectedYieldY1TenthsQq ?? 0) / 10,
            pricePerLbUsd: (activePlan.priceCentsPerLb ?? 0) / 100,
            agronomicCostUsd: (activePlan.agronomicCostCents ?? 0) / 100,
            farmerSharePct,
          });
          return (
            <>
              <GlassCard className="p-6 md:p-8 border-primary/20">
                <h2 className="font-trenda text-base font-bold text-white uppercase tracking-wider mb-6">{tLF("terms_title")}</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tLF("terms_ticket")}</p>
                    <p className="text-white font-bold text-primary">{formatUsdFromCents(activePlan.ticketCents)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tLF("terms_price")}</p>
                    <p className="text-white font-bold">{formatUsdFromCents(activePlan.priceCentsPerLb)}/lb</p>
                  </div>
                  {activePlan.priceFloorCentsPerLb != null && (
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        {tLF("terms_price_floor")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-white/35 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_price_floor")}</TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-white font-bold">{formatUsdFromCents(activePlan.priceFloorCentsPerLb)}/lb</p>
                    </div>
                  )}
                  {activePlan.agronomicCostCents != null && (
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        {tLF("terms_agro_cost")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-white/35 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_agro_cost")}</TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-white font-bold">{formatUsdFromCents(activePlan.agronomicCostCents)}</p>
                    </div>
                  )}
                  {activePlan.projectedYieldY1TenthsQq != null && (
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        {tLF("terms_yield")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-white/35 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_quintal")}</TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-white font-bold">{(activePlan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq</p>
                    </div>
                  )}
                  {activePlan.yieldCapY1TenthsQq != null && (
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tLF("terms_yield_cap")}</p>
                      <p className="text-white font-bold">{(activePlan.yieldCapY1TenthsQq / 10).toFixed(1)} qq</p>
                    </div>
                  )}
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tLF("terms_farmer_share")}</p>
                    <p className="text-white font-bold">{farmerSharePct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{tLF("terms_partner_share")}</p>
                    <p className="text-white font-bold">{partnerSharePct.toFixed(1)}%</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 md:p-8 bg-emerald-500/5 border-emerald-500/20">
                <h2 className="font-trenda text-base font-bold text-emerald-400 uppercase tracking-wider mb-6">{tLF("earnings_title")}</h2>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white/50 text-xs uppercase tracking-wider">{tLF("earnings_gross")}</span>
                    <span className="text-white font-bold">{formatUsd(earnings.grossIncomeUsd)}</span>
                  </div>
                  <p className="text-[10px] text-white/30 italic px-1">
                    {tLF("gross_income_line", {
                      value: ((activePlan.projectedYieldY1TenthsQq ?? 0) / 10).toFixed(1),
                      price: formatUsdPrecise((activePlan.priceCentsPerLb ?? 0) / 100).replace("$", ""),
                    })}
                  </p>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white/50 text-xs uppercase tracking-wider">{tLF("earnings_agro_cost")}</span>
                    <span className="text-red-400 font-bold">−{formatUsd((activePlan.agronomicCostCents ?? 0) / 100)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <span className="text-white/50 text-xs uppercase tracking-wider">{tLF("earnings_net_profit")}</span>
                    <span className="text-white font-black text-base">{formatUsd(earnings.netProfitUsd)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/10 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mt-2">
                    <span className="text-emerald-300 font-bold text-xs uppercase tracking-wider">
                      {tLF("earnings_your_share", { pct: farmerSharePct.toFixed(0) })}
                    </span>
                    <span className="text-emerald-300 font-black text-xl">{formatUsd(earnings.farmerEarningsUsd)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-4 italic text-center">{tLF("earnings_note")}</p>
              </GlassCard>
            </>
          );
        })()}

        {riskData ? (
          <div className="space-y-2">
            <RiskScorePreview data={riskData} />
            {updatedLabel && (
              <p className="text-[10px] text-white/40 text-center uppercase tracking-widest mt-4">
                {t("score_last_updated", { date: updatedLabel })}
              </p>
            )}
          </div>
        ) : (
          <GlassCard className="p-8 border-white/10 bg-white/[0.03] text-center">
            <h2 className="font-trenda text-base font-bold text-white uppercase tracking-wider mb-2">
              {t("score_pending")}
            </h2>
            <p className="text-sm text-white/50 italic">{t("score_pending_desc")}</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
