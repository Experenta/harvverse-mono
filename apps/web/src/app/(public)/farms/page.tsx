"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, MapPin, Mountain, Sprout } from "lucide-react";

import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { trpc } from "@/utils/trpc";

function scoreBadge(score: number) {
  if (score >= 80) return "border-green-500/30 bg-green-500/15 text-green-300";
  if (score >= 60) return "border-[#67B9C1]/35 bg-[#67B9C1]/15 text-[#67B9C1]";
  if (score >= 40) return "border-yellow-500/35 bg-yellow-500/15 text-yellow-300";
  return "border-red-500/35 bg-red-500/15 text-red-300";
}

export default function PublicFarmsPage() {
  const t = useTranslations("farm");
  const { data: farms, isLoading } = useQuery(
    trpc.farms.listPublic.queryOptions(),
  );

  return (
    <main className="min-h-screen bg-[#001020] px-4 py-8 text-[#EEEEEE]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center text-sm text-white/60 hover:text-white">
              <ArrowLeft className="mr-2 size-4" />
              Harvverse
            </Link>
            <h1 className="font-trenda text-3xl font-bold text-white md:text-5xl">
              {t("open_farms_title")}
            </h1>
          </div>
          <Link
            href={"/waiting-list" as Route}
            className="inline-flex h-9 items-center justify-center rounded-none bg-primary px-3 text-xs font-bold text-[#001020] hover:bg-primary/90"
          >
            {t("invest_button")}
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(farms ?? []).map((farm) => (
              <Link key={farm.id} href={`/farms/${farm.id}` as Route}>
                <GlassCard className="group h-full overflow-hidden border-primary/20 bg-white/[0.03] transition hover:border-primary/50">
                  <div className="relative h-32 bg-gradient-to-br from-primary/20 via-[#67B9C1]/10 to-transparent">
                    {farm.primaryImageData && farm.primaryImageMimeType ? (
                      <img
                        src={`data:${farm.primaryImageMimeType};base64,${farm.primaryImageData}`}
                        alt={farm.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#001020] to-transparent" />
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                      <Badge className={`rounded-full border px-2 py-0 text-[10px] font-bold ${scoreBadge(farm.riskScore ?? 0)}`}>
                        ● {farm.riskScore}
                      </Badge>
                      <Badge
                        className={
                          farm.eudrCompliant === true
                            ? "rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0 text-[10px] font-bold text-green-300"
                            : farm.eudrCompliant === false
                              ? "rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0 text-[10px] font-bold text-red-300"
                              : "rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0 text-[10px] font-bold text-yellow-300"
                        }
                      >
                        {farm.eudrCompliant === true
                          ? "EUDR ✓"
                          : farm.eudrCompliant === false
                            ? "EUDR ✗"
                            : t("eudr_pending_badge")}
                      </Badge>
                    </div>
                    <Sprout className="absolute bottom-3 left-3 size-8 text-primary" />
                  </div>
                  <div className="p-4">
                    <h2 className="truncate font-trenda text-lg font-bold text-white group-hover:text-primary">
                      {farm.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
                      <MapPin className="size-3.5 text-primary/70" />
                      {farm.region}, {farm.country}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {(farm.varieties ?? []).slice(0, 3).map((variety) => (
                        <span key={variety} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                          {variety}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
                      {farm.altitudeMasl ? (
                        <span className="inline-flex items-center gap-1">
                          <Mountain className="size-3.5" />
                          {farm.altitudeMasl}m
                        </span>
                      ) : null}
                      {farm.areaManzanas ? (
                        <span>{Number(farm.areaManzanas).toFixed(1)} mz</span>
                      ) : null}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
