"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, MapPin, Mountain } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";

import { trpc } from "@/utils/trpc";

export default function FarmDetailPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);

  const { data: farm, isLoading } = useQuery(
    trpc.farms.byId.queryOptions(
      { id: farmId },
      { enabled: Number.isFinite(farmId) },
    ),
  );

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/farms" as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Farms
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !farm ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400">Farm not found.</p>
        </GlassCard>
      ) : (
        <>
          <div className="relative h-64 rounded-lg mb-8 overflow-hidden">
            <img
              src={farm.photoUrls?.[0] ?? "/logo-square.png"}
              alt={farm.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <div className="max-w-4xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{farm.name}</h1>
                <div className="flex flex-wrap gap-4 items-center text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {farm.region}, {farm.country}
                  </span>
                  {farm.altitudeMasl ? (
                    <span className="flex items-center gap-1">
                      <Mountain className="w-4 h-4" />
                      {farm.altitudeMasl} MASL
                    </span>
                  ) : null}
                  {farm.coeScore ? (
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      CoE {farm.coeScore}
                    </span>
                  ) : null}
                </div>
              </div>
              {farm.verified ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  ✓ Verified
                </Badge>
              ) : null}
            </div>

            {farm.description ? (
              <GlassCard className="p-6 border-primary/20 mb-8">
                <p className="text-gray-300">{farm.description}</p>
              </GlassCard>
            ) : null}

            <h2 className="text-2xl font-bold mb-4">
              Lots ({farm.lots.length})
            </h2>

            {farm.lots.length === 0 ? (
              <GlassCard className="p-8 text-center border-primary/20">
                <p className="text-gray-400">No lots on this farm yet.</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {farm.lots.map((lot) => (
                  <GlassCard key={lot.id} className="p-6 border-primary/20">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold">{lot.code ?? `Lot #${lot.id}`}</h3>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase">
                        {lot.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-300 mb-4">
                      {lot.variety ? <p>Variety: {lot.variety}</p> : null}
                      {lot.areaManzanas ? (
                        <p>Area: {lot.areaManzanas} manzanas</p>
                      ) : null}
                      {lot.harvestYear ? (
                        <p>Harvest: {lot.harvestYear}</p>
                      ) : null}
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] text-sm"
                      onClick={() => router.push(`/lots/${lot.id}`)}
                    >
                      View Lot
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
