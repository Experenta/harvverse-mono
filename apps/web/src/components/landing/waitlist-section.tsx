"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { trpc } from "@/utils/trpc";

const investmentRanges = [
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
});

type WaitlistValues = z.input<typeof schema>;

export function LandingWaitlistSection() {
  const t = useTranslations("landing");
  const tw = useTranslations("waitlist");
  const [submitted, setSubmitted] = useState(false);
  
  const form = useForm<WaitlistValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      country: "Honduras",
      investmentRange: "$3,000 – $5,000",
      howHeard: "",
    },
  });

  const submit = useMutation(
    trpc.waitlist.submit.mutationOptions({
      onSuccess: () => setSubmitted(true),
    }),
  );

  return (
    <section className="bg-[#1E3A2F] py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
            {t("waitlist_headline")}
          </h2>
        </div>

        <div className="bg-[#0F1A24]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <CheckCircle2 className="mx-auto mb-6 size-20 text-primary" />
              <h3 className="text-3xl font-bold text-white mb-4">
                {tw("success_title")}
              </h3>
              <p className="text-xl text-white/70">{tw("success_body")}</p>
            </motion.div>
          ) : (
            <form
              onSubmit={form.handleSubmit((values) => submit.mutate(values))}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                    {tw("fullName")} *
                  </label>
                  <input
                    {...form.register("fullName")}
                    className="harv-input w-full rounded-xl border px-4 py-3 text-base"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                    {tw("email")} *
                  </label>
                  <input
                    {...form.register("email")}
                    type="email"
                    className="harv-input w-full rounded-xl border px-4 py-3 text-base"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                    {tw("country")} *
                  </label>
                  <input
                    {...form.register("country")}
                    className="harv-input w-full rounded-xl border px-4 py-3 text-base"
                    placeholder="Honduras"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                    {tw("investmentRange")} *
                  </label>
                  <select
                    {...form.register("investmentRange")}
                    className="harv-input w-full rounded-xl border px-4 py-3 text-base appearance-none"
                    style={{ colorScheme: "dark" }}
                  >
                    {investmentRanges.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                  {tw("howHeard")} (optional)
                </label>
                <select
                  {...form.register("howHeard")}
                  className="harv-input w-full rounded-xl border px-4 py-3 text-base appearance-none"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Select an option</option>
                  <option value="Prototypes for Humanity">Prototypes for Humanity</option>
                  <option value="Bloomberg">Bloomberg</option>
                  <option value="Social media">Social media</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {submit.error ? (
                <p className="text-sm text-red-400 font-medium">{submit.error.message}</p>
              ) : null}

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 bg-primary font-black text-[#0F1A24] text-lg rounded-xl hover:scale-[1.02] transition-transform"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
                  Join the Waiting List
                </Button>
                <p className="mt-4 text-center text-[11px] text-[#8A9BAC] font-medium leading-relaxed max-w-sm mx-auto">
                  {t("waitlist_microcopy")}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
