"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Mountain,
  Sprout,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  TrendingUp,
  DollarSign,
  Settings2,
} from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";

interface Plan {
  id: number;
  ticketCents: number;
  splitPartnerBps?: number | null;
}

interface Lot {
  id: number;
  code?: string | null;
  farmName: string;
  region: string;
  country: string;
  variety?: string | null;
  process?: string | null;
  altitudeMasl?: number | null;
  areaManzanas?: string | null;
  status: string;
  riskScore?: number | null;
  eudrCompliant?: boolean | null;
  coverImages?: string[] | null;
  harvestYear?: number | null;
  plans: Plan[];
}

interface LotCardProps {
  lot: Lot;
  variant: "partner" | "farmer";
  pendingProposals?: number;
}

function riskBadgeStyles(score: number | null | undefined) {
  if (score == null) return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  if (score >= 75) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= 50) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function statusBadgeStyles(status: string) {
  switch (status) {
    case "available":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "reserved":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "active":
      return "bg-[#67B9C1]/20 text-[#67B9C1] border-[#67B9C1]/30";
    case "settled":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export function LotCard({ lot, variant, pendingProposals = 0 }: LotCardProps) {
  const router = useRouter();
  const t = useTranslations("lot");

  const activePlan = lot.plans[0] ?? null;
  const ticketUsd = activePlan ? (activePlan.ticketCents / 100).toFixed(0) : null;
  const partnerReturnPct = activePlan?.splitPartnerBps
    ? (activePlan.splitPartnerBps / 100).toFixed(0)
    : null;

  const coverSrc = lot.coverImages?.[0];

  return (
    <GlassCard className="overflow-hidden border-primary/20 flex flex-col">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/10 to-[#001020]">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={lot.code ?? `Lot ${lot.id}`}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "";
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector<HTMLElement>("[data-fallback]");
                if (fallback) fallback.style.display = "flex";
              }
            }}
          />
        ) : null}
        <div
          data-fallback=""
          className="absolute inset-0 flex items-center justify-center"
          style={{ display: coverSrc ? "none" : "flex" }}
        >
          <Sprout className="w-16 h-16 text-primary/30" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge className={`text-xs border ${statusBadgeStyles(lot.status)}`}>
            {t(`status_${lot.status}` as Parameters<typeof t>[0]) ?? lot.status}
          </Badge>
          {lot.eudrCompliant && (
            <Badge className="bg-[#67B9C1]/20 text-[#67B9C1] border-[#67B9C1]/30 text-xs gap-1">
              <ShieldCheck className="w-3 h-3" />
              EUDR
            </Badge>
          )}
          {lot.eudrCompliant === false && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs gap-1">
              <ShieldAlert className="w-3 h-3" />
              EUDR?
            </Badge>
          )}
        </div>

        {lot.riskScore != null && (
          <div className="absolute top-3 right-3">
            <Badge className={`text-xs border font-semibold ${riskBadgeStyles(lot.riskScore)}`}>
              {t("risk_label", { score: lot.riskScore })}
            </Badge>
          </div>
        )}

        {variant === "farmer" && pendingProposals > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="flex items-center gap-1 text-xs bg-yellow-500 text-black font-bold rounded-full px-2 py-0.5">
              <Inbox className="w-3 h-3" />
              {pendingProposals}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-bold mb-0.5 leading-tight">
          {lot.code ?? t("lot_id", { id: lot.id })}
        </h3>
        <p className="text-gray-300 text-sm mb-0.5">{lot.farmName}</p>
        <p className="text-gray-400 text-xs mb-3">
          📍 {lot.region}, {lot.country}
        </p>

        {(lot.variety || lot.altitudeMasl || lot.areaManzanas) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
            {lot.variety && (
              <span className="flex items-center gap-1">
                <Sprout className="w-3 h-3" />
                {lot.variety}
                {lot.process ? ` · ${lot.process}` : ""}
              </span>
            )}
            {lot.altitudeMasl && (
              <span className="flex items-center gap-1">
                <Mountain className="w-3 h-3" />
                {lot.altitudeMasl} m
              </span>
            )}
            {lot.areaManzanas && (
              <span>{Number(lot.areaManzanas).toFixed(1)} mzn</span>
            )}
          </div>
        )}

        {activePlan && (
          <div className="flex gap-3 mb-4">
            {ticketUsd && (
              <div className="flex-1 bg-primary/5 rounded-lg p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-primary text-sm font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  {ticketUsd}
                </div>
                <div className="text-gray-500 text-[10px] mt-0.5">{t("ticket")}</div>
              </div>
            )}
            {partnerReturnPct && (
              <div className="flex-1 bg-[#6766C4]/5 rounded-lg p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[#6766C4] text-sm font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {partnerReturnPct}%
                </div>
                <div className="text-gray-500 text-[10px] mt-0.5">{t("partner_split_pct")}</div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto">
          {variant === "partner" ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-[#001020] text-sm"
              onClick={() => router.push(`/lots/${lot.id}` as Route)}
            >
              {t("view_lot")}
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() =>
                  router.push(
                    `/dashboard/farmer/lots/${lot.id}` as Route,
                  )
                }
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                {t("manage_lot")}
              </Button>
              {pendingProposals > 0 && (
                <Button
                  size="sm"
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30"
                  onClick={() =>
                    router.push("/dashboard/farmer/proposals" as Route)
                  }
                >
                  <Inbox className="w-3.5 h-3.5 mr-1" />
                  {pendingProposals}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
