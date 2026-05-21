"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { eudrGrade, eudrGradeTone, type EudrScreening } from "@/lib/eudr-screening";

interface ScoreBreakdown {
  ndviAvg: number | null;
  ndviStability: number | null;
  annualPrecip: number;
  rainDistrib: number;
  temperature: number;
  eudr: number;
  eudrScreening?: EudrScreening | null;
  opticalCoverage?: {
    averageValidPixelCoverage: number | null;
    averageCloudCoverage: number | null;
    lowCoverageMonths: number;
  };
  climateTrend?: {
    providerLabel: string;
    precipitationTrendMmPerYear: number | null;
    daysOver100Mm: number;
    waterStressLabel: "low" | "medium" | "high" | "unknown";
    confidence: "none" | "low" | "medium" | "high";
  };
  terrain?: {
    providerLabel: string;
    elevationMasl: number | null;
    terrainRisk: "low" | "medium" | "high" | "unknown";
    confidence: "none" | "low" | "medium" | "high";
  };
  sentinel1?: {
    structuralChangeSignal: "none" | "possible_change" | "unknown";
    soilMoistureProxy: "low" | "medium" | "high" | "unknown";
    confidence: "none" | "low" | "medium" | "high";
  };
  dataQuality?: ScoreDataQuality | null;
  total: number;
}

interface ScoreDataQuality {
  overallConfidence: "none" | "low" | "medium" | "high";
  completenessPct: number;
  usableNdviMonths: number;
  climateMonths: number;
  averageValidPixelCoverage: number | null;
  providerCoverage: {
    sentinel2: "none" | "low" | "medium" | "high";
    climate: "none" | "low" | "medium" | "high";
    terrain: "none" | "low" | "medium" | "high";
    sentinel1: "none" | "low" | "medium" | "high";
    forestBaseline: "none" | "low" | "medium" | "high";
  };
  warnings: string[];
  limitations: string[];
}

interface NdviMonth {
  date: string;
  mean: number | null;
  validPixelCoverage?: number | null;
  cloudCoverage?: number | null;
}

interface ClimateMonth {
  date: string;
  precipMm: number;
  tempC: number;
  daysOver100Mm?: number;
}

interface QuarterlyNdviMetric {
  quarter: string;
  mean: number | null;
  validPixelCoverage: number | null;
  deltaFromPrevious: number | null;
  anomaly: "none" | "drop" | "increase" | "insufficient_data";
}

export interface RiskScoreData {
  score: number;
  breakdown?: ScoreBreakdown | null;
  hash?: string | null;
  ndviMonths?: NdviMonth[];
  climateMonths?: ClimateMonth[];
  quarterlyNdvi?: QuarterlyNdviMetric[];
  hasSentinel?: boolean;
  eudrScreening?: EudrScreening | null;
  dataQuality?: ScoreDataQuality | null;
  eudrCompliant: boolean | null;
}

function getClassification(
  score: number,
  labels: { excellent: string; good: string; moderate: string; high_risk: string },
): { label: string; color: string; textColor: string } {
  if (score >= 80) return { label: labels.excellent, color: "bg-green-500/20 border-green-500/40", textColor: "text-green-400" };
  if (score >= 60) return { label: labels.good, color: "bg-blue-500/20 border-blue-500/40", textColor: "text-blue-400" };
  if (score >= 40) return { label: labels.moderate, color: "bg-yellow-500/20 border-yellow-500/40", textColor: "text-yellow-400" };
  return { label: labels.high_risk, color: "bg-red-500/20 border-red-500/40", textColor: "text-red-400" };
}

function ScoreBar({ value, max = 20, naLabel }: { value: number | null; max?: number; naLabel: string }) {
  if (value === null) {
    return <div className="text-xs text-gray-500 italic">{naLabel}</div>;
  }
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-primary font-bold w-8 text-right">{value}/{max}</span>
    </div>
  );
}

