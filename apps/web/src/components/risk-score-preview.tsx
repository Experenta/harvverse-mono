"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { eudrTone, type EudrScreening } from "@/lib/eudr-screening";

interface ScoreBreakdown {
  ndviAvg: number | null;
  ndviStability: number | null;
  annualPrecip: number;
  rainDistrib: number;
  temperature: number;
  eudr: number;
  eudrScreening?: EudrScreening | null;
  total: number;
}

interface NdviMonth {
  date: string;
  mean: number | null;
}

interface ClimateMonth {
  date: string;
  precipMm: number;
  tempC: number;
}

export interface RiskScoreData {
  score: number;
  breakdown?: ScoreBreakdown | null;
  hash?: string | null;
  ndviMonths?: NdviMonth[];
  climateMonths?: ClimateMonth[];
  hasSentinel?: boolean;
  eudrScreening?: EudrScreening | null;
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

export default function RiskScorePreview({ data }: { data: RiskScoreData }) {
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
    climateMonths.reduce((s, m) => s + m.precipMm, 0);
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
  const eudrStatus = eudrScreening?.status ?? "unknown";
  const eudrUi = eudrTone(eudrStatus);
  const eudrLabel =
    eudrStatus === "low_risk"
      ? t("eudr_prelim_passed")
      : eudrStatus === "review_required"
        ? t("eudr_prelim_review")
        : eudrStatus === "high_risk"
          ? t("eudr_prelim_failed")
          : t("eudr_prelim_inconclusive");
  const EudrIcon =
    eudrStatus === "low_risk"
      ? CheckCircle
      : eudrStatus === "high_risk"
        ? XCircle
        : eudrStatus === "review_required"
          ? AlertTriangle
          : HelpCircle;

  const rows = [
    { key: "ndvi_avg", label: t("ndvi_avg"), desc: t("ndvi_avg_desc"), value: data.breakdown?.ndviAvg ?? null, max: 20 },
    { key: "ndvi_stability", label: t("ndvi_stability"), desc: t("ndvi_stability_desc"), value: data.breakdown?.ndviStability ?? null, max: 15 },
    { key: "annual_precip", label: t("annual_precip"), desc: t("annual_precip_desc"), value: data.breakdown?.annualPrecip ?? null, max: 20 },
    { key: "rain_distrib", label: t("rain_distrib"), desc: t("rain_distrib_desc"), value: data.breakdown?.rainDistrib ?? null, max: 15 },
    { key: "temperature", label: t("temperature"), desc: t("temperature_desc"), value: data.breakdown?.temperature ?? null, max: 20 },
    { key: "eudr_compliance", label: t("eudr_screening"), desc: t("eudr_screening_desc"), value: data.breakdown?.eudr ?? null, max: 10 },
  ];

  return (
    <GlassCard className={`p-5 border ${cls.color}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t("title")}</p>
          <div className="flex items-center gap-3">
            <span className={`text-5xl font-bold ${cls.textColor}`}>{data.score}</span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded border ${cls.color} ${cls.textColor}`}>
              {cls.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">{t("eudr_label")}</p>
          <div className={`inline-flex max-w-56 items-center justify-end gap-1.5 text-right ${eudrUi.text}`}>
            <EudrIcon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold leading-tight">{eudrLabel}</span>
          </div>
          <p className="mt-1 max-w-56 text-xs leading-snug text-white/45">
            {t("eudr_prelim_helper")}
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
                {annualPrecipMm.toFixed(0)} mm/yr
              </p>
            </div>
            <div>
              <p className="text-xs text-white/70">{t("temp_label")}</p>
              <p className="text-lg font-semibold text-white">
                {avgTempC !== null ? `${avgTempC.toFixed(1)} °C` : "—"}
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
