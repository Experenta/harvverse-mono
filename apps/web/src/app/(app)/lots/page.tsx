"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { formatUsdFromCents } from "@/lib/format";
import { trpc } from "@/utils/trpc";

function riskTone(score: number | null | undefined): {
  label: string;
  className: string;
} {
  if (score == null) return { label: "Risk: —", className: "bg-white/10 text-gray-300 border-white/10" };
  if (score >= 70) return { label: `Risk ${score}`, className: "bg-green-500/20 text-green-400 border-green-500/30" };
  if (score >= 40) return { label: `Risk ${score}`, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  return { label: `Risk ${score}`, className: "bg-red-500/20 text-red-400 border-red-500/30" };
}

export default function LotsPage() {
  const router = useRouter();
  const { data: lots, isLoading } = useQuery(
    trpc.lots.list.queryOptions({ status: "available" }),
  );

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Available Lots</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <GlassCard key={idx} className="p-6 border-primary/20">
              <Skeleton className="h-6 w-2/3 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-9 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : !lots || lots.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">No available lots right now.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lots.map((lot) => {
            const risk = riskTone(lot.riskScore);
            return (
              <GlassCard
                key={lot.id}
                className="p-6 border-primary/20 cursor-pointer"
                onClick={() => router.push(`/lots/${lot.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold">
                    {lot.code ?? `Lot #${lot.id}`}
                  </h3>
                  <Badge className={risk.className}>{risk.label}</Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-300 mb-4">
                  {lot.variety ? <p>Variety: {lot.variety}</p> : null}
                  <p>
                    {lot.region}, {lot.country}
                  </p>
                  {lot.areaManzanas ? (
                    <p>{lot.areaManzanas} manzanas</p>
                  ) : null}
                </div>

                {(() => {
                  const activePlan = lot.plans.find(
                    (p) => p.status !== "revoked",
                  );
                  return activePlan ? (
                    <p className="text-2xl font-bold text-primary mb-3">
                      {formatUsdFromCents(activePlan.ticketCents)}
                    </p>
                  ) : null;
                })()}

                <div className="flex items-center justify-between mb-4">
                  {lot.eudrCompliant ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <ShieldCheck className="w-3 h-3" />
                      EUDR compliant
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      EUDR pending
                    </span>
                  )}
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/lots/${lot.id}`);
                  }}
                >
                  View Lot
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
