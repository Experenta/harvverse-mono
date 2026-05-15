"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Sprout, Plus, ArrowLeft } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";


export default function MyFarmsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: farms, isLoading } = useQuery(
    trpc.farms.list.queryOptions(
      { farmerId: user?.id },
      { enabled: !!user },
    ),
  );

  const farmsToShow = farms ?? [];
  const isLoadingFarms = userLoading || isLoading;

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/farmer")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Farms</h1>
        <Button
          className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
          onClick={() => router.push("/dashboard/farmer/create-farm")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Farm
        </Button>
      </header>

      {isLoadingFarms ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <GlassCard key={idx} className="p-6 border-primary/20">
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-9 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : farmsToShow.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Sprout className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Farms Yet</h2>
          <p className="text-gray-400 mb-8">
            Register your first farm to start offering investment opportunities
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-[#0a0e27]"
            onClick={() => router.push("/dashboard/farmer/create-farm")}
          >
            Register Your First Farm
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {farmsToShow.map((farm) => (
            <GlassCard
              key={farm.id}
              className="p-6 border-primary/20 cursor-pointer"
            >
              <div className="h-40 rounded-lg mb-4 overflow-hidden">
                <img
                  src={farm.photoUrls?.[0] ?? "/logo-square.png"}
                  alt={farm.name}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <h3 className="text-xl font-bold mb-2">{farm.name}</h3>
              <p className="text-gray-400 text-sm mb-4">
                📍 {farm.region}, {farm.country}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    router.push(`/dashboard/farmer/farms/${farm.id}`)
                  }
                >
                  Manage Lots
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary/20 hover:bg-primary/30"
                  onClick={() =>
                    router.push(`/dashboard/farmer/farms/${farm.id}/edit` as Route)
                  }
                >
                  Edit
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
