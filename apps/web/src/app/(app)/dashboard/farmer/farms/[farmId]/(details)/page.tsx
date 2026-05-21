"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit3, ExternalLink, HelpCircle, ImagePlus, Loader2, MapPin, Mountain, RotateCcw, Satellite, XCircle } from "lucide-react";
import type { Polygon } from "geojson";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { queryClient, trpc } from "@/utils/trpc";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";
import { eudrTone, extractEudrScreening, type EudrRiskStatus } from "@/lib/eudr-screening";

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
    quarterlyNdvi: stored.quarterlyNdvi ?? [],
    hasSentinel: stored.hasSentinel ?? false,
    eudrScreening: extractEudrScreening(farm.scoreBreakdown),
  };
}

function eudrLabel(t: ReturnType<typeof useTranslations<"farm">>, status: EudrRiskStatus | null) {
  if (status === "low_risk") return t("eudr_prelim_passed");
  if (status === "review_required") return t("eudr_prelim_review");
  if (status === "high_risk") return t("eudr_prelim_failed");
  return t("eudr_prelim_inconclusive");
}

function farmImageSrc(image: { url?: string | null; data?: string | null; mimeType: string }) {
  return image.url ?? (image.data ? `data:${image.mimeType};base64,${image.data}` : null);
}

export default function FarmerFarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("farm");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const attemptedAnalysisRef = useRef(false);

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      { enabled: farmIdValid },
    ),
  );

  const runAnalysis = useMutation(
    trpc.farms.runCopernicusAnalysis.mutationOptions({
      onSuccess: async () => {
        setAnalysisError(null);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.farms.byId.queryKey({ id: farmId }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.farms.list.queryKey(),
          }),
        ]);
      },
      onError: (error) => {
        setAnalysisError(error.message || t("score_retry_desc"));
      },
    }),
  );

  useEffect(() => {
    if (
      !farm ||
      farm.riskScore != null ||
      attemptedAnalysisRef.current ||
      runAnalysis.isPending
    ) {
      return;
    }
    attemptedAnalysisRef.current = true;
    setAnalysisError(null);
    runAnalysis.mutate({ farmId: farm.id });
  }, [farm?.id, farm?.riskScore]); // eslint-disable-line react-hooks/exhaustive-deps

  function retryAnalysis() {
    if (!farm) return;
    attemptedAnalysisRef.current = true;
    setAnalysisError(null);
    runAnalysis.mutate({ farmId: farm.id });
  }

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
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <div className="rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25 backdrop-blur-md">
                  {farm.verified ? t("verified") : t("pending_verification")}
                </div>
                <Button
                  type="button"
                  className="h-9 bg-primary text-[#001020] hover:bg-primary/90"
                  onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}/edit`)}
                >
                  <Edit3 className="mr-2 size-4" />
                  {t("edit_farm_cta")}
                </Button>
              </div>
            </div>
          </GlassCard>

          {farm.images && farm.images.length > 0 ? (
            <GlassCard className="mb-6 border-primary/20 bg-white/[0.03] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="section-title text-xl md:text-2xl">
                  {t("images_title")}
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-[#67B9C1]/40 text-[#67B9C1] hover:bg-[#67B9C1]/10"
                  onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}/edit#images`)}
                >
                  <ImagePlus className="mr-2 size-4" />
                  {t("manage_photos_cta")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                {(() => {
                  const primary = farm.images.find((image) => image.isPrimary) ?? farm.images[0];
                  if (!primary) return null;
                  const src = farmImageSrc(primary);
                  if (!src) return null;
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
                    const src = farmImageSrc(image);
                    if (!src) return null;
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
          ) : (
            <GlassCard className="mb-6 border-primary/20 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-trenda text-xl font-bold text-white">
                    {t("photos_empty_title")}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {t("photos_empty_desc")}
                  </p>
                </div>
                <Button
                  type="button"
                  className="bg-primary font-black text-[#001020] hover:bg-primary/90"
                  onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}/edit#images`)}
                >
                  <ImagePlus className="mr-2 size-4" />
                  {t("add_photos_cta")}
                </Button>
              </div>
            </GlassCard>
          )}

          <GlassCard className="mb-6 border-primary/20 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title text-xl md:text-2xl">
                {t("farm_details_title")}
              </h2>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-white/15 text-white/75 hover:bg-white/10 hover:text-white"
                onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}/edit`)}
              >
                <Edit3 className="mr-2 size-4" />
                {t("edit_details_cta")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{t("varieties")}</p>
                <p className="mt-1 text-sm font-bold text-white">{farm.varieties?.join(", ") || "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{t("certifications")}</p>
                <p className="mt-1 text-sm font-bold text-white">{farm.certifications?.join(", ") || "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{t("total_area")}</p>
                <p className="mt-1 text-sm font-bold text-primary">{farm.totalArea ? `${farm.totalArea} ha` : "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{t("altitude")}</p>
                <p className="mt-1 text-sm font-bold text-primary">{farm.altitudeMasl ? `${farm.altitudeMasl} m` : "—"}</p>
              </div>
            </div>
            {farm.description ? (
              <p className="mt-4 text-sm leading-relaxed text-white/65">
                {farm.description}
              </p>
            ) : null}
          </GlassCard>

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
                  {(() => {
                    const screening = extractEudrScreening(farm.scoreBreakdown);
                    const status = screening?.status ?? "unknown";
                    const tone = eudrTone(status);
                    const EudrIcon =
                      status === "low_risk"
                        ? CheckCircle2
                        : status === "high_risk"
                          ? XCircle
                          : status === "review_required"
                            ? AlertTriangle
                            : HelpCircle;
                    return (
                      <div className={`rounded-xl border p-4 ${tone.card}`}>
                        <div className="mb-2 flex items-center gap-2">
                          <EudrIcon className={`size-5 ${tone.text}`} />
                          <p className="font-trenda font-bold text-white">
                            {eudrLabel(t, status)}
                          </p>
                        </div>
                        <p className="text-sm text-white/75">
                          {t("eudr_prelim_helper")}
                        </p>
                        {screening?.confidence ? (
                          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                            {t("eudr_confidence")}: {t(`eudr_confidence_${screening.confidence}`)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div
                className={`rounded-xl border p-5 ${
                  analysisError
                    ? "border-yellow-400/25 bg-yellow-400/[0.04]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${
                    analysisError ? "bg-yellow-400/10" : "bg-[#67B9C1]/10"
                  }`}>
                    {runAnalysis.isPending ? (
                      <Loader2 className="size-5 animate-spin text-[#67B9C1]" />
                    ) : analysisError ? (
                      <AlertTriangle className="size-5 text-yellow-300" />
                    ) : (
                      <Satellite className="size-5 text-[#67B9C1]" />
                    )}
                  </div>
                  <p className="font-trenda text-lg font-bold text-white">
                    {analysisError
                      ? t("score_retry_title")
                      : runAnalysis.isPending
                        ? t("score_running")
                        : t("score_analyzing")}
                  </p>
                </div>
                <p className="text-sm text-white/60">
                  {analysisError
                    ? analysisError
                    : runAnalysis.isPending
                      ? t("score_running_desc")
                      : t("score_analyzing_desc")}
                </p>
                {analysisError ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-yellow-300/30 text-yellow-100 hover:bg-yellow-300/10"
                    onClick={retryAnalysis}
                    disabled={runAnalysis.isPending}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    {t("score_retry_btn")}
                  </Button>
                ) : null}
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
