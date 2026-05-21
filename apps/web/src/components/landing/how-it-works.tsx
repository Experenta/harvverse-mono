"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, Satellite, Globe, ArrowRight } from "lucide-react";
import { Button } from "@harvverse-monorepo/ui/components/button";
import Link from "next/link";
import type { Route } from "next";

export function LandingHowItWorks() {
  const t = useTranslations("landing");

  const steps = [
    {
      icon: MapPin,
      title: t("how_step1_title"),
      desc: t("how_step1_desc"),
    },
    {
      icon: Satellite,
      title: t("how_step2_title"),
      desc: t("how_step2_desc"),
    },
    {
      icon: Globe,
      title: t("how_step3_title"),
      desc: t("how_step3_desc"),
    },
  ];

  return (
    <section className="bg-[#F4F7F0] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-16 text-center">
          <p className="text-[11px] font-bold tracking-[3px] text-primary uppercase mb-4">
            {t("how_eyebrow")}
          </p>
          <h2 className="text-3xl md:text-5xl font-black text-[#0F1A24] leading-tight max-w-2xl mx-auto">
            {t("how_headline")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="size-16 md:size-20 bg-[#0F1A24]/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary/20 transition-colors">
                <step.icon className="size-8 md:size-10 text-primary" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#0F1A24] mb-4">
                {step.title}
              </h3>
              <p className="text-[#0F1A24]/70 leading-relaxed text-sm md:text-base max-w-xs">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary text-[#0F1A24] font-black h-14 px-10 rounded-xl shadow-xl shadow-primary/10 hover:scale-105 transition-transform"
          >
            <Link href={"/sign-up" as Route}>
              {t("hero_cta_farmer")}
              <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
