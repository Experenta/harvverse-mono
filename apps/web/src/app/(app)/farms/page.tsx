"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Award, MapPin, Mountain } from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { trpc } from "@/utils/trpc";

export default function FarmsPage() {
  const router = useRouter();
  const { data: farms, isLoading } = useQuery(trpc.farms.list.queryOptions());

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Farms</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <GlassCard key={idx} className="p-6 border-primary/20">
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-9 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : !farms || farms.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">No farms registered yet.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <GlassCard
              key={farm.id}
              className="overflow-hidden border-primary/20 cursor-pointer"
              onClick={() => router.push(`/farms/${farm.id}`)}
            >
              <div className="h-40 overflow-hidden">
                <img
                  src={farm.photoUrls?.[0] ?? "/logo-square.png"}
                  alt={farm.name}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-3">{farm.name}</h3>
                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {farm.region}, {farm.country}
                  </p>
                  {farm.altitudeMasl ? (
                    <p className="flex items-center gap-2">
                      <Mountain className="w-4 h-4" />
                      {farm.altitudeMasl} MASL
                    </p>
                  ) : null}
                  {farm.coeScore ? (
                    <p className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      CoE {farm.coeScore}
                    </p>
                  ) : null}
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/farms/${farm.id}`);
                  }}
                >
                  View Farm
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
