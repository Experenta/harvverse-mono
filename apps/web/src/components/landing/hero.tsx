"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { motion } from "framer-motion";

export function LandingHero() {
  const t = useTranslations("landing");

  return (
    <section className="relative min-h-[100vh] flex flex-col md:flex-row overflow-hidden pt-16">
      {/* Background Split */}
      <div className="absolute inset-0 z-0 flex flex-col md:flex-row">
        {/* Left 60% - Real Farm Photo */}
        <div className="relative h-1/2 md:h-full md:w-[60%] overflow-hidden">
          <img
            src="/figma/landing-hero-farm.png"
            alt="Coffee Farm"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0F1A24]/70 md:bg-gradient-to-r md:from-[#0F1A24] md:to-transparent" />
        </div>
        
        {/* Right 40% - Platform Screenshot */}
        <div className="relative h-1/2 md:h-full md:w-[40%] overflow-hidden">
          <img
            src="/figma/landing-hero-farm.png" // Replace with actual platform screenshot if available, using farm photo as placeholder
            alt="Harvverse Platform"
            className="h-full w-full object-cover opacity-50 grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-[#0F1A24]/30" />
        </div>

        {/* Vertical Divider */}
        <div className="absolute left-[60%] top-0 bottom-0 hidden w-[2px] bg-primary md:block shadow-[0_0_15px_rgba(147,216,50,0.5)] z-10" />
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto flex max-w-7xl flex-1 items-center px-4 md:px-6">
        <div className="w-full md:max-w-2xl py-12 md:py-24">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[11px] font-bold tracking-[3px] text-primary uppercase mb-6"
          >
            {t("hero_eyebrow")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white leading-tight mb-8"
          >
            {t("hero_headline_1")}<br />
            <span className="text-white/90">{t("hero_headline_2")}</span><br />
            <span className="text-white/80">{t("hero_headline_3")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-[#C8E6B0] max-w-lg mb-10 leading-relaxed"
          >
            {t("hero_subheadline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <Button
              asChild
              size="lg"
              className="bg-primary text-[#0F1A24] font-black text-lg h-14 px-8 rounded-xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              <Link href={"/sign-up" as Route}>{t("hero_cta_farmer")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white text-white font-bold text-lg h-14 px-8 rounded-xl bg-white/5 backdrop-blur hover:bg-white/10"
            >
              <Link href="/waiting-list">{t("hero_cta_partner")}</Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-[11px] text-[#8A9BAC] font-medium"
          >
            {t("hero_microcopy")}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
