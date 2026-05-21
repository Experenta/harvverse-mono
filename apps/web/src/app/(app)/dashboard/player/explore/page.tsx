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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harvverse-monorepo/ui/components/select";

const ALL_VALUE = "__all__";

export default function ExplorePage() {
  const router = useRouter();
  const t = useTranslations("explore");
  const tc = useTranslations("common");
  const [selectedCountry, setSelectedCountry] = useState(ALL_VALUE);
  const [selectedVariety, setSelectedVariety] = useState(ALL_VALUE);

  const { data: lots = [], isLoading, isError } = useQuery(
    trpc.lots.list.queryOptions({ status: "available" }),
  );

  const countries = Array.from(new Set(lots.map((l) => l.country)));
  const varieties = [
    ...Array.from(new Set(lots.map((l) => l.variety).filter(Boolean))),
  ];

  const filteredLots = lots.filter((lot) => {
    if (selectedCountry !== ALL_VALUE && lot.country !== selectedCountry) return false;
    const varietyMatch = 
      selectedVariety === ALL_VALUE || 
      lot.variety === selectedVariety || 
      (selectedVariety === "unknown" && !lot.variety);
    if (!varietyMatch) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 hover:bg-white/5 hover:text-white px-0 md:px-4"
        onClick={() => router.push("/dashboard/player")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("back_to_dashboard")}
      </Button>

      <header className="mb-8">
        <h1 className="font-trenda text-3xl md:text-4xl font-bold text-white leading-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-white/60 text-sm md:text-base">{t("subtitle")}</p>
      </header>

      <div className="card-dark mb-8 grid grid-cols-1 gap-6 p-5 md:p-6 md:grid-cols-3 bg-white/[0.03] border border-white/5 rounded-2xl">
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">{t("country_filter")}</label>
          <Select
            value={selectedCountry}
            onValueChange={(value) => setSelectedCountry(value ?? ALL_VALUE)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("country_filter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{tc("all")}</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">
            {t("variety_filter")}
          </label>
          <Select
            value={selectedVariety}
            onValueChange={(value) => setSelectedVariety(value ?? ALL_VALUE)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("variety_filter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{tc("all")}</SelectItem>
              {varieties.map((v) => (
                <SelectItem key={v ?? "unknown"} value={v ?? "unknown"}>
                  {v ?? tc("unknown")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <GlassCard className="p-12 text-center border-primary/20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/60">{t("loading")}</p>
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
          <p className="text-white/60 text-lg mb-2">{t("no_lots_found")}</p>
          <p className="text-white/45 text-sm">
            {lots.length === 0 ? t("no_lots_farmers") : t("no_lots_filters")}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-12">
          {filteredLots.map((lot) => (
            <LotCard key={lot.id} lot={lot} variant="partner" />
          ))}
        </div>
      )}
    </div>
  );
}
