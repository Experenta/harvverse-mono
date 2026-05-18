"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, DollarSign, AlertCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  milestones_attested: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awaiting_settlement: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  settled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function FarmerInvestmentsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("investments");
  const tp = useTranslations("partnership");
  const tl = useTranslations("lot");

  const {
    data: partnerships,
    isLoading: partnershipLoading,
    isError,
  } = useQuery(
    trpc.partnerships.forFarmer.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || partnershipLoading;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/farmer")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <DollarSign className="w-8 h-8 text-[#a37241]" />
            {t("farmer_title")}
          </h1>
          <p className="text-gray-400">{t("farmer_subtitle")}</p>
        </div>
      </div>

      {isError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load")}
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !partnerships || partnerships.length === 0 ? (
        <GlassCard className="p-12 text-center border-[#a37241]/20">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">{t("no_partnerships")}</p>
          <p className="text-gray-500 text-sm">{t("partnerships_appear")}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {partnerships.map((p) => {
            const plan = p.plan;
            const lot = p.lot;
            const statusClass =
              STATUS_CLASSES[p.status] ??
              "bg-gray-500/20 text-gray-400 border-gray-500/30";

            return (
              <GlassCard
                key={p.id}
                className="p-6 border-[#a37241]/20 cursor-pointer hover:border-[#a37241]/40 transition-colors"
                onClick={() =>
                  router.push(`/investments/${p.id}?from=farmer` as Route)
                }
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {lot.farmName} — {lot.code ?? tl("lot_id", { id: lot.id })}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {t("partner_wallet", { wallet: `${p.partnerWallet.slice(0, 10)}…${p.partnerWallet.slice(-8)}` })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusClass}>
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                    {plan && (
                      <p className="text-xl font-bold text-[#a37241]">
                        {formatUsdFromCents(plan.ticketCents)}
                      </p>
                    )}
                  </div>
                </div>

                {plan && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">{tp("farmer_split")}</p>
                      <p className="font-medium mt-1">
                        {(plan.splitFarmerBps / 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{tp("proj_yield")}</p>
                      <p className="font-medium mt-1">
                        {(plan.projectedYieldY1TenthsQq / 10).toFixed(1)} qq
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t("price_lb")}</p>
                      <p className="font-medium mt-1">
                        {formatUsdFromCents(plan.priceCentsPerLb)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button variant="link" className="text-[#a37241] p-0 h-auto">
                    {tp("view_details")}
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
