"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Input } from "@harvverse-monorepo/ui/components/input";
import { Textarea } from "@harvverse-monorepo/ui/components/textarea";
import { Skeleton } from "@harvverse-monorepo/ui/components/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harvverse-monorepo/ui/components/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";

import { queryClient, trpc } from "@/utils/trpc";
import FarmImageUpload from "@/components/farm-image-upload";

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
  name: z.string().min(2, "Farm name required").max(100, "Max 100 characters"),
  country: z.string().min(1, "Country required"),
  region: z.string().min(2, "Region required"),
  altitudeMasl: z.coerce.number().int().min(0).max(4000, "Max 4000 m").optional(),
  totalArea: z.coerce.number().min(0.1).optional(),
  varieties: z.array(z.string()).min(1, "Select at least one variety"),
  certifications: z.array(z.string()).optional(),
  description: z.string().optional(),
});

type EditFarmInput = z.input<typeof editFarmSchema>;
type EditFarmValues = z.output<typeof editFarmSchema>;

const inputClasses =
  "harv-input";

function MultiSelectDropdown({
  value,
  options,
  placeholder,
  accentClassName,
  onChange,
}: {
  value: string[] | undefined;
  options: string[];
  placeholder: string;
  accentClassName: string;
  onChange: (value: string[]) => void;
}) {
  const selected = value ?? [];
  const label = selected.length > 0 ? selected.join(", ") : placeholder;

  return (
    <div className="space-y-2">
      <Select
        value=""
        onValueChange={(option) => {
          if (!option) return;
          onChange(
            selected.includes(option)
              ? selected.filter((item) => item !== option)
              : [...selected, option],
          );
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <SelectItem key={option} value={option}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{option}</span>
                  {isSelected ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${accentClassName}`}>
                      OK
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-bold transition-opacity hover:opacity-80 ${accentClassName}`}
              onClick={() => onChange(selected.filter((value) => value !== item))}
            >
              {item} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function EditFarmPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("farm");
  const tc = useTranslations("common");

  const { data: farm, isLoading: farmLoading } = useQuery(
    trpc.farms.byId.queryOptions({ id: farmId }, { enabled: farmIdValid }),
  );
  const { data: farmImages = [] } = useQuery(
    trpc.farms.getImages.queryOptions({ farmId }, { enabled: farmIdValid }),
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
        toast.success(t("updated"));
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
        <p className="text-gray-400">{t("not_found")}</p>
      </GlassCard>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 px-0 md:px-4"
        onClick={() => router.push(`/dashboard/farmer/farms/${farmId}` as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back")}
      </Button>

      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6 md:p-8 border-primary/20 bg-white/[0.03]">
          <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white mb-1">{t("edit_title")}</h1>
          <p className="text-white/40 text-sm mb-8">{farm.name}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("name")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Finca La Huerta" className={inputClasses} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("country")}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("country")} />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <FormLabel className="text-white/80">{t("region")}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cielito Mountain" className={inputClasses} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="altitudeMasl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("altitude")}</FormLabel>
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
                      <FormLabel className="text-white/80">{t("total_area")}</FormLabel>
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
                    <FormLabel className="text-white/80">{t("varieties")}</FormLabel>
                    <FormControl>
                      <MultiSelectDropdown
                        value={field.value}
                        options={COFFEE_VARIETIES}
                        placeholder={t("select_varieties_placeholder")}
                        accentClassName="bg-primary/20 text-primary"
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("certifications")}</FormLabel>
                    <FormControl>
                      <MultiSelectDropdown
                        value={field.value}
                        options={CERTIFICATIONS}
                        placeholder={t("select_certifications_placeholder")}
                        accentClassName="bg-[#67B9C1]/20 text-[#67B9C1]"
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("description_placeholder")}
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/20 min-h-[100px] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateFarm.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-black uppercase tracking-widest h-12 transition-all shadow-lg shadow-primary/5"
              >
                {updateFarm.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {updateFarm.isPending ? t("saving") : t("save_btn")}
              </Button>
            </form>
          </Form>
        </GlassCard>
        <GlassCard id="images" className="mt-6 p-6 md:p-8 border-primary/20 bg-white/[0.03]">
          <h2 className="font-trenda text-xl font-bold text-white mb-1">
            {t("images_title")}
          </h2>
          <p className="mb-5 text-sm text-white/50">
            {t("images_manage_desc")}
          </p>
          <FarmImageUpload
            farmId={farmId}
            existingImages={farmImages}
            onUploadComplete={() => {
              void queryClient.invalidateQueries({
                queryKey: trpc.farms.getImages.queryKey({ farmId }),
              });
            }}
          />
        </GlassCard>
      </div>
    </div>
  );
}
