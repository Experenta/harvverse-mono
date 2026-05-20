"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";

export default function SettingsPage() {
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-0">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-white">
          <Settings className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          {tn("settings")}
        </h1>
      </header>
      <GlassCard className="p-8 md:p-12 text-center border-primary/20">
        <p className="text-white/70 text-base md:text-lg">{tc("coming_soon")}</p>
        <p className="text-white/40 text-xs md:text-sm mt-2">
          {tc("settings_placeholder")}
        </p>
      </GlassCard>
    </div>
  );
}
