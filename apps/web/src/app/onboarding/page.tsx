"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { trpc } from "@/utils/trpc";

const schema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  country: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

type Role = "partner" | "farmer";

export default function OnboardingPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: clerkUser?.fullName ?? "",
      phone: "",
      country: "",
    },
  });

  const upsert = useMutation(
    trpc.users.upsert.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.users.me.queryKey({ clerkId: clerkUser!.id }),
        });
        router.push(
          selectedRole === "farmer" ? "/dashboard/farmer" : "/dashboard/player",
        );
      },
    }),
  );

  if (!isLoaded) return null;

  async function onSubmit(values: FormValues) {
    if (!selectedRole || !clerkUser) return;
    await upsert.mutateAsync({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      displayName: values.displayName,
      role: selectedRole,
      phone: values.phone || undefined,
      country: values.country || undefined,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080E04]">
      <div className="w-full max-w-lg">
        <GlassCard className="p-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Harvverse" className="h-14 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Complete your profile
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Tell us how you'll use Harvverse
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("partner")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRole === "partner"
                    ? "border-[#a37241] bg-[#a37241]/10"
                    : "border-white/10 hover:border-white/30 bg-white/5"
                }`}
              >
                <div className="text-2xl mb-2">💎</div>
                <p className="font-bold text-white">Partner</p>
                <p className="text-xs text-gray-400 mt-1">
                  Invest in coffee lots
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("farmer")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRole === "farmer"
                    ? "border-[#a37241] bg-[#a37241]/10"
                    : "border-white/10 hover:border-white/30 bg-white/5"
                }`}
              >
                <div className="text-2xl mb-2">🌿</div>
                <p className="font-bold text-white">Farmer</p>
                <p className="text-xs text-gray-400 mt-1">
                  List your coffee lots
                </p>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Display name
                </label>
                <input
                  {...form.register("displayName")}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#a37241]"
                  placeholder="Your name"
                />
                {form.formState.errors.displayName && (
                  <p className="text-red-400 text-xs mt-1">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Phone (optional)
                  </label>
                  <input
                    {...form.register("phone")}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#a37241]"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Country (optional)
                  </label>
                  <input
                    {...form.register("country")}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#a37241]"
                    placeholder="Colombia"
                  />
                </div>
              </div>
            </div>

            {upsert.error && (
              <p className="text-red-400 text-sm text-center">
                {upsert.error.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#a37241] hover:bg-[#8f6336] text-white font-bold h-11"
              disabled={!selectedRole || upsert.isPending}
            >
              {upsert.isPending ? "Saving…" : "Enter Harvverse →"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
