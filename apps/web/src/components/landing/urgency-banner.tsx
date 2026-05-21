"use client";

import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

export function LandingUrgencyBanner() {
  const t = useTranslations("landing");

  return (
    <section className="bg-[#E63946] py-4 overflow-hidden relative group">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center md:text-left">
          <div className="flex items-center gap-2 text-white font-black text-sm md:text-base">
            <Zap className="size-5 fill-white animate-pulse" />
            <span className="uppercase tracking-wider">{t("eudr_urgency_title")}</span>
          </div>
          
          <div className="h-4 w-px bg-white/30 hidden md:block" />
          
          <p className="text-white/90 font-bold text-sm md:text-base">
            {t("eudr_urgency_timer")} · {t("eudr_urgency_stat")} · {t("eudr_urgency_warn")}
          </p>

          <Link 
            href={"/sign-up" as Route}
            className="text-white font-black underline underline-offset-4 hover:text-[#93D832] transition-colors text-sm md:text-base"
          >
            {t("eudr_urgency_cta")}
          </Link>
        </div>
      </div>
      
      {/* Animated Shine Effect */}
      <div className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-[shimmer_3s_infinite]" />
    </section>
  );
}
