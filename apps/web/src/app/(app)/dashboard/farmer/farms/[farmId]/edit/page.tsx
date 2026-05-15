"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Input } from "@harvverse-monorepo/ui/components/input";
import { Textarea } from "@harvverse-monorepo/ui/components/textarea";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";

import { queryClient, trpc } from "@/utils/trpc";

const COFFEE_VARIETIES = [
  "Geisha", "Bourbon", "Catuai", "Pacamara", "Typica", "Caturra", "Parainema", "Other",
];

const COUNTRIES = [
  "Honduras", "Guatemala", "Costa Rica", "El Salvador", "Nicaragua", "Panama",
];

const CERTIFICATIONS = [
  "Organic", "Fair Trade", "Rainforest Alliance", "UTZ", "Bird Friendly", "Cup of Excellence",
];

const editFarmSchema = z.object({
  name: z.string().min(2, "Farm name required"),
  country: z.string().min(1, "Country required"),
  region: z.string().min(2, "Region required"),
  altitudeMasl: z.coerce.number().int().min(0).optional(),
  totalArea: z.coerce.number().min(0.1).optional(),
  varieties: z.array(z.string()).min(1, "Select at least one variety"),
  certifications: z.array(z.string()).optional(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

type EditFarmInput = z.input<typeof editFarmSchema>;
type EditFarmValues = z.output<typeof editFarmSchema>;

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600";

export default function EditFarmPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);

  const { data: farm, isLoading: farmLoading } = useQuery(
    trpc.farms.byId.queryOptions({ id: farmId }, { enabled: farmIdValid }),
  );

  const updateFarm = useMutation(
    trpc.farms.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.byId.queryKey({ id: farmId }),
        });
        toast.success("Farm updated");
        router.push(`/dashboard/farmer/farms/${farmId}` as Route);
      },
    }),
  );

  const form = useForm<EditFarmInput, unknown, EditFarmValues>({
    resolver: zodResolver(editFarmSchema),
    defaultValues: {
      name: "",
      country: "Honduras",
      region: "",
      altitudeMasl: undefined,
      totalArea: undefined,
      varieties: [],
      certifications: [],
      description: "",
      photoUrl: "",
    },
  });

  useEffect(() => {
    if (!farm) return;
    form.reset({
      name: farm.name,
      country: farm.country,
      region: farm.region,
      altitudeMasl: farm.altitudeMasl ?? undefined,
      totalArea: farm.totalArea ? Number(farm.totalArea) : undefined,
      varieties: farm.varieties ?? [],
      certifications: farm.certifications ?? [],
      description: farm.description ?? "",
      photoUrl: farm.photoUrls?.[0] ?? "",
    });
  }, [farm]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: EditFarmValues) {
    updateFarm.mutate({
      id: farmId,
      data: {
        name: values.name,
        country: values.country,
        region: values.region,
        altitudeMasl: values.altitudeMasl,
        totalArea: values.totalArea != null ? String(values.totalArea) : undefined,
        varieties: values.varieties,
        certifications: values.certifications ?? [],
        description: values.description || undefined,
        photoUrls: values.photoUrl ? [values.photoUrl] : [],
      },
    });
  }

  if (farmLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!farm) {
    return (
      <GlassCard className="p-12 text-center border-primary/20">
        <p className="text-gray-400">Farm not found.</p>
      </GlassCard>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push(`/dashboard/farmer/farms/${farmId}` as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-8 border-primary/20">
          <h1 className="text-3xl font-bold mb-2">Edit Farm</h1>
          <p className="text-gray-400 mb-8">{farm.name}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Farm Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Finca La Huerta" className={inputClasses} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Country *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full bg-black/20 border border-white/10 text-white p-2 rounded hover:border-white/20"
                          style={{ colorScheme: "dark" }}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Region *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cielito Mountain" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="altitudeMasl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Altitude (MASL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className={inputClasses}
                          {...field}
                          value={typeof field.value === "number" ? field.value : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Total Area (Manzanas)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className={inputClasses}
                          {...field}
                          value={typeof field.value === "number" ? field.value : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="varieties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Coffee Varieties * (Select at least one)
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {COFFEE_VARIETIES.map((variety) => {
                        const selected = field.value?.includes(variety);
                        return (
                          <button
                            key={variety}
                            type="button"
                            onClick={() => {
                              const current = field.value ?? [];
                              field.onChange(
                                selected
                                  ? current.filter((v) => v !== variety)
                                  : [...current, variety],
                              );
                            }}
                            className={
                              selected
                                ? "p-3 rounded-lg text-sm transition-colors bg-primary/30 border border-primary/50 text-white"
                                : "p-3 rounded-lg text-sm transition-colors bg-black/20 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                            }
                          >
                            {variety}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Certifications</FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {CERTIFICATIONS.map((cert) => {
                        const selected = field.value?.includes(cert);
                        return (
                          <button
                            key={cert}
                            type="button"
                            onClick={() => {
                              const current = field.value ?? [];
                              field.onChange(
                                selected
                                  ? current.filter((c) => c !== cert)
                                  : [...current, cert],
                              );
                            }}
                            className={
                              selected
                                ? "p-3 rounded-lg text-sm transition-colors bg-primary/30 border border-primary/50 text-white"
                                : "p-3 rounded-lg text-sm transition-colors bg-black/20 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                            }
                          >
                            {cert}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your farm..."
                        className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Farm Photo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." className={inputClasses} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateFarm.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-11"
              >
                {updateFarm.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {updateFarm.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
