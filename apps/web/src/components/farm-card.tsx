"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin, Mountain, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { eudrTone, extractEudrScreening } from "@/lib/eudr-screening";

interface Lot {
  id: number;
  status: string;
  variety?: string | null;
  plans: unknown[];
}

interface Farm {
  id: number;
  name: string;
  region: string;
  country: string;
  altitudeMasl?: number | null;
  areaManzanas?: string | null;
  varieties?: string[] | null;
  certifications?: string[] | null;
  photoUrls?: string[] | null;
  coeScore?: string | null;
  verified?: boolean | null;
  riskScore?: number | null;
  eudrCompliant?: boolean | null;
  scoreBreakdown?: unknown;
  primaryImageData?: string | null;
  primaryImageMimeType?: string | null;
  lots: Lot[];
}

interface FarmCardProps {
  farm: Farm;
}

export function FarmCard({ farm }: FarmCardProps) {
  const router = useRouter();
  const t = useTranslations("farm");
  const tn = useTranslations("nav");

  const varieties = Array.from(
    new Set([
      ...(farm.varieties ?? []),
      ...farm.lots.map((l) => l.variety).filter(Boolean),
    ]),
  ) as string[];
  const scoreBadge =
    farm.riskScore == null
      ? null
      : farm.riskScore >= 80
        ? { className: "border-green-500/30 bg-green-500/15 text-green-300", label: `● ${farm.riskScore} Excelente` }
        : farm.riskScore >= 60
          ? { className: "border-[#67B9C1]/35 bg-[#67B9C1]/15 text-[#67B9C1]", label: `● ${farm.riskScore} Bueno` }
          : farm.riskScore >= 40
            ? { className: "border-yellow-500/35 bg-yellow-500/15 text-yellow-300", label: `● ${farm.riskScore} Moderado` }
            : { className: "border-red-500/35 bg-red-500/15 text-red-300", label: `● ${farm.riskScore} Alto Riesgo` };
  const primaryImageSrc = farm.primaryImageData && farm.primaryImageMimeType
    ? `data:${farm.primaryImageMimeType};base64,${farm.primaryImageData}`
    : farm.photoUrls?.[0] ?? null;
  const eudrScreening = extractEudrScreening(farm.scoreBreakdown);
  const eudrStatus = eudrScreening?.status ?? null;
  const eudrUi = eudrTone(eudrStatus);
  const eudrLabel =
    eudrStatus === "low_risk"
      ? t("eudr_prelim_passed")
      : eudrStatus === "review_required"
        ? t("eudr_prelim_review")
        : eudrStatus === "high_risk"
          ? t("eudr_prelim_failed")
          : eudrStatus === "unknown"
            ? t("eudr_prelim_inconclusive")
            : farm.riskScore != null
              ? t("eudr_prelim_inconclusive")
              : t("status_analyzing");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard className="group flex flex-col overflow-hidden border-primary/20 transition-all hover:border-primary/50 hover:shadow-primary/5">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/20 to-[#001020]">
          {primaryImageSrc && (
            <img
              src={primaryImageSrc}
              alt={farm.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001020] via-[#001020]/20 to-transparent" />
          
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
            <Badge className={`max-w-44 rounded-full border px-2 py-0 text-[9px] font-bold backdrop-blur-md ${farm.riskScore == null ? "border-white/15 bg-white/10 text-white/55" : eudrUi.badge}`}>
              <span className="truncate">{eudrLabel}</span>
            </Badge>
            {scoreBadge ? (
              <Badge className={`rounded-full px-2 py-0 text-[9px] font-bold backdrop-blur-md ${scoreBadge.className}`}>
                {scoreBadge.label}
              </Badge>
            ) : null}
            {farm.verified && (
              <Badge className="gap-1 rounded-full border border-primary/30 bg-primary/20 text-[9px] font-bold text-primary backdrop-blur-md px-2 py-0">
                <CheckCircle2 className="size-2.5" />
                {t("verified")}
              </Badge>
            )}
            {farm.coeScore && (
              <Badge className="rounded-full border border-yellow-500/30 bg-yellow-500/20 text-[9px] font-bold text-yellow-400 backdrop-blur-md px-2 py-0">
                CoE {farm.coeScore}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 card-highlight">
          <h3 className="mb-1 truncate font-trenda text-base font-bold text-white group-hover:text-primary transition-colors">
            {farm.name}
          </h3>

          <div className="mb-4 flex flex-col gap-1 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3 text-primary/60" />
              {farm.region}, {farm.country}
            </span>
            <div className="flex items-center gap-4">
              {farm.altitudeMasl && (
                <span className="flex items-center gap-1.5">
                  <Mountain className="size-3 text-primary/60" />
                  {farm.altitudeMasl}m
                </span>
              )}
              {farm.areaManzanas && (
                <span>
                  {Number(farm.areaManzanas).toFixed(1)} mzn
                </span>
              )}
            </div>
          </div>

          {varieties.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {varieties.slice(0, 3).map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                >
                  {v}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-white/5">
            <div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-full border-[#67B9C1]/40 text-xs text-[#67B9C1] hover:bg-[#67B9C1]/10"
                onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}`)}
              >
                {tn("manage")}
              </Button>
              {/*
                Lot creation is intentionally hidden while the product flow focuses
                on farm registration and Copernicus analysis.
              */}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
