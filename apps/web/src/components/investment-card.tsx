"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { formatUsdFromCents } from "@/lib/format";

interface Plan {
  ticketCents: number;
  priceCentsPerLb: number;
  splitPartnerBps?: number | null;
  splitFarmerBps?: number | null;
  planCode?: string | null;
}

interface Lot {
  id: number;
  code?: string | null;
  farmName: string;
  areaManzanas?: string | null;
}

interface Partnership {
  id: number;
  status: string;
  plan: Plan | null;
  lot: Lot;
  partnerWallet: string;
}

interface InvestmentCardProps {
  partnership: Partnership;
  variant: "player" | "farmer";
}

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  milestones_attested: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awaiting_settlement: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  settled: "bg-gray-500/20 text-white/60 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function InvestmentCard({ partnership: p, variant }: InvestmentCardProps) {
  const router = useRouter();
  const t = useTranslations("investments");
  const tp = useTranslations("partnership");
  const tl = useTranslations("lot");

  const plan = p.plan;
  const lot = p.lot;
  const statusClass =
    STATUS_CLASSES[p.status] ??
    "bg-gray-500/20 text-white/60 border-gray-500/30";

  const detailHref = variant === "farmer" 
    ? `/investments/${p.id}?from=farmer` as Route
    : `/investments/${p.id}` as Route;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard
        className="group flex flex-col overflow-hidden border-primary/20 transition-colors hover:border-primary/35 h-full"
      >
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/10 to-[#001020]">
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="size-16 text-primary/20" />
          </div>
          <div className="absolute top-2 left-2">
            <Badge className={`rounded-full border text-[9px] px-2 py-0 backdrop-blur-md ${statusClass}`}>
              {tp(`status_${p.status}` as Parameters<typeof tp>[0]) ?? p.status.replace(/_/g, " ")}
            </Badge>
          </div>
          {plan && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary/90 text-[#001020] border-0 text-[9px] font-bold px-2 py-0 backdrop-blur-md">
                {formatUsdFromCents(plan.ticketCents)}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5 card-highlight">
          <h3 className="truncate font-trenda text-sm font-bold text-white mb-0.5 group-hover:text-primary transition-colors">
            {lot.farmName}
          </h3>
          <p className="truncate text-xs text-white/60 mb-3">
            {lot.code ?? tl("lot_id", { id: lot.id })}
            {lot.areaManzanas ? ` • ${lot.areaManzanas}mzn` : ""}
          </p>

          {variant === "farmer" && (
            <div className="mb-4 rounded-lg bg-white/[0.03] border border-white/5 p-2">
              <p className="text-[9px] text-white/45 uppercase tracking-wider mb-0.5">Partner</p>
              <p className="truncate text-[10px] text-white/80 font-mono">
                {p.partnerWallet.slice(0, 6)}…{p.partnerWallet.slice(-4)}
              </p>
            </div>
          )}

          {plan && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-center group-hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/45 uppercase tracking-wider font-semibold">
                  {variant === "farmer" ? "Farmer" : "Partner"}
                </p>
                <p className="text-xs font-bold text-white mt-0.5">
                  {variant === "farmer" 
                    ? `${(p.plan?.splitFarmerBps ? p.plan.splitFarmerBps / 100 : 60).toFixed(0)}%`
                    : `${(p.plan?.splitPartnerBps ? p.plan.splitPartnerBps / 100 : 40).toFixed(0)}%`
                  }
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-center group-hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/45 uppercase tracking-wider font-semibold">Price/lb</p>
                <p className="text-xs font-bold text-white mt-0.5">
                  {formatUsdFromCents(plan.priceCentsPerLb)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <Button
              size="sm"
              className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-[11px] font-bold h-8"
              onClick={() => router.push(detailHref)}
            >
              {tp("view_details")}
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
