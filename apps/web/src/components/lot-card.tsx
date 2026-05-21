"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Mountain,
  MapPin,
  Sprout,
  ArrowRight,
  ShieldCheck,
  Inbox,
  TrendingUp,
  DollarSign,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
  if (score == null) return "bg-gray-500/20 text-white/60 border-gray-500/30";
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
      return "bg-gray-500/20 text-white/60 border-gray-500/30";
  }
}

export function LotCard({ lot, variant, pendingProposals = 0 }: LotCardProps) {
  const router = useRouter();
  const t = useTranslations("lot");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const activePlan = lot.plans[0] ?? null;
  const ticketUsd = activePlan ? (activePlan.ticketCents / 100).toFixed(0) : null;
  const partnerReturnPct = activePlan?.splitPartnerBps
    ? (activePlan.splitPartnerBps / 100).toFixed(0)
    : null;

  const displayImages = lot.coverImages?.filter(Boolean) ?? [];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard className="group flex flex-col overflow-hidden border-primary/20 transition-all hover:border-primary/50 hover:shadow-primary/5">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/20 to-[#001020]">
          <AnimatePresence mode="wait">
            {displayImages.length > 0 ? (
              <motion.img
                key={displayImages[currentImageIndex]}
                src={displayImages[currentImageIndex]}
                alt={lot.code ?? `Lot ${lot.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "";
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Sprout className="size-12 text-primary/30" />
              </div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-[#001020] via-[#001020]/20 to-transparent pointer-events-none" />

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {displayImages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-3 rounded-full transition-all ${
                      i === currentImageIndex ? "bg-primary w-5" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none">
            <Badge className={`rounded-full border text-[9px] px-2 py-0 backdrop-blur-md ${statusBadgeStyles(lot.status)}`}>
              {t(`status_${lot.status}` as Parameters<typeof t>[0]) ?? lot.status}
            </Badge>
            {lot.eudrCompliant && (
              <Badge className="gap-1 rounded-full border border-[#67B9C1]/30 bg-[#67B9C1]/20 text-[9px] text-[#67B9C1] px-2 py-0 backdrop-blur-md">
                <ShieldCheck className="size-2.5" />
                EUDR
              </Badge>
            )}
          </div>

          {lot.riskScore != null && (
            <div className="absolute top-2 right-2">
              <Badge className={`rounded-full border text-[9px] font-bold px-2 py-0 backdrop-blur-md ${riskBadgeStyles(lot.riskScore)}`}>
                {t("risk_label", { score: lot.riskScore })}
              </Badge>
            </div>
          )}

          {variant === "farmer" && pendingProposals > 0 && (
            <div className="absolute bottom-2 right-2">
              <span className="flex items-center gap-1 text-[10px] bg-yellow-500 text-black font-bold rounded-full px-2 py-0.5 shadow-lg border border-yellow-400/50">
                <Inbox className="size-2.5" />
                {pendingProposals}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 card-highlight">
          <h3 className="mb-0.5 truncate font-trenda text-base font-bold leading-tight text-white group-hover:text-primary transition-colors">
            {lot.code ?? t("lot_id", { id: lot.id })}
          </h3>
          <p className="mb-1 truncate text-sm text-white/80">{lot.farmName}</p>
          <p className="mb-3 flex items-center gap-1 text-xs text-white/60">
            <MapPin className="size-3 text-primary/60" />
            {lot.region}, {lot.country}
          </p>

          {(lot.variety || lot.altitudeMasl || lot.areaManzanas) && (
            <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/60">
              {lot.variety && (
                <span className="flex items-center gap-1">
                  <Sprout className="size-3 text-primary/60" />
                  {lot.variety}
                  {lot.process ? ` · ${lot.process}` : ""}
                </span>
              )}
              <div className="flex items-center gap-3">
                {lot.altitudeMasl && (
                  <span className="flex items-center gap-1">
                    <Mountain className="size-3 text-primary/60" />
                    {lot.altitudeMasl}m
                  </span>
                )}
                {lot.areaManzanas && (
                  <span>{Number(lot.areaManzanas).toFixed(1)} mzn</span>
                )}
              </div>
            </div>
          )}

          {activePlan && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {ticketUsd && (
                <div className="rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-2 text-center group-hover:bg-primary/10 transition-colors">
                  <div className="flex items-center justify-center gap-1 text-sm font-bold text-primary">
                    <DollarSign className="size-3.5 text-primary/60" />
                    {ticketUsd}
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/45 uppercase tracking-wider">{t("ticket")}</div>
                </div>
              )}
              {partnerReturnPct && (
                <div className="rounded-lg border border-[#6766C4]/10 bg-[#6766C4]/5 px-2.5 py-2 text-center group-hover:bg-[#6766C4]/10 transition-colors">
                  <div className="flex items-center justify-center gap-1 text-sm font-bold text-[#6766C4]">
                    <TrendingUp className="size-3.5 text-[#6766C4]/60" />
                    {partnerReturnPct}%
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/45 uppercase tracking-wider">Split</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto">
            {variant === "partner" ? (
              <Button
                className="h-8 w-full bg-primary text-xs text-[#001020] hover:bg-primary/90"
                onClick={() => router.push(`/lots/${lot.id}` as Route)}
              >
                {t("view_lot")}
                <ArrowRight className="ml-2 size-3.5" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 border-primary/30 text-xs text-primary hover:bg-primary/10"
                  onClick={() =>
                    router.push(
                      `/dashboard/farmer/lots/${lot.id}` as Route,
                    )
                  }
                >
                  <Settings2 className="mr-1.5 size-3.5" />
                  Manage
                </Button>
                {pendingProposals > 0 && (
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 border border-yellow-500/30 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                    onClick={() =>
                      router.push("/dashboard/farmer/proposals" as Route)
                    }
                  >
                    <Inbox className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
