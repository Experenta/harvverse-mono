"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertCircle, MapPin, Plus, Sprout } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

export default function FarmerDashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();

  const {
    data: farms,
    isLoading: farmsLoading,
    isError: farmsError,
  } = useQuery(
    trpc.farms.list.queryOptions(
      { farmerId: user?.id },
      { enabled: !!user },
    ),
  );

  const isLoading = userLoading || farmsLoading;

  if (isLoading) {
    return (
      <div>
        <header className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

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
        <Button
          className="bg-[#a37241] hover:bg-[#8f6336] text-white"
          onClick={() => router.push("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Farm
        </Button>
      </header>

      {farmsError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Failed to load your farms. Please refresh and try again.
          </p>
        </GlassCard>
      ) : !farms || farms.length === 0 ? (
        <GlassCard className="p-12 text-center border-[#a37241]/20 flex flex-col items-center">
          <div className="w-20 h-20 bg-[#a37241]/10 rounded-full flex items-center justify-center mb-6">
            <Sprout className="w-10 h-10 text-[#a37241]" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Farms Yet</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            Register your first farm to start offering investment opportunities
            to partners.
          </p>
          <Button
            className="bg-[#a37241] hover:bg-[#8f6336] text-white"
            onClick={() => router.push("/dashboard/farmer/create-farm")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Your First Farm
          </Button>
        </GlassCard>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">My Farms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {farms.map((farm) => (
              <GlassCard
                key={farm.id}
                className="p-6 border-[#a37241]/20 cursor-pointer hover:border-[#a37241]/40 transition-colors"
                onClick={() =>
                  router.push(`/dashboard/farmer/farms/${farm.id}`)
                }
              >
                <h3 className="text-lg font-bold mb-2">{farm.name}</h3>
                <p className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <MapPin className="w-4 h-4" />
                  {farm.region}, {farm.country}
                </p>
                <Button
                  size="sm"
                  className="bg-[#a37241] hover:bg-[#8f6336] text-white"
                >
                  Manage Farm
                </Button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