export default function RiskScorePreview({
  data,
  hideHeader = false,
}: {
  data: RiskScoreData;
  hideHeader?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("risk_score");

  const cls = getClassification(data.score, {
    excellent: t("excellent"),
    good: t("good"),
    moderate: t("moderate"),
    high_risk: t("high_risk"),
  });

  const climateMonths = data.climateMonths ?? [];
  const ndviMonths = data.ndviMonths ?? [];
  const hasBreakdown = !!data.breakdown;
  const annualPrecipMm =
    climateMonths.length > 0
      ? (climateMonths.reduce((s, m) => s + m.precipMm, 0) / climateMonths.length) * 12
      : null;
  const avgTempC =
    climateMonths.length > 0
      ? climateMonths.reduce((s, m) => s + m.tempC, 0) / climateMonths.length
      : null;
  const ndviAvgRaw =
    ndviMonths.length > 0
      ? ndviMonths.filter((m) => m.mean !== null).reduce((s, m) => s + (m.mean ?? 0), 0) /
        (ndviMonths.filter((m) => m.mean !== null).length || 1)
      : null;
  const eudrScreening = data.eudrScreening ?? data.breakdown?.eudrScreening ?? null;
  const latestQuarter = data.quarterlyNdvi?.at(-1) ?? null;
  const opticalCoverage = data.breakdown?.opticalCoverage ?? null;
  const climateTrend = data.breakdown?.climateTrend ?? null;
  const terrain = data.breakdown?.terrain ?? null;
  const sentinel1 = data.breakdown?.sentinel1 ?? null;
  const dataQuality = data.dataQuality ?? data.breakdown?.dataQuality ?? null;
  const eudrStatus = eudrScreening?.status ?? "unknown";
  const grade = eudrGrade(eudrScreening);
  const eudrUi = eudrGradeTone(grade);
  const eudrLabel = t(`eudr_grade_${grade}`);
  const eudrSummary = t(`eudr_grade_summary_${grade}`);
  const EudrIcon =
    grade === "excellent" || grade === "good"
      ? CheckCircle
      : grade === "poor"
        ? XCircle
        : grade === "medium"
          ? AlertTriangle
          : HelpCircle;

  const rows = [
    { key: "ndvi_avg", label: t("ndvi_avg"), desc: t("ndvi_avg_desc"), value: data.breakdown?.ndviAvg ?? null, max: 100 },
    { key: "ndvi_stability", label: t("ndvi_stability"), desc: t("ndvi_stability_desc"), value: data.breakdown?.ndviStability ?? null, max: 100 },
    { key: "annual_precip", label: t("annual_precip"), desc: t("annual_precip_desc"), value: data.breakdown?.annualPrecip ?? null, max: 100 },
    { key: "rain_distrib", label: t("rain_distrib"), desc: t("rain_distrib_desc"), value: data.breakdown?.rainDistrib ?? null, max: 100 },
    { key: "temperature", label: t("temperature"), desc: t("temperature_desc"), value: data.breakdown?.temperature ?? null, max: 100 },
    { key: "eudr_compliance", label: t("eudr_screening"), desc: t("eudr_screening_desc"), value: data.breakdown?.eudr ?? null, max: 100 },
  ];

  return (
    <GlassCard className={`p-5 border ${cls.color}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          {!hideHeader ? (
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("title")}</p>
          ) : null}
          <div className="flex items-center gap-3">
            <span className={`text-5xl font-bold ${cls.textColor}`}>{data.score}</span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded border ${cls.color} ${cls.textColor}`}>
              {cls.label}
            </span>
          </div>
          {dataQuality ? (
            <p className="mt-2 text-xs text-white/55">
              {t("score_confidence")}: {t(`confidence_${dataQuality.overallConfidence}`)}
              {" · "}
              {t("data_complete")}: {dataQuality.completenessPct}%
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">{t("eudr_label")}</p>
          <div className={`inline-flex max-w-56 items-center justify-end gap-1.5 text-right ${eudrUi.text}`}>
            <EudrIcon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold leading-tight">{eudrLabel}</span>
          </div>
          <p className="mt-1 max-w-56 text-xs leading-snug text-white/45">
            {eudrSummary}
          </p>
        </div>
      </div>

      {hasBreakdown && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? t("hide_breakdown") : t("show_breakdown")}
        </button>
      )}

      {expanded && hasBreakdown && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {rows.map(({ key, label, desc, value, max }) => (
              <div key={key}>
                <p className="text-xs text-white font-medium mb-0.5">{label}</p>
                <p className="text-xs text-white/70 mb-1">{desc}</p>
                <ScoreBar value={value} max={max} naLabel={t("na_no_sentinel")} />
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-white/70">{t("ndvi_avg_label")}</p>
              <p className="text-lg font-semibold text-white">
                {ndviAvgRaw !== null ? ndviAvgRaw.toFixed(3) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70">{t("precipitation_label")}</p>
              <p className="text-lg font-semibold text-white">
                {annualPrecipMm !== null ? `${annualPrecipMm.toFixed(0)} mm/yr` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70">{t("temp_label")}</p>
              <p className="text-lg font-semibold text-white">
                {avgTempC !== null ? `${avgTempC.toFixed(1)} °C` : "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
            {dataQuality ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {t("data_quality")}
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {t("score_confidence")}: {t(`confidence_${dataQuality.overallConfidence}`)}
                  {" · "}
                  {t("data_complete")}: {dataQuality.completenessPct}%
                </p>
                <p className="mt-1 text-xs text-white/55">
                  Sentinel-2: {t(`confidence_${dataQuality.providerCoverage.sentinel2}`)}
                  {" · "}
                  {t("climate_trend")}: {t(`confidence_${dataQuality.providerCoverage.climate}`)}
                </p>
                {dataQuality.warnings.length > 0 ? (
                  <p className="mt-2 text-xs leading-snug text-yellow-300/85">
                    {t("data_quality_limited")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t("provider_optical")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                Sentinel-2 L2A
              </p>
              <p className="mt-1 text-xs text-white/55">
                {t("valid_coverage")}:{" "}
                {opticalCoverage?.averageValidPixelCoverage != null
                  ? `${Math.round(opticalCoverage.averageValidPixelCoverage * 100)}%`
                  : "—"}
                {" · "}
                {t("cloud_coverage")}:{" "}
                {opticalCoverage?.averageCloudCoverage != null
                  ? `${Math.round(opticalCoverage.averageCloudCoverage * 100)}%`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t("ndvi_trend")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {latestQuarter?.quarter ?? "—"}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {t("quarter_delta")}:{" "}
                {latestQuarter?.deltaFromPrevious != null
                  ? latestQuarter.deltaFromPrevious.toFixed(3)
                  : "—"}
                {" · "}
                {t(`anomaly_${latestQuarter?.anomaly ?? "insufficient_data"}`)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t("climate_trend")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {t(`water_stress_${climateTrend?.waterStressLabel ?? "unknown"}`)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {t("rainfall_trend")}:{" "}
                {climateTrend?.precipitationTrendMmPerYear != null
                  ? `${climateTrend.precipitationTrendMmPerYear.toFixed(0)} mm/yr`
                  : "—"}
                {" · "}
                {t("extreme_rain_days")}: {climateTrend?.daysOver100Mm ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t("terrain")}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {terrain?.elevationMasl != null ? `${terrain.elevationMasl} m` : "—"}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {t("terrain_risk")}: {t(`risk_${terrain?.terrainRisk ?? "unknown"}`)}
                {" · "}
                {terrain?.providerLabel ?? t("provider_unavailable")}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                Sentinel-1 SAR
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {t(`sar_signal_${sentinel1?.structuralChangeSignal ?? "unknown"}`)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {t("confidence")}: {t(`confidence_${sentinel1?.confidence ?? "none"}`)}
              </p>
            </div>

          </div>

          {!data.hasSentinel && (
            <p className="text-xs text-yellow-500/80 italic">
              {t("no_sentinel")}
            </p>
          )}
        </div>
      )}
      {!hasBreakdown && data.hash ? (
        <p className="mt-3 truncate border-t border-white/10 pt-3 font-mono text-xs text-white/45">
          Hash: {data.hash}
        </p>
      ) : null}
    </GlassCard>
  );
}
