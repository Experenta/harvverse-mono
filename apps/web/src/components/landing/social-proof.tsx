"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function LandingSocialProof() {
  const t = useTranslations("landing");

  const stats = [
    { value: t("social_proof_col1_val"), label: t("social_proof_col1_label") },
    { value: t("social_proof_col2_val"), label: t("social_proof_col2_label") },
    { value: t("social_proof_col3_val"), label: t("social_proof_col3_label") },
    { value: t("social_proof_col4_val"), label: t("social_proof_col4_label") },
  ];

  return (
    <section className="bg-[#1E3A2F] border-y border-primary/20">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary/30">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="px-6 py-10 md:py-12 text-center md:text-left flex flex-col justify-center"
            >
              <span className="text-3xl md:text-4xl font-bold text-primary mb-2 block">
                {stat.value}
              </span>
              <span className="text-[12px] md:text-sm text-[#C8E6B0] font-medium leading-tight">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
