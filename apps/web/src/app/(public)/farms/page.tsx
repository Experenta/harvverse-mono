"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { trpc } from "@/utils/trpc";
import { FarmCard } from "@/components/farm-card";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { Button } from "@harvverse-monorepo/ui/components/button";
import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";

export default function PublicFarmsPage() {
  const t = useTranslations("landing");
  const tf = useTranslations("farm");
  const { data: farms, isLoading } = useQuery(
    trpc.farms.listPublic.queryOptions(),
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#0F1A24] pt-32 pb-20 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-bold tracking-[3px] text-primary uppercase mb-6"
          >
            OPEN FARMS DIRECTORY
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white leading-tight mb-8"
          >
            Every farm. Satellite-verified.<br />
            Publicly accessible. Free.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-white/60 max-w-2xl mb-10 leading-relaxed"
          >
            The global EUDR compliance directory for coffee farmers. Powered by ESA Copernicus satellite data.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-primary text-[#0F1A24] font-black h-14 px-10 rounded-xl shadow-xl shadow-primary/20"
            >
              <Link href={"/sign-up" as Route}>{t("hero_cta_farmer")}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="bg-[#F4F7F0] py-20 flex-1">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          {/* Filters Placeholder */}
          <div className="flex flex-wrap items-center gap-4 mb-12 pb-8 border-b border-[#0F1A24]/10">
             <div className="px-4 py-2 bg-white rounded-lg border border-[#0F1A24]/10 text-sm font-bold text-[#0F1A24]/60 cursor-pointer hover:border-primary transition-colors flex items-center gap-2">
               Country <span className="text-[10px]">▾</span>
             </div>
             <div className="px-4 py-2 bg-white rounded-lg border border-[#0F1A24]/10 text-sm font-bold text-[#0F1A24]/60 cursor-pointer hover:border-primary transition-colors flex items-center gap-2">
               Variety <span className="text-[10px]">▾</span>
             </div>
             <div className="px-4 py-2 bg-white rounded-lg border border-[#0F1A24]/10 text-sm font-bold text-[#0F1A24]/60 cursor-pointer hover:border-primary transition-colors flex items-center gap-2">
               Altitude <span className="text-[10px]">▾</span>
             </div>
             <div className="px-4 py-2 bg-white rounded-lg border border-[#0F1A24]/10 text-sm font-bold text-[#0F1A24]/60 cursor-pointer hover:border-primary transition-colors flex items-center gap-2">
               Score <span className="text-[10px]">▾</span>
             </div>
             <label className="flex items-center gap-2 cursor-pointer ml-auto">
               <input type="checkbox" className="size-4 accent-primary" />
               <span className="text-sm font-bold text-[#0F1A24]/60">Available to invest</span>
             </label>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {farms?.map((farm) => (
                <Link key={farm.id} href={`/farms/${farm.id}`}>
                  <FarmCard farm={farm as any} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
