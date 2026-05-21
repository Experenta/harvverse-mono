"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@harvverse-monorepo/ui/components/button";
import Link from "next/link";

export function LandingDigitalPartners() {
  const t = useTranslations("landing");

  const bullets = [
    t("partners_bullet1"),
    t("partners_bullet2"),
    t("partners_bullet3"),
    t("partners_bullet4"),
  ];

  return (
    <section className="bg-[#0F1A24] py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image/Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/10 bg-white/5 p-2">
              <img
                src="/figma/landing-hero-farm.png" // Placeholder for partner dashboard screenshot
                alt="Digital Partner Dashboard"
                className="rounded-xl w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0F1A24]/60 to-transparent pointer-events-none" />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -left-6 size-32 bg-primary/20 blur-3xl rounded-full -z-10" />
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] font-bold tracking-[3px] text-primary uppercase mb-6">
              {t("partners_eyebrow")}
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-8">
              {t("partners_headline")}
            </h2>
            <p className="text-lg text-white/70 mb-10 leading-relaxed">
              {t("partners_body")}
            </p>

            <ul className="space-y-4 mb-12">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <div className="mt-1 size-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="size-3 text-primary" />
                  </div>
                  <span className="text-white/80 font-medium">{bullet}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary font-bold h-14 px-8 rounded-xl bg-primary/5 hover:bg-primary/10"
            >
              <Link href="/waiting-list">
                {t("partners_cta")}
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
