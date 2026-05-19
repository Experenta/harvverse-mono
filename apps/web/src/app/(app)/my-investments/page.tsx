"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, TrendingUp, AlertCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";


const PARTNERSHIP_TYPE_ICON: Record<string, string> = {
  phygital: "✨",
  physical: "🌿",
  digital: "💎",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  milestones_attested:
    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  awaiting_settlement:
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  settled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MyInvestmentsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("investments");
  const tp = useTranslations("partnership");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const {
    data: partnerships,
    isLoading: partnershipLoading,
    isError,
  } = useQuery(
    trpc.partnerships.myPartnerships.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || partnershipLoading;

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 text-white/70"
          onClick={() => router.push("/dashboard/player" as Route)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tc("back_to_dashboard")}
        </Button>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("my_title")}</h1>
          <p className="text-gray-400">{t("my_subtitle")}</p>
        </header>

        {isError ? (
          <GlassCard className="p-8 border-red-500/20">
            <p className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {t("failed_load")}
            </p>
          </GlassCard>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !partnerships || partnerships.length === 0 ? (
          <GlassCard className="p-12 text-center border-white/10">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">{t("no_investments")}</p>
            <Button
              className="bg-primary hover:bg-primary/90 text-[#001020]"
              onClick={() =>
                router.push("/dashboard/player/explore" as Route)
              }
            >
              {t("explore_farms")}
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {partnerships.map((p) => {
              const plan = p.plan;
              const lot = p.lot;
              const icon =
                PARTNERSHIP_TYPE_ICON["phygital"] ?? "💰";
              const statusClass =
                STATUS_CLASSES[p.status] ??
                "bg-gray-500/20 text-gray-400 border-gray-500/30";

              return (
                <GlassCard
                  key={p.id}
                  className="p-6 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() =>
                    router.push(`/investments/${p.id}` as Route)
                  }
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div>
                        <h3 className="text-xl font-bold">
                          {lot.farmName}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {lot.code ?? tl("lot_id", { id: lot.id })}
                          {lot.areaManzanas
                            ? ` • ${lot.areaManzanas} manzanas`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusClass}>
                        {tp(`status_${p.status}` as Parameters<typeof tp>[0]) ?? p.status.replace(/_/g, " ")}
                      </Badge>
                      {plan && (
                        <p className="text-2xl font-bold text-primary">
                          {formatUsdFromCents(plan.ticketCents)}
                        </p>
                      )}
                    </div>
                  </div>

                  {plan && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">{t("plan_label")}</p>
                        <p className="font-medium mt-1">{plan.planCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t("price_lb")}</p>
                        <p className="font-medium mt-1">
                          {formatUsdFromCents(plan.priceCentsPerLb)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t("partner_split")}</p>
                        <p className="font-medium mt-1">
                          {plan.splitPartnerBps
                            ? `${plan.splitPartnerBps / 100}%`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t("proj_yield")}</p>
                        <p className="font-medium mt-1">
                          {(plan.projectedYieldY1TenthsQq / 10).toFixed(1)}{" "}
                          qq
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <Button variant="link" className="text-primary p-0 h-auto">
                      {tp("view_details")}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
