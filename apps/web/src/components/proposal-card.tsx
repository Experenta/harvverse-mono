"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { formatUsdFromCents } from "@/lib/format";

interface Plan {
  ticketCents: number;
  splitPartnerBps?: number | null;
  splitFarmerBps?: number | null;
}

interface Lot {
  id: number;
  code?: string | null;
  farmName: string;
}

interface User {
  displayName?: string | null;
  country?: string | null;
}

interface Proposal {
  id: number;
  status: string;
  createdAt: string | Date;
  plan: Plan | null;
  lot: Lot;
  user?: User | null;
  message?: string | null;
}

interface ProposalCardProps {
  proposal: Proposal;
  variant: "player" | "farmer";
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
  isProcessing?: boolean;
}

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-gray-500/20 text-white/60 border-gray-500/30",
};

export function ProposalCard({ 
  proposal: p, 
  variant, 
  onApprove, 
  onReject,
  isProcessing 
}: ProposalCardProps) {
  const router = useRouter();
  const t = useTranslations("proposals");
  const tl = useTranslations("lot");

  const plan = p.plan;
  const lot = p.lot;
  const partner = p.user;
  const statusClass =
    STATUS_CLASSES[p.status] ??
    "bg-gray-500/20 text-white/60 border-gray-500/30";
  
  const isApproved = p.status === "signed";
  const isPending = p.status === "pending" || p.status === "submitted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard
        className={`group flex flex-col overflow-hidden transition-colors h-full ${
          isApproved
            ? "border-green-500/30 bg-green-500/5"
            : isPending
              ? "border-yellow-500/25 bg-yellow-500/5"
              : p.status === "failed" || p.status === "expired"
                ? "border-red-500/25 bg-red-500/5"
                : "border-primary/20 bg-white/[0.03]"
        }`}
      >
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/10 to-[#001020]">
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="size-16 text-primary/20" />
          </div>
          <div className="absolute top-2 left-2">
            <Badge className={`rounded-full border text-[9px] px-2 py-0 backdrop-blur-md ${statusClass}`}>
              {t(`status_${p.status}` as Parameters<typeof t>[0]) ?? p.status}
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

        <div className="flex flex-1 flex-col p-4 card-highlight">
          <h3 className="truncate font-trenda text-base font-bold text-white mb-0.5 group-hover:text-primary transition-colors">
            {lot.farmName}
          </h3>
          <p className="truncate text-xs text-white/60 mb-3">
            {lot.code ?? tl("lot_id", { id: lot.id })}
          </p>

          {variant === "farmer" && partner && (
            <div className="flex items-center gap-2 mb-4 bg-white/[0.03] border border-white/5 p-2 rounded-lg">
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{t("partner_label")}:</span>
              <span className="text-sm text-white truncate font-medium group-hover:text-primary transition-colors">
                {partner.displayName ?? t("unknown_partner")}
              </span>
            </div>
          )}

          {plan && variant === "farmer" && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-center group-hover:bg-white/[0.06] transition-colors">
                <p className="text-[10px] text-white/45 uppercase tracking-wider">{t("partner_split_label")}</p>
                <p className="text-xs font-bold text-white mt-0.5">
                  {plan.splitPartnerBps ? `${plan.splitPartnerBps / 100}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-center group-hover:bg-white/[0.06] transition-colors">
                <p className="text-[10px] text-white/45 uppercase tracking-wider">{t("farmer_split_label")}</p>
                <p className="text-xs font-bold text-white mt-0.5">
                  {plan.splitFarmerBps ? `${plan.splitFarmerBps / 100}%` : "—"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto space-y-3">
            {isApproved && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-2">
                <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-green-300">
                  <CheckCircle2 className="size-3.5" />
                  {t("approved_banner_title")}
                </p>
              </div>
            )}

            {isPending && variant === "player" && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2">
                <p className="flex items-center justify-center gap-1.5 text-xs text-yellow-300">
                  <Clock className="size-3.5 shrink-0" />
                  {t("pending")}
                </p>
              </div>
            )}

            {variant === "farmer" && isPending && onApprove && onReject ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 bg-primary text-xs font-bold text-[#001020] hover:bg-primary/90"
                  disabled={isProcessing}
                  onClick={() => onApprove(p.id)}
                >
                  {isProcessing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1" />
                  )}
                  {t("approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 border-red-500/40 text-xs font-bold text-red-300 hover:bg-red-500/10"
                  disabled={isProcessing}
                  onClick={() => onReject(p.id)}
                >
                  {isProcessing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <XCircle className="size-3.5 mr-1" />
                  )}
                  {t("reject")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  className="h-8 w-full text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => router.push(`/lots/${lot.id}` as Route)}
                >
                  {tl("view_lot")}
                </Button>
                {isApproved && variant === "player" && (
                  <Button
                    size="sm"
                    className="h-8 w-full border border-green-500/40 bg-green-500/20 text-xs font-bold text-green-300 hover:bg-green-500/30"
                    onClick={() => router.push(`/lots/${lot.id}` as Route)}
                  >
                    {t("confirm_wallet_cta")}
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
