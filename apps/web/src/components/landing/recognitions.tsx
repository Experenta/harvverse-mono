"use client";

import { useTranslations } from "next-intl";

export function LandingRecognitions() {
  const t = useTranslations("landing");

  const recognitions = [
    "Fintech Americas 2025 · Gold Award DeFi",
    "Prototypes for Humanity · Dubai · 3,300+ applicants",
    "Endeavor × IICA AgTech Accelerator 2026",
    "Bloomberg Línea · April 2026",
    "AgriTech Innovation Awards · Málaga 2024",
  ];

  return (
    <section className="bg-[#0F1A24] py-12 border-y border-white/5">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <p className="text-center text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-8">
          {t("recognitions_headline")}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-6 md:gap-x-12">
          {recognitions.map((item) => (
            <span
              key={item}
              className="text-[11px] md:text-sm font-medium text-[#8A9BAC] hover:text-white transition-colors cursor-default whitespace-nowrap"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
