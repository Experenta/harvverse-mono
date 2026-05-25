"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@harvverse-monorepo/ui/components/button";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Award, Globe, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("landing");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Section 1: Mission */}
      <section className="bg-[#0F1A24] pt-24 md:pt-32 pb-16 md:pb-24 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] md:text-[11px] font-bold tracking-[3px] text-primary uppercase mb-4 md:mb-6"
          >
            {t("about_eyebrow")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-7xl font-bold text-white leading-tight mb-6 md:mb-8"
          >
            {t("about_headline_1")}<br />
            <span className="text-white/80">{t("about_headline_2")}</span><br />
            <span className="text-white/60">{t("about_headline_3")}</span><br />
            <span className="text-primary">{t("about_headline_4")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-2xl text-white/70 max-w-3xl mb-8 md:mb-10 leading-relaxed"
          >
            {t("about_body")}
          </motion.p>
        </div>
      </section>

      {/* Section 2: Proof - Late Harvest */}
      <section className="bg-[#F4F7F0] py-16 md:py-32 text-[#0F1A24]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 md:mb-20 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold tracking-[3px] text-primary uppercase mb-4 md:mb-6">
                {t("proven_eyebrow")}
              </p>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
                {t("proven_headline")}
              </h2>
            </div>
            <div className="space-y-1 text-center md:text-right">
              <p className="text-base md:text-lg font-bold">{t("proven_subtitle")}</p>
              <p className="text-sm md:text-base text-[#0F1A24]/60">{t("proven_partner")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 mb-12 md:mb-20">
            {[
              { val: t("proven_stat1_val"), label: t("proven_stat1_label") },
              { val: t("proven_stat2_val"), label: t("proven_stat2_label") },
              { val: t("proven_stat3_val"), label: t("proven_stat3_label") },
              { val: t("proven_stat4_val"), label: t("proven_stat4_label") },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0F1A24] p-6 md:p-8 rounded-3xl text-white flex flex-col justify-center"
              >
                <span className="text-2xl md:text-4xl font-bold text-primary mb-2">{stat.val}</span>
                <span className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-wider">{stat.label}</span>
              </motion.div>
            ))}
          </div>

          <p className="text-xl md:text-3xl font-bold text-center italic max-w-4xl mx-auto">
            {t("proven_bridge")}
          </p>
        </div>
      </section>

      {/* Section 3: Technology */}
      <section className="bg-[#0F1A24] py-16 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 md:mb-20 text-center">
             <p className="text-[10px] md:text-[11px] font-bold tracking-[3px] text-primary uppercase mb-4 md:mb-6">
              {t("tech_eyebrow")}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {t("tech_headline")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
             {[
               { icon: Award, title: t("tech_pillar1_title"), desc: t("tech_pillar1_desc") },
               { icon: Globe, title: t("tech_pillar2_title"), desc: t("tech_pillar2_desc") },
               { icon: ShieldCheck, title: t("tech_pillar3_title"), desc: t("tech_pillar3_desc") },
             ].map((pillar, i) => (
               <motion.div
                 key={pillar.title}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: i * 0.1 }}
                 className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl group hover:border-primary/50 transition-colors"
               >
                 <pillar.icon className="size-10 md:size-12 text-primary mb-6 md:mb-8 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">{pillar.title}</h3>
                 <p className="text-sm md:text-base text-white/60 leading-relaxed">{pillar.desc}</p>
               </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* Section 4: Recognition */}
      <section className="bg-[#1E3A2F] py-16 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-6 text-center">
           <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-10 md:mb-16">
              {t("about_recognition_title")}
           </h2>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                { title: t("about_rec_1_title"), desc: t("about_rec_1_desc") },
                { title: t("about_rec_2_title"), desc: t("about_rec_2_desc") },
                { title: t("about_rec_3_title"), desc: t("about_rec_3_desc") },
                { title: t("about_rec_4_title"), desc: t("about_rec_4_desc") },
                { title: t("about_rec_5_title"), desc: t("about_rec_5_desc") },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="bg-[#0F1A24]/40 p-5 md:p-6 rounded-2xl border border-white/5 text-left"
                >
                  <p className="text-white font-bold mb-1 md:mb-2 text-sm md:text-base">{item.title}</p>
                  <p className="text-white/50 text-xs md:text-sm">{item.desc}</p>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* Section 5: CTA Final */}
      <section className="bg-[#0F1A24] py-16 md:py-32">
        <div className="mx-auto max-w-4xl px-4 md:px-6 text-center">
           <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8 md:mb-12">
              {t("about_cta_headline")}
           </h2>
           
           <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
             <Button
                asChild
                size="lg"
                className="bg-primary text-[#0F1A24] font-black h-14 md:h-16 px-8 md:px-10 rounded-xl shadow-xl shadow-primary/20 text-base md:text-lg w-full sm:w-auto"
              >
                <Link href={"/sign-up" as Route}>{t("hero_cta_farmer")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-white font-bold h-14 md:h-16 px-8 md:px-10 rounded-xl bg-white/5 backdrop-blur hover:bg-white/10 text-base md:text-lg w-full sm:w-auto"
              >
                <Link href="/waiting-list">{t("hero_cta_partner")}</Link>
              </Button>
           </div>
        </div>
      </section>
    </div>
  );
}
