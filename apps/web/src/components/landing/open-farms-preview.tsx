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
    <section className="bg-[#F4F7F0] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-16 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0F1A24] leading-tight mb-4">
              {t("open_farms_headline")}
            </h2>
            <p className="text-[#0F1A24]/60 text-lg max-w-xl">
              Real-time directory of verified producers. Browse by region, variety, or compliance score.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-[#0F1A24] text-[#0F1A24] font-bold h-12 px-6 rounded-full hover:bg-[#0F1A24] hover:text-white transition-all hidden md:flex"
          >
            <Link href="/farms">
              {t("open_farms_cta")}
            </Link>
          </Button>
        </div>

        {/* Map Placeholder */}
        <div className="w-full h-64 md:h-[400px] bg-[#0F1A24]/5 rounded-3xl mb-12 border border-[#0F1A24]/10 relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/world-map.png')] bg-center bg-no-repeat bg-contain grayscale" />
           <p className="relative text-[#0F1A24]/30 font-bold uppercase tracking-widest text-sm">Global Verification Map</p>
           {/* Animated dots would go here */}
           <motion.div 
             animate={{ scale: [1, 1.2, 1] }}
             transition={{ duration: 2, repeat: Infinity }}
             className="absolute top-1/2 left-1/3 size-3 bg-primary rounded-full shadow-[0_0_15px_rgba(147,216,50,0.8)]" 
           />
           <motion.div 
             animate={{ scale: [1, 1.2, 1] }}
             transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
             className="absolute top-[45%] left-[38%] size-2 bg-primary rounded-full shadow-[0_0_10px_rgba(147,216,50,0.8)]" 
           />
           <motion.div 
             animate={{ scale: [1, 1.2, 1] }}
             transition={{ duration: 2, delay: 1, repeat: Infinity }}
             className="absolute top-[60%] left-[35%] size-4 bg-primary rounded-full shadow-[0_0_20px_rgba(147,216,50,0.8)]" 
           />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {farmsToShow.map((farm) => (
              <FarmCard key={farm.id} farm={farm as any} />
            ))}
          </div>
        )}

        <div className="flex md:hidden justify-center">
          <Button
            asChild
            className="w-full bg-[#0F1A24] text-white font-bold h-14 rounded-xl"
          >
            <Link href="/farms">
              {t("open_farms_cta")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
