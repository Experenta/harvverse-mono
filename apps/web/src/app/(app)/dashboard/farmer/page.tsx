"use client";

import {
  Tractor,
  CloudRain,
  Thermometer,
  Droplets,
  DollarSign,
  TrendingUp,
  Sprout,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { DEMO_WALLET, useCurrentUser } from "@/hooks/use-auth";

const mockInvestmentsData = {
  totalInvested: 3425,
  activeInvestments: 1,
  fundedLots: 1,
  totalLots: 2,
};

export default function FarmerDashboardPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const isDemo = Boolean(DEMO_WALLET);

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.displayName}!</h1>
          <p className="text-gray-400">
            You are logged in as a{" "}
            <span className="text-[#a37241] font-semibold">Farmer</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a37241] to-[#5e3c1e] border border-white/10" />
      </header>

      {isDemo && mockInvestmentsData.activeInvestments > 0 && (
        <GlassCard
          variant="darker"
          className="p-6 border-[#a37241]/20 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#a37241]" />
            <h2 className="text-xl font-bold">Investments in My Farms</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Total Invested</p>
                <p className="text-lg font-bold text-white">
                  ${mockInvestmentsData.totalInvested.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Active Investments</p>
                <p className="text-lg font-bold text-white">
                  {mockInvestmentsData.activeInvestments}
                </p>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
              <Sprout className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Funded Lots</p>
                <p className="text-lg font-bold text-white">
                  {mockInvestmentsData.fundedLots} of{" "}
                  {mockInvestmentsData.totalLots}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-[#a37241]/50 text-[#a37241] hover:bg-[#a37241]/10"
            onClick={() => router.push("/dashboard/farmer/investments")}
          >
            View All Investments
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </GlassCard>
      )}

      <GlassCard
        variant="darker"
        className="p-12 text-center border-[#a37241]/20 flex flex-col items-center mt-8"
      >
        <div className="w-20 h-20 bg-[#a37241]/10 rounded-full flex items-center justify-center mb-6">
          <Tractor className="w-10 h-10 text-[#a37241]" />
        </div>

        <h2 className="text-3xl font-bold mb-4">Verification Pending</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          Thank you for registering your farm. Our agronomy team reviews
          applications in batches. Please ensure your land registry documents
          are ready for upload.
        </p>

        <div className="flex gap-4">
          <Button className="bg-[#a37241] hover:bg-[#8f6336] text-white">
            Upload Documents
          </Button>
          <Button
            variant="outline"
            className="border-[#a37241]/50 text-[#a37241] hover:bg-[#a37241]/10"
          >
            Contact Support
          </Button>
        </div>

        <div className="mt-12 w-full pt-8 border-t border-white/5">
          <p className="text-xs uppercase text-gray-500 mb-4 tracking-wider">
            Local Weather Station (Demo)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-black/40 rounded-lg border border-white/5">
              <CloudRain className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs text-gray-400">Humidity</p>
                <p className="text-lg font-bold text-white">62%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-black/40 rounded-lg border border-white/5">
              <Thermometer className="w-5 h-5 text-orange-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs text-gray-400">Temperature</p>
                <p className="text-lg font-bold text-white">24°C</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-black/40 rounded-lg border border-white/5">
              <Droplets className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs text-gray-400">Soil Moisture</p>
                <p className="text-lg font-bold text-white">Optimal</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
