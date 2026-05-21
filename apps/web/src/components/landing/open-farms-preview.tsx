"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@harvverse-monorepo/ui/components/button";
import Link from "next/link";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { FarmCard } from "@/components/farm-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { ArrowRight } from "lucide-react";

export function LandingOpenFarmsPreview() {
  const t = useTranslations("landing");

  const { data: farms, isLoading } = useQuery(
    trpc.farms.listPublic.queryOptions(),
  );

  const farmsToShow = farms?.slice(0, 3) ?? [];

  return (
    <section className="bg-[#001020] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-16 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              {t("open_farms_headline")}
            </h2>
            <p className="text-white/60 text-lg max-w-xl">
              Real-time directory of verified producers. Browse by region, variety, or compliance score.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-white font-bold h-12 px-6 rounded-full hover:bg-white hover:text-[#001020] transition-all hidden md:flex"
          >
            <Link href="/farms">
              {t("open_farms_cta")}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Skeleton className="h-96 w-full rounded-3xl bg-white/5" />
            <Skeleton className="h-96 w-full rounded-3xl bg-white/5" />
            <Skeleton className="h-96 w-full rounded-3xl bg-white/5" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {farmsToShow.map((farm) => (
              <FarmCard key={farm.id} farm={farm as any} />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-4">
          <Button
            asChild
            className="w-full md:w-auto px-10 bg-primary text-[#001020] font-bold h-14 rounded-xl hover:bg-primary/90 transition-all"
          >
            <Link href="/farms" className="flex items-center gap-2">
              {t("open_farms_cta")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
