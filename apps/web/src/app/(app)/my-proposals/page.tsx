"use client";

import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function MyProposalsPage() {
  const router = useRouter();
  const { data: user, clerkUser, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("proposals");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");

  const {
    data: proposals,
    isLoading: proposalsLoading,
    isError,
  } = useQuery(
    trpc.proposals.myProposals.queryOptions(
      { clerkId: clerkUser?.id },
      { enabled: !!clerkUser?.id },
    ),
  );

  const isLoading = userLoading || proposalsLoading;

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
          <h1 className="text-4xl font-bold mb-2">{t("my_proposals_title")}</h1>
          <p className="text-gray-400">{t("my_proposals_subtitle")}</p>
        </header>

        {isError ? (
          <GlassCard className="p-8 border-red-500/20">
            <p className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {tc("error")}
            </p>
          </GlassCard>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <GlassCard className="p-12 text-center border-primary/20">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">{t("no_my_proposals")}</p>
            <p className="text-gray-500 text-sm mb-6">{t("no_my_proposals_subtitle")}</p>
            <Button
              onClick={() => router.push("/dashboard/player/explore" as Route)}
              className="bg-primary hover:bg-primary/90 text-[#001020] font-bold"
            >
              {t("explore_lots")}
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {proposals.map((p) => {
              const plan = p.plan;
              const lot = p.lot;
              const statusClass =
                STATUS_CLASSES[p.status] ??
                "bg-gray-500/20 text-gray-400 border-gray-500/30";
              const isApproved = p.status === "signed";
              const isPending = p.status === "pending" || p.status === "submitted";

              return (
                <GlassCard
                  key={p.id}
                  className={`p-6 transition-colors ${
                    isApproved
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-primary/20"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        {lot.farmName} — {lot.code ?? tl("lot_id", { id: lot.id })}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusClass}>{t(`status_${p.status}` as Parameters<typeof t>[0]) ?? p.status}</Badge>
                      {plan && (
                        <p className="text-xl font-bold text-primary">
                          {formatUsdFromCents(plan.ticketCents)}
                        </p>
                      )}
                    </div>
                  </div>

                  {isApproved && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-300 font-semibold text-sm mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t("approved_banner_title")}
                      </p>
                      <p className="text-sm text-gray-300">
                        {t("confirm_desc", {
                          amount: plan ? formatUsdFromCents(plan.ticketCents) : "—",
                        })}
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-300 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        {t("pending")}
                      </p>
                    </div>
                  )}

                  {(p.status === "failed" || p.status === "expired") && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-300 text-sm flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" />
                        {t("rejected")}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-2">
                    <Button
                      variant="link"
                      className="text-primary p-0 h-auto"
                      onClick={() => router.push(`/lots/${lot.id}` as Route)}
                    >
                      {tl("view_lot")}
                    </Button>
                    {isApproved && (
                      <Button
                        className="bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold"
                        onClick={() => router.push(`/lots/${lot.id}` as Route)}
                      >
                        {t("confirm_wallet_cta")}
                      </Button>
                    )}
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
