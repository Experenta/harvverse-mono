"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { useCurrentUser } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

const schema = z.object({
  fullName: z.string().trim().min(2, "required"),
  country: z.string().trim().min(1, "required"),
  phone: z.string().trim().min(1, "required"),
});

type FormValues = z.input<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const { data: dbUser, isLoading: isLoadingDbUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const t = useTranslations("onboarding");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      country: "Honduras",
      phone: "",
    },
  });

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    form.reset({
      fullName:
        clerkUser.fullName ??
        clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ??
        "",
      country: "Honduras",
      phone: "",
    });
  }, [clerkUser, form, isLoaded]);

  useEffect(() => {
    if (!isLoaded || isLoadingDbUser || !dbUser) return;
    router.replace(
      dbUser.role === "farmer"
        ? ("/dashboard/farmer" as Route)
        : ("/dashboard/player" as Route),
    );
  }, [dbUser, isLoaded, isLoadingDbUser, router]);

  const upsert = useMutation(
    trpc.users.upsert.mutationOptions({
      onSuccess: async () => {
        if (!clerkUser?.id) return;
        await queryClient.invalidateQueries({
          queryKey: trpc.users.me.queryKey(),
        });
        router.push("/dashboard/farmer" as Route);
      },
    }),
  );

  if (!isLoaded || isLoadingDbUser || dbUser) return null;

  async function onSubmit(values: FormValues) {
    if (!clerkUser) {
      toast.error(t("session_error"));
      return;
    }
    try {
      await upsert.mutateAsync({
        email: clerkUser.primaryEmailAddress?.emailAddress,
        displayName: values.fullName,
        country: values.country,
        phone: values.phone,
      });
    } catch {
      toast.error(t("submit_error"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001020] p-4 text-[#EEEEEE]">
      <div className="w-full max-w-md">
        <GlassCard className="border-primary/20 bg-white/[0.03] p-8">
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <Sprout className="size-7 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-center font-trenda text-2xl font-bold text-white">
            {t("title")}
          </h1>

          <form
            onSubmit={form.handleSubmit(onSubmit, () => {
              toast.error(t("required_error"));
            })}
            className="mt-8 space-y-5"
          >
            <div>
              <label className="mb-1 block text-sm text-white/70">
                {t("fullName")}
              </label>
              <input
                {...form.register("fullName")}
                className="harv-input w-full rounded-lg border px-3 py-2"
                autoComplete="name"
              />
              {form.formState.errors.fullName ? (
                <p className="mt-1 text-xs text-red-400">{t("required_error")}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">
                {t("country")}
              </label>
              <input
                {...form.register("country")}
                className="harv-input w-full rounded-lg border px-3 py-2"
                autoComplete="country-name"
              />
              {form.formState.errors.country ? (
                <p className="mt-1 text-xs text-red-400">{t("required_error")}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">
                {t("phone")}
              </label>
              <input
                {...form.register("phone")}
                className="harv-input w-full rounded-lg border px-3 py-2"
                autoComplete="tel"
              />
              {form.formState.errors.phone ? (
                <p className="mt-1 text-xs text-red-400">{t("required_error")}</p>
              ) : null}
            </div>

            {upsert.error ? (
              <p className="text-center text-sm text-red-400">
                {upsert.error.message}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full bg-primary font-bold text-[#001020] hover:bg-primary/90"
              disabled={upsert.isPending}
            >
              {upsert.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t("submit")}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
