"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, ExternalLink, MapPin, Mountain, Satellite, XCircle } from "lucide-react";
import type { Polygon } from "geojson";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { trpc } from "@/utils/trpc";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";

const PolygonDisplayMap = dynamic(() => import("@/components/polygon-display-map"), {
  ssr: false,
});

function formatRelativeDate(date: Date | string | null | undefined) {
  if (!date) return "";
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const diffDays = Math.round(diffMs / 86400000);
  if (Math.abs(diffDays) < 1) return "hoy";
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  return rtf.format(diffDays, "day");
}

function riskScoreFromFarm(farm: {
  riskScore?: number | null;
  eudrCompliant?: boolean | null;
  scoreHash?: string | null;
  scoreBreakdown?: unknown;
}): RiskScoreData | null {
  if (farm.riskScore == null) return null;
  const stored =
    farm.scoreBreakdown != null && typeof farm.scoreBreakdown === "object"
      ? (farm.scoreBreakdown as Partial<RiskScoreData> & { breakdown?: RiskScoreData["breakdown"] })
      : {};
  return {
    score: farm.riskScore,
    eudrCompliant: farm.eudrCompliant ?? null,
    hash: farm.scoreHash ?? null,
    breakdown: stored.breakdown ?? null,
    ndviMonths: stored.ndviMonths ?? [],
    climateMonths: stored.climateMonths ?? [],
    hasSentinel: stored.hasSentinel ?? false,
  };
}

export default function FarmerFarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("farm");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      {
        enabled: farmIdValid,
        refetchInterval: (query) => {
          const data = query.state.data;
          return data != null && (data.riskScore == null || data.eudrCompliant == null)
            ? 5000
            : false;
        },
      },
    ),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 hover:bg-white/5 hover:text-white px-0 md:px-4"
        onClick={() => router.push("/dashboard/farmer/my-farms")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_my_farms")}
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      ) : !farm ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-white/60">{t("not_found")}</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="mb-6 border-primary/20 p-5">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="mb-2 font-trenda text-2xl md:text-3xl font-bold text-white leading-tight">{farm.name}</h1>
                <p className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary/60" />
                    {farm.region}, {farm.country}
                  </span>
                  {farm.altitudeMasl ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mountain className="size-4 text-primary/60" />
                      {farm.altitudeMasl}m
                    </span>
                  ) : null}
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
                    <div className="mt-3">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#67B9C1] hover:text-[#67B9C1]/80 transition-colors bg-[#67B9C1]/5 px-2 py-1 rounded"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t("open_in_maps")}
                      </a>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="self-start rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25 backdrop-blur-md">
                {farm.verified ? t("verified") : t("pending_verification")}
              </div>
            </div>
          </GlassCard>

          {farm.images && farm.images.length > 0 ? (
            <GlassCard className="mb-6 border-primary/20 bg-white/[0.03] p-5">
              <h2 className="section-title mb-4 text-xl md:text-2xl">
                {t("images_title")}
              </h2>
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                {(() => {
                  const primary = farm.images.find((image) => image.isPrimary) ?? farm.images[0];
                  if (!primary) return null;
                  const src = `data:${primary.mimeType};base64,${primary.data}`;
                  return (
                    <button
                      type="button"
                      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left"
                      onClick={() => setExpandedImage(src)}
                    >
                      <img
                        src={src}
                        alt={primary.filename}
                        className="h-72 w-full object-cover transition-transform hover:scale-[1.02]"
                      />
                    </button>
                  );
                })()}
                <div className="grid grid-cols-2 gap-3">
                  {farm.images.map((image) => {
                    const src = `data:${image.mimeType};base64,${image.data}`;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                        onClick={() => setExpandedImage(src)}
                      >
                        <img src={src} alt={image.filename} className="aspect-[4/3] w-full object-cover" />
                        {image.isPrimary ? (
                          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-[#001020]">
                            Principal
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          ) : null}

          <GlassCard className="mb-6 border-primary/20 bg-white/[0.03] p-5">
            <h2 className="section-title mb-4 text-xl md:text-2xl">
              {t("copernicus_title")}
            </h2>
            {farm.riskScore != null ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  {riskScoreFromFarm(farm) ? (
                    <RiskScorePreview data={riskScoreFromFarm(farm)!} />
                  ) : null}
                  {farm.scoreUpdatedAt ? (
                    <p className="text-xs text-white/50">
                      {t("last_analysis", { date: formatRelativeDate(farm.scoreUpdatedAt) })}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-4">
                  {farm.polygon ? (
                    <div className="h-64 overflow-hidden rounded-xl border border-white/10">
                      <PolygonDisplayMap polygon={farm.polygon as Polygon} />
                    </div>
                  ) : null}
                  <div
                    className={
                      farm.eudrCompliant === false
                        ? "rounded-xl border border-red-500/25 bg-red-500/10 p-4"
                        : farm.eudrCompliant === true
                          ? "rounded-xl border border-green-500/25 bg-green-500/10 p-4"
                          : "rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4"
                    }
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {farm.eudrCompliant === false ? (
                        <XCircle className="size-5 text-red-300" />
                      ) : farm.eudrCompliant === true ? (
                        <CheckCircle2 className="size-5 text-green-300" />
                      ) : (
                        <Satellite className="size-5 text-yellow-300" />
                      )}
                      <p className="font-trenda font-bold text-white">EUDR</p>
                    </div>
                    <p className="text-sm text-white/75">
                      {farm.eudrCompliant === false
                        ? t("eudr_non_compliant_msg")
                        : farm.eudrCompliant === true
                          ? t("eudr_compliant_msg")
                          : t("eudr_pending_msg")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#67B9C1]/10">
                    <Satellite className="size-5 text-[#67B9C1]" />
                  </div>
                  <p className="font-trenda text-lg font-bold text-white">
                    {t("score_analyzing")}
                  </p>
                </div>
                <p className="text-sm text-white/60">{t("score_analyzing_desc")}</p>
              </div>
            )}
          </GlassCard>

          {/*
            Lot management is still present elsewhere in the app, but the farm
            detail screen is focused on farm registration and satellite analysis
            for the current release step.
          */}
          {expandedImage ? (
            <button
              type="button"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setExpandedImage(null)}
            >
              <img
                src={expandedImage}
                alt=""
                className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain"
              />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
