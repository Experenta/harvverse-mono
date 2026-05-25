"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harvverse-monorepo/ui/components/select";
import { trpc } from "@/utils/trpc";
import { motion } from "framer-motion";

const investmentRanges = [
  "$1,595 – $3,000",
  "$3,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000 – $50,000",
  "$50,000+",
] as const;

const schema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  country: z.string().trim().min(1),
  investmentRange: z.enum(investmentRanges),
  howHeard: z.string().trim().optional(),
  telegram: z.string().trim().optional(),
  xAccount: z.string().trim().optional(),
  socials: z.string().trim().optional(),
});

type WaitlistValues = z.input<typeof schema>;

export default function WaitingListPage() {
  const t = useTranslations("landing");
  const tw = useTranslations("waitlist");
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<WaitlistValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      country: "Honduras",
      investmentRange: "$1,595 – $3,000",
      howHeard: "",
      telegram: "",
      xAccount: "",
      socials: "",
    },
  });

  const submit = useMutation(
    trpc.waitlist.submit.mutationOptions({
      onSuccess: () => setSubmitted(true),
    }),
  );

  const { data: farms } = useQuery(
    trpc.farms.listPublic.queryOptions(),
  );

  const producersToShow = farms?.slice(0, 6) ?? [];

  const harvestStats = [
    { val: t("waitlist_stat1_val"), label: t("waitlist_stat1_label") },
    { val: t("waitlist_stat2_val"), label: t("waitlist_stat2_label") },
    { val: t("waitlist_stat3_val"), label: t("waitlist_stat3_label") },
  ];

  const steps = [
    t("waitlist_step1"),
    t("waitlist_step2"),
    t("waitlist_step3"),
    t("waitlist_step4"),
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#001020] px-4 py-32 text-[#EEEEEE]">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="font-trenda text-3xl md:text-5xl font-bold text-white leading-tight mb-8">
            {t("waitlist_headline")}
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {harvestStats.map((stat, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
              >
                <p className="text-2xl font-black text-primary mb-1">{stat.val}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="text-[#C8E6B0] font-bold text-sm md:text-base mb-4">
            {t("waitlist_trust_line")}
          </p>
          
          <p className="text-white/70 text-lg">
            {t("waitlist_subheadline")}
          </p>
        </div>

        <GlassCard className="border-primary/20 bg-white/[0.03] p-8 md:p-12 mb-16 shadow-2xl">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-5 size-14 text-primary" />
              <h1 className="font-trenda text-3xl font-bold text-white">
                {tw("success_title")}
              </h1>
              <p className="mt-3 text-white/70">{tw("success_body")}</p>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => submit.mutate(values))}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("fullName")} *</label>
                  <input {...form.register("fullName")} className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("fullName_placeholder")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("email")} *</label>
                  <input {...form.register("email")} type="email" className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("email_placeholder")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("country")} *</label>
                  <input {...form.register("country")} className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("country_placeholder")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("investmentRange")} *</label>
                  <Controller
                    name="investmentRange"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="harv-input w-full rounded-lg border px-3 h-[42px]">
                          <SelectValue placeholder={tw("select_option")} />
                        </SelectTrigger>
                        <SelectContent>
                          {investmentRanges.map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("telegram")}</label>
                  <input {...form.register("telegram")} className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("telegram_placeholder")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{tw("xAccount")}</label>
                  <input {...form.register("xAccount")} className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("xAccount_placeholder")} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">{tw("socials")}</label>
                <input {...form.register("socials")} className="harv-input w-full rounded-lg border px-3 py-2" placeholder={tw("socials_placeholder")} />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">{tw("howHeard")}</label>
                <Controller
                  name="howHeard"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="harv-input w-full rounded-xl border px-4 py-3 h-[50px] text-base">
                        <SelectValue placeholder={tw("select_option")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Prototypes for Humanity">{tw("opt_prototypes")}</SelectItem>
                        <SelectItem value="Bloomberg">{tw("opt_bloomberg")}</SelectItem>
                        <SelectItem value="Social media">{tw("opt_social")}</SelectItem>
                        <SelectItem value="Referral">{tw("opt_referral")}</SelectItem>
                        <SelectItem value="Other">{tw("opt_other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {submit.error ? (
                <p className="text-sm text-red-400">{submit.error.message}</p>
              ) : null}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="h-14 w-full bg-primary font-black text-[#001020] text-lg rounded-xl hover:bg-primary/90"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {tw("submit")}
                </Button>
                <p className="mt-4 text-center text-[11px] text-[#8A9BAC] font-medium leading-relaxed max-w-sm mx-auto">
                  {t("waitlist_microcopy")}
                </p>
              </div>
            </form>
          )}
        </GlassCard>

        {/* Post-form Sections */}
        <div className="space-y-20">
          {/* How It Works Mini */}
          <div className="text-center">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-8">{t("waitlist_how_title")}</h4>
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-4 md:gap-8">
                  <span className="text-white font-bold text-sm md:text-base">{step}</span>
                  {i < steps.length - 1 && (
                    <div className="w-4 h-px bg-white/20" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Real Farms */}
          {producersToShow.length > 0 && (
            <div className="text-center">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-8">{t("waitlist_real_farms_title")}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {producersToShow.map((farm, i) => (
                  <div key={i} className="text-left bg-white/5 border border-white/5 p-4 rounded-xl">
                    <p className="text-white font-bold text-sm mb-1">{farm.name}</p>
                    <p className="text-white/40 text-xs">{(farm as any).region}, {(farm as any).country}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] text-white/30 leading-relaxed text-center italic">
              {t("waitlist_disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
