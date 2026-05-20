"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { Polygon } from "geojson";
import { ArrowLeft, CheckCircle2, MapPin, Mountain, Satellite, XCircle } from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";
import { trpc } from "@/utils/trpc";

const PolygonDisplayMap = dynamic(() => import("@/components/polygon-display-map"), {
  ssr: false,
});

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

export default function PublicFarmDetailPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const t = useTranslations("farm");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byIdPublic.queryOptions(
      { farmId },
      { enabled: Number.isFinite(farmId) },
    ),
  );

  const riskData = farm ? riskScoreFromFarm(farm) : null;

  return (
    <main className="min-h-screen bg-[#001020] px-4 py-8 text-[#EEEEEE]">
      <div className="mx-auto max-w-6xl">
        <Link href="/farms" className="mb-6 inline-flex items-center text-sm text-white/60 hover:text-white">
          <ArrowLeft className="mr-2 size-4" />
          {t("open_farms_title")}
        </Link>

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : !farm ? (
          <GlassCard className="border-primary/20 p-10 text-center">
            <p className="text-white/60">{t("not_found")}</p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <GlassCard className="border-primary/20 bg-white/[0.03] p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h1 className="font-trenda text-3xl font-bold text-white md:text-5xl">
                    {farm.name}
                  </h1>
                  <p className="mt-3 flex flex-wrap items-center gap-4 text-white/65">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" />
                      {farm.region}, {farm.country}
                    </span>
                    {farm.altitudeMasl ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mountain className="size-4 text-primary" />
                        {farm.altitudeMasl}m
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(farm.varieties ?? []).map((variety) => (
                      <span key={variety} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                        {variety}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            {farm.images && farm.images.length > 0 ? (
              <GlassCard className="border-primary/20 bg-white/[0.03] p-5">
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

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {farm.polygon ? (
                <GlassCard className="h-[420px] overflow-hidden border-white/10 p-0">
                  <PolygonDisplayMap polygon={farm.polygon as Polygon} />
                </GlassCard>
              ) : null}

              <div className="space-y-5">
                {riskData ? <RiskScorePreview data={riskData} /> : null}
                <GlassCard
                  className={
                    farm.eudrCompliant === false
                      ? "border-red-500/25 bg-red-500/10 p-5"
                      : farm.eudrCompliant === true
                        ? "border-green-500/25 bg-green-500/10 p-5"
                        : "border-yellow-500/25 bg-yellow-500/10 p-5"
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
                    <p className="font-trenda text-lg font-bold text-white">EUDR</p>
                  </div>
                  <p className="text-sm text-white/75">
                    {farm.eudrCompliant === false
                      ? t("eudr_non_compliant_msg")
                      : farm.eudrCompliant === true
                        ? t("eudr_compliant_msg")
                        : t("eudr_pending_msg")}
                  </p>
                </GlassCard>
              </div>
            </div>

            <GlassCard className="border-primary/20 bg-primary/5 p-6 text-center">
              <p className="mb-4 font-trenda text-xl font-bold text-white">
                {t("invest_cta")}
              </p>
              <Button
                className="bg-primary font-bold text-[#001020] hover:bg-primary/90"
                onClick={() => {
                  window.location.href = "/waiting-list";
                }}
              >
                {t("invest_button")}
              </Button>
            </GlassCard>
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
          </div>
        )}
      </div>
    </main>
  );
}
