"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { trpc } from "@/utils/trpc";
import { LotCard } from "@/components/lot-card";

const selectClasses =
  "w-full bg-black/20 border border-white/10 text-white p-2 rounded";

export default function ExplorePage() {
  const router = useRouter();
  const t = useTranslations("explore");
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
            <LotCard key={lot.id} lot={lot} variant="partner" />
          ))}
        </div>
      )}
    </div>
  );
}
