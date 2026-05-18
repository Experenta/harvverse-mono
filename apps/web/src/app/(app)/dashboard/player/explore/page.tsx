"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Mountain, Sprout, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";
import { trpc } from "@/utils/trpc";

const selectClasses =
  "w-full bg-black/20 border border-white/10 text-white p-2 rounded";

export default function ExplorePage() {
  const router = useRouter();
  const t = useTranslations("explore");
  const tl = useTranslations("lot");
  const tc = useTranslations("common");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedVariety, setSelectedVariety] = useState("All");

  const { data: lots = [], isLoading, isError } = useQuery(
    trpc.lots.list.queryOptions({ status: "available" }),
  );

  const countries = [tc("all"), ...Array.from(new Set(lots.map((l) => l.country)))];
  const varieties = [
    tc("all"),
    ...Array.from(new Set(lots.map((l) => l.variety).filter(Boolean))),
  ];

  const filteredLots = lots.filter((lot) => {
    if (selectedCountry !== tc("all") && lot.country !== selectedCountry) return false;
    if (selectedVariety !== tc("all") && lot.variety !== selectedVariety) return false;
    return true;
  });

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/player")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_dashboard")}
      </Button>

      <h1 className="text-4xl font-bold mb-8">{t("title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-400 mb-2">{t("country_filter")}</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className={selectClasses}
            style={{ colorScheme: "dark" }}
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            {t("variety_filter")}
          </label>
          <select
            value={selectedVariety}
            onChange={(e) => setSelectedVariety(e.target.value)}
            className={selectClasses}
            style={{ colorScheme: "dark" }}
          >
            {varieties.map((v) => (
              <option key={v ?? "unknown"} value={v ?? ""}>
                {v ?? tc("unknown")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">{t("loading")}</p>
        </GlassCard>
      ) : isError ? (
        <GlassCard className="p-8 border-red-500/20">
          <p className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {t("failed_load")}
          </p>
        </GlassCard>
      ) : filteredLots.length === 0 ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <p className="text-gray-400 text-lg mb-2">{t("no_lots_found")}</p>
          <p className="text-gray-500 text-sm">
            {lots.length === 0 ? t("no_lots_farmers") : t("no_lots_filters")}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => (
            <GlassCard
              key={lot.id}
              className="overflow-hidden border-primary/20 flex flex-col"
            >
              <div className="h-40 overflow-hidden bg-gradient-to-br from-primary/10 to-green-900/20 flex items-center justify-center">
                <Sprout className="w-16 h-16 text-primary/40" />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase text-xs">
                    {lot.status}
                  </Badge>
                  {lot.plans.length > 0 && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                      {t("plan_ready")}
                    </Badge>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-1">
                  {lot.code ?? tl("lot_id", { id: lot.id })}
                </h3>
                <p className="text-gray-300 text-sm mb-1">{lot.farmName}</p>
                <p className="text-gray-400 text-sm mb-3">
                  📍 {lot.region}, {lot.country}
                </p>

                {lot.variety && (
                  <p className="text-gray-400 text-xs mb-2">
                    <Sprout className="w-3 h-3 inline mr-1" />
                    {lot.variety}
                    {lot.process ? ` · ${lot.process}` : ""}
                  </p>
                )}

                {lot.altitudeMasl && (
                  <p className="text-gray-400 text-xs mb-2">
                    <Mountain className="w-3 h-3 inline mr-1" />
                    {lot.altitudeMasl} MASL
                  </p>
                )}

                {lot.areaManzanas && (
                  <p className="text-gray-400 text-xs mb-4">
                    {lot.areaManzanas} manzanas
                  </p>
                )}

                <div className="mt-auto">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] text-sm"
                    onClick={() =>
                      router.push(
                        `/lots/${lot.id}` as Route,
                      )
                    }
                  >
                    {tl("view_lot")}
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
