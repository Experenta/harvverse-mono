"use client";

import { useTranslations } from "next-intl";

export function LandingRecognitions() {
  const t = useTranslations("landing");

  const recognitions = [
    t("recognition_1"),
    t("recognition_2"),
    t("recognition_3"),
    t("recognition_4"),
    t("recognition_5"),
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
