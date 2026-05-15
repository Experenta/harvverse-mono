"use client";

import { useEffect } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Sprout, ArrowLeft, Loader2 } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Input } from "@harvverse-monorepo/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";

import { queryClient, trpc } from "@/utils/trpc";

const registerSchema = z.object({
  displayName: z.string().min(2, "Name required"),
  phone: z.string().optional(),
  country: z.string().optional(),
});

type RegisterInput = z.input<typeof registerSchema>;
type RegisterValues = z.output<typeof registerSchema>;

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-primary/20";

export default function RegisterPlayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wallet = searchParams.get("wallet") ?? "";

  useEffect(() => {
    if (!wallet) router.replace("/login" as Route);
  }, [wallet, router]);

  const upsertUser = useMutation(trpc.users.upsert.mutationOptions());

  const form = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", phone: "", country: "" },
  });

  async function onSubmit(values: RegisterValues) {
    const user = await upsertUser.mutateAsync({
      walletAddress: wallet,
      role: "partner",
      displayName: values.displayName,
      phone: values.phone || undefined,
      country: values.country || undefined,
    });
    await queryClient.invalidateQueries({
      queryKey: trpc.users.me.queryKey({ walletAddress: wallet }),
    });
    router.replace(
      (user.role === "farmer" ? "/dashboard/farmer" : "/dashboard/player") as Route,
    );
  }

  const isPending = upsertUser.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div className="max-w-md w-full">
        <Link href="/login">
          <Button
            variant="ghost"
            className="mb-6 text-white/70 hover:text-white pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 border-primary/20">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Complete Your Partner Profile
              </h1>
              <div className="h-1 w-20 bg-primary mt-4 rounded-full" />
              {wallet && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  {wallet.slice(0, 10)}…{wallet.slice(-8)}
                </p>
              )}
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        Phone Number (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        Country (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., United States"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-primary to-[#82c926] text-[#0a0e27] font-bold h-11 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 rounded-xl"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up account…
                    </>
                  ) : (
                    "Create Account →"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <span className="text-gray-500 text-sm">
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="text-primary hover:underline text-sm"
              >
                Log in
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
