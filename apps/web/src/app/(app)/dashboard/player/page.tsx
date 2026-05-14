"use client";

import { Sprout, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { useCurrentUser } from "@/hooks/use-auth";

export default function PlayerDashboardPage() {
  const { data: user } = useCurrentUser();
  const router = useRouter();

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.displayName}!</h1>
          <p className="text-gray-400">
            You are logged in as a{" "}
            <span className="text-primary font-semibold">Phartmer</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-600 border border-white/10" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-6 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Invested</p>
              <p className="text-3xl font-bold text-white mt-2">$0.00</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Active Farms</p>
              <p className="text-3xl font-bold text-white mt-2">0</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-primary" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Projected ROI</p>
              <p className="text-3xl font-bold text-white mt-2">--</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-12 text-center border-primary/20 flex flex-col items-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Sprout className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Ready to Invest?</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          Start investing in verified farms from Latin America. Build a
          diversified portfolio and earn competitive returns.
        </p>
        <Button
          className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold"
          onClick={() => router.push("/dashboard/player/explore")}
        >
          Explore Farms
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </GlassCard>
    </div>
  );
}
