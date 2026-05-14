"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Sprout,
  Coins,
  Sparkles,
  Cpu,
  Package,
} from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Progress } from "@harvverse-monorepo/ui/components/progress";

import { DEMO_WALLET } from "@/hooks/use-auth";

const mockData = {
  totalInvested: 3425,
  activeInvestments: 1,
  fundedLots: 1,
  totalLots: 2,
  investments: [
    {
      id: 1,
      farmName: "Finca Zafiro",
      lotName: "HVPLAN-ZAF-L02-2026",
      lotArea: "1",
      returnType: "PHYGITAL",
      amount: "3425",
      status: "active",
      tokensTotal: 85,
      tokensReleased: 12,
      investorName: "Alex Rivera",
      createdAt: "2026-01-15T00:00:00Z",
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FarmerInvestmentsPage() {
  const router = useRouter();
  const isDemo = Boolean(DEMO_WALLET);

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
            Investments in My Farms
          </h1>
          <p className="text-gray-400">
            Track investments from Phartmers in your farm lots
          </p>
        </div>
      </div>

      {!isDemo ? (
        <GlassCard className="p-12 text-center border-[#a37241]/20">
          <p className="text-gray-400">No investments yet.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <GlassCard
              variant="darker"
              className="p-6 border-[#a37241]/20 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Invested</p>
                <p className="text-2xl font-bold text-white">
                  ${mockData.totalInvested.toLocaleString()}
                </p>
              </div>
            </GlassCard>

            <GlassCard
              variant="darker"
              className="p-6 border-[#a37241]/20 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Active Investments</p>
                <p className="text-2xl font-bold text-white">
                  {mockData.activeInvestments}
                </p>
              </div>
            </GlassCard>

            <GlassCard
              variant="darker"
              className="p-6 border-[#a37241]/20 flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Sprout className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Funded Lots</p>
                <p className="text-2xl font-bold text-white">
                  {mockData.fundedLots} / {mockData.totalLots}
                </p>
              </div>
            </GlassCard>
          </div>

          <GlassCard variant="darker" className="p-6 border-[#a37241]/20">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-6">
              <Coins className="w-5 h-5 text-[#a37241]" />
              Investment List
            </h2>

            {mockData.investments.map((investment) => (
              <div
                key={investment.id}
                className="p-5 bg-black/40 rounded-xl border border-white/5 mb-4"
              >
                <div className="flex justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={getTypeBadgeStyle(investment.returnType)}
                    >
                      {getTypeIcon(investment.returnType)}
                      {investment.returnType} Investment
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-green-400 border-green-500/30"
                    >
                      {investment.status}
                    </Badge>
                  </div>
                  <span className="text-xl font-bold">
                    ${Number(investment.amount).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-gray-400 mb-3">
                  <span className="text-white font-medium">
                    {investment.farmName}
                  </span>{" "}
                  • {investment.lotName} • {investment.lotArea} manzanas
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-400">Investor: </span>
                    <span className="text-white">
                      {investment.investorName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Date: </span>
                    <span className="text-white">
                      {formatDate(investment.createdAt)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Token Progress</span>
                    <span className="text-white">
                      {investment.tokensReleased}/{investment.tokensTotal} (14%)
                    </span>
                  </div>
                  <Progress value={14} className="h-2" />
                </div>

                <div className="border-t border-white/5 mt-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#a37241]/50 text-[#a37241] hover:bg-[#a37241]/10"
                    onClick={() => router.push(`/investments/${investment.id}`)}
                  >
                    View Token Schedule
                  </Button>
                </div>
              </div>
            ))}
          </GlassCard>
        </>
      )}
    </div>
  );
}
