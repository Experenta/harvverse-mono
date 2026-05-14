"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import {
  Sprout,
  Plus,
  ArrowLeft,
  DollarSign,
  Sparkles,
  Cpu,
  Package,
  Coins,
} from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Progress } from "@harvverse-monorepo/ui/components/progress";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { DEMO_WALLET } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const INVESTMENT_RATES = {
  PHYSICAL: 2525,
  DIGITAL: 1200,
  PHYGITAL: 3425,
} as const;

const mockFarm = {
  id: 1,
  farmName: "Finca Zafiro",
  country: "Honduras",
  region: "Comayagua",
  altitude: 1300,
  verified: true,
  lots: [
    {
      id: 1,
      name: "HVPLAN-ZAF-L02-2026",
      variety: "Parainema",
      areaManzanas: 1,
      numTrees: 1000,
      status: "Available",
      investment: {
        id: 1,
        returnType: "PHYGITAL",
        amount: "3425",
        investorName: "Alex Rivera",
        tokensReleased: 12,
        tokensTotal: 85,
      },
    },
    {
      id: 2,
      name: "HVPLAN-ZAF-L03-2026",
      variety: "Parainema",
      areaManzanas: 1,
      numTrees: 1000,
      status: "Available",
      investment: null,
    },
  ],
};

function getTypeIcon(type: string) {
  switch (type) {
    case "PHYSICAL":
      return <Package className="w-4 h-4" />;
    case "DIGITAL":
      return <Cpu className="w-4 h-4" />;
    case "PHYGITAL":
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Coins className="w-4 h-4" />;
  }
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case "PHYSICAL":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "DIGITAL":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "PHYGITAL":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export default function FarmerFarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmIdParam = params.farmId;
  const farmId = Number(farmIdParam);
  const farmIdValid = Number.isFinite(farmId);
  const isDemo = Boolean(DEMO_WALLET);

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      { enabled: farmIdValid && !isDemo },
    ),
  );

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/farmer/my-farms")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Farms
      </Button>

      {isDemo ? (
        <>
          <GlassCard className="p-8 border-primary/20 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{mockFarm.farmName}</h1>
                <p className="text-gray-400">
                  📍 {mockFarm.region}, {mockFarm.country} • ⛰️ {mockFarm.altitude}{" "}
                  MASL
                </p>
              </div>
              <div className="text-sm bg-primary/20 text-primary px-3 py-1 rounded">
                {mockFarm.verified ? "✓ Verified" : "Pending Verification"}
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              Investment Lots ({mockFarm.lots.length})
            </h2>
            <Button
              className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
              onClick={() =>
                router.push(
                  `/dashboard/farmer/farms/${farmIdParam}/create-lot` as Route,
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Lot
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockFarm.lots.map((lot) => (
              <GlassCard key={lot.id} className="p-6 border-primary/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold">{lot.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      <Sprout className="w-3 h-3 inline mr-1" />
                      {lot.variety} • {lot.areaManzanas} manzanas
                    </p>
                  </div>
                  {lot.investment ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <DollarSign className="w-3 h-3" />
                      FUNDED
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      AVAILABLE
                    </Badge>
                  )}
                </div>

                {lot.investment ? (
                  <div className="space-y-3 mt-4 p-4 bg-black/30 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center">
                      <Badge
                        className={getTypeBadgeStyle(lot.investment.returnType)}
                      >
                        {getTypeIcon(lot.investment.returnType)}
                        {lot.investment.returnType}
                      </Badge>
                      <span className="font-bold">
                        ${Number(lot.investment.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Investor:{" "}
                      <span className="text-white">
                        {lot.investment.investorName}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Token Progress</span>
                        <span className="text-white">
                          {lot.investment.tokensReleased}/
                          {lot.investment.tokensTotal}
                        </span>
                      </div>
                      <Progress
                        value={Math.round(
                          (lot.investment.tokensReleased /
                            lot.investment.tokensTotal) *
                            100,
                        )}
                        className="h-1.5"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-primary/50 text-primary hover:bg-primary/10"
                      onClick={() =>
                        router.push(
                          `/investments/${lot.investment!.id}?from=farmer`,
                        )
                      }
                    >
                      View Details
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm mt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trees:</span>
                      <span className="text-white">{lot.numTrees}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <p className="text-xs text-gray-500 mb-2">
                        Investment Options:
                      </p>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Package className="w-3 h-3" />
                          Physical:
                        </span>
                        <span className="text-white">
                          ${INVESTMENT_RATES.PHYSICAL.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Cpu className="w-3 h-3" />
                          Digital:
                        </span>
                        <span className="text-white">
                          ${INVESTMENT_RATES.DIGITAL.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Sparkles className="w-3 h-3" />
                          Phygital:
                        </span>
                        <span className="text-white">
                          ${INVESTMENT_RATES.PHYGITAL.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-center text-gray-500 text-xs pt-2">
                        Waiting for investment...
                      </p>
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !farm ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">Farm not found.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="p-8 border-primary/20 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{farm.name}</h1>
                <p className="text-gray-400">
                  📍 {farm.region}, {farm.country}
                  {farm.altitudeMasl ? ` • ⛰️ ${farm.altitudeMasl} MASL` : null}
                </p>
              </div>
              <div className="text-sm bg-primary/20 text-primary px-3 py-1 rounded">
                {farm.verified ? "✓ Verified" : "Pending Verification"}
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              Investment Lots ({farm.lots.length})
            </h2>
            <Button
              className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
              onClick={() =>
                router.push(
                  `/dashboard/farmer/farms/${farm.id}/create-lot` as Route,
                )
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Lot
            </Button>
          </div>

          {farm.lots.length === 0 ? (
            <GlassCard className="p-8 text-center border-primary/20">
              <p className="text-gray-400">No lots on this farm yet.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {farm.lots.map((lot) => (
                <GlassCard key={lot.id} className="p-6 border-primary/20">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold">
                        {lot.code ?? `Lot #${lot.id}`}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        <Sprout className="w-3 h-3 inline mr-1" />
                        {lot.variety ?? "Unknown"} • {lot.areaManzanas ?? "N/A"} manzanas
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase">
                      {lot.status}
                    </Badge>
                  </div>
                  {lot.harvestYear ? (
                    <p className="text-sm text-gray-400">
                      Harvest: {lot.harvestYear}
                    </p>
                  ) : null}
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
