"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

export default function WaitingListPage() {
  const t = useTranslations("waitlist");
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
    <main className="flex min-h-screen items-center justify-center bg-[#001020] px-4 py-10 text-[#EEEEEE]">
      <div className="w-full max-w-lg">
        <GlassCard className="border-primary/20 bg-white/[0.03] p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-5 size-14 text-primary" />
              <h1 className="font-trenda text-3xl font-bold text-white">
                {t("success_title")}
              </h1>
              <p className="mt-3 text-white/70">{t("success_body")}</p>
            </div>
          ) : (
            <>
              <h1 className="font-trenda text-3xl font-bold text-white">
                {t("title")}
              </h1>
              <p className="mt-2 text-white/70">{t("subtitle")}</p>

              <form
                className="mt-8 space-y-5"
                onSubmit={form.handleSubmit((values) => submit.mutate(values))}
              >
                <div>
                  <label className="mb-1 block text-sm text-white/70">{t("fullName")}</label>
                  <input {...form.register("fullName")} className="harv-input w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{t("email")}</label>
                  <input {...form.register("email")} type="email" className="harv-input w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{t("country")}</label>
                  <input {...form.register("country")} className="harv-input w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">{t("investmentRange")}</label>
                  <Controller
                    name="investmentRange"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="harv-input w-full rounded-lg border px-3 h-[42px]">
                          <SelectValue placeholder="Select an option" />
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
                <div>
                  <label className="mb-1 block text-sm text-white/70">{t("howHeard")}</label>
                  <input {...form.register("howHeard")} className="harv-input w-full rounded-lg border px-3 py-2" />
                </div>

                {submit.error ? (
                  <p className="text-sm text-red-400">{submit.error.message}</p>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full bg-primary font-bold text-[#001020] hover:bg-primary/90"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {t("submit")}
                </Button>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    </main>
  );
}
