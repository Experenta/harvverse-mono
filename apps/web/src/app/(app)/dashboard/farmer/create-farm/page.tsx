"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Polygon } from "geojson";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Input } from "@harvverse-monorepo/ui/components/input";
import { Textarea } from "@harvverse-monorepo/ui/components/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";

import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";
import PolygonInput from "@/components/polygon-input";

const createFarmSchema = z.object({
  name: z.string().min(2, "Farm name required").max(100, "Max 100 characters"),
  country: z.string().min(1, "Country required"),
  region: z.string().min(2, "Region required"),
  altitudeMasl: z.coerce.number().int().min(0).max(4000, "Max 4000 m").optional(),
  totalArea: z.coerce.number().min(0.1).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  varieties: z.array(z.string()).min(1, "Select at least one variety"),
  certifications: z.array(z.string()).optional(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

type CreateFarmInput = z.input<typeof createFarmSchema>;
type CreateFarmValues = z.output<typeof createFarmSchema>;

const COFFEE_VARIETIES = [
  "Geisha",
  "Bourbon",
  "Catuai",
  "Pacamara",
  "Typica",
  "Caturra",
  "Parainema",
  "Other",
];

const COUNTRIES = [
  "Honduras",
  "Guatemala",
  "Costa Rica",
  "El Salvador",
  "Nicaragua",
  "Panama",
];

const CERTIFICATIONS = [
  "Organic",
  "Fair Trade",
  "Rainforest Alliance",
  "UTZ",
  "Bird Friendly",
  "Cup of Excellence",
];

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600";

export default function CreateFarmPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const t = useTranslations("farm");
  const tc = useTranslations("common");
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [altitudeStatus, setAltitudeStatus] = useState<"detected" | "error" | null>(null);
  const [detectedAltitude, setDetectedAltitude] = useState<number | null>(null);
  const [calculatedArea, setCalculatedArea] = useState<{ hectares: number; manzanas: number } | null>(null);

  function handlePolygonChange(p: Polygon | null) {
    setPolygon(p);
    setAltitudeStatus(null);
    setDetectedAltitude(null);
    form.setValue("altitudeMasl", undefined);
    if (p) {
      const ring = (p.coordinates[0] ?? []).slice(0, -1);
      if (ring.length > 0) {
        const lat = ring.reduce((s: number, c: number[]) => s + (c[1] ?? 0), 0) / ring.length;
        const lng = ring.reduce((s: number, c: number[]) => s + (c[0] ?? 0), 0) / ring.length;
        detectAltitude.mutate({ lat, lng });
      }
    }
  }

  function handleAreaCalculated(area: { hectares: number; manzanas: number } | null) {
    setCalculatedArea(area);
    if (!area) return;
    if (!form.formState.dirtyFields.totalArea) {
      form.setValue("totalArea", area.hectares);
    }
  }

  const detectAltitude = useMutation(
    trpc.lots.detectAltitude.mutationOptions({
      onSuccess: (data) => {
        if (data.altitudeMeters != null) {
          form.setValue("altitudeMasl", data.altitudeMeters);
          setDetectedAltitude(data.altitudeMeters);
          setAltitudeStatus("detected");
        } else {
          setAltitudeStatus("error");
        }
      },
      onError: () => {
        setAltitudeStatus("error");
      },
    }),
  );

  const createFarm = useMutation(
    trpc.farms.create.mutationOptions({
      onSuccess: async (farm) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
        toast.success(t("registered", { name: farm.name }));
        router.push("/dashboard/farmer/my-farms" as Route);
      },
    }),
  );

  const form = useForm<CreateFarmInput, unknown, CreateFarmValues>({
    resolver: zodResolver(createFarmSchema),
    defaultValues: {
      name: "",
      country: "Honduras",
      region: "",
      altitudeMasl: undefined,
      totalArea: undefined,
      latitude: undefined,
      longitude: undefined,
      varieties: [],
      certifications: [],
      description: "",
      photoUrl: "",
    },
  });


  // Auto-fill lat/lng from polygon centroid when fields are untouched
  useEffect(() => {
    if (!polygon) return;
    if (
      form.getValues("latitude") !== undefined ||
      form.getValues("longitude") !== undefined
    ) return;
    const ring = (polygon.coordinates[0] ?? []).slice(0, -1);
    if (ring.length === 0) return;
    const latSum = ring.reduce((s: number, c: number[]) => s + (c[1] ?? 0), 0);
    const lngSum = ring.reduce((s: number, c: number[]) => s + (c[0] ?? 0), 0);
    form.setValue("latitude", parseFloat((latSum / ring.length).toFixed(6)));
    form.setValue("longitude", parseFloat((lngSum / ring.length).toFixed(6)));
  }, [polygon]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: CreateFarmValues) {
    if (!user) {
      toast.error(t("sign_in_required"));
      return;
    }
    createFarm.mutate({
      farmerId: user.id,
      name: values.name,
      country: values.country,
      region: values.region,
      altitudeMasl: values.altitudeMasl,
      totalArea: values.totalArea != null ? String(values.totalArea) : undefined,
      latitude: values.latitude != null ? String(values.latitude) : undefined,
      longitude: values.longitude != null ? String(values.longitude) : undefined,
      varieties: values.varieties,
      certifications: values.certifications ?? [],
      description: values.description || undefined,
      photoUrls: values.photoUrl ? [values.photoUrl] : undefined,
      polygon: polygon ?? undefined,
    });
  }

  const isSubmitting = createFarm.isPending;

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() => router.push("/dashboard/farmer" as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back_to_dashboard")}
      </Button>

      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-8 border-primary/20">
          <h1 className="text-3xl font-bold mb-2">{t("register_title")}</h1>
          <p className="text-gray-400 mb-8">{t("register_subtitle")}</p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Finca La Huerta"
                        className={inputClasses}
                        {...field}
                      />
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
                      <FormLabel className="text-white/80">{t("country")}</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full bg-black/20 border border-white/10 text-white p-2 rounded hover:border-white/20"
                          style={{ colorScheme: "dark" }}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
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
                      <FormLabel className="text-white/80">{t("region")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Cielito Mountain"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <FormField
                    control={form.control}
                    name="altitudeMasl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80 flex items-center gap-2">
                          {t("altitude")}
                          {detectAltitude.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        </FormLabel>
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
                  {altitudeStatus && (
                    <p className={`text-xs ${altitudeStatus === "detected" ? "text-green-400" : "text-yellow-400"}`}>
                      {altitudeStatus === "detected" && detectedAltitude != null
                        ? t("altitude_detected", { value: detectedAltitude })
                        : t("altitude_error")}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="totalArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        {t("total_area")}
                      </FormLabel>
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

              <div>
                <p className="text-sm text-white/80 mb-1">{t("polygon_label")}</p>
                <p className="text-xs text-gray-400 mb-3">{t("polygon_subtitle")}</p>
                <div className="border-l-2 border-[#67B9C1] bg-[#67B9C1]/5 rounded-r-lg px-4 py-3 mb-3">
                  <p className="text-xs font-semibold text-[#67B9C1] mb-2">{t("polygon_guide_title")}</p>
                  <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside">
                    <li>{t("polygon_guide_step1")}</li>
                    <li>{t("polygon_guide_step2")}</li>
                    <li>{t("polygon_guide_step3")}</li>
                    <li>{t("polygon_guide_step4")}</li>
                  </ol>
                </div>
                <PolygonInput
                  value={polygon}
                  onChange={handlePolygonChange}
                  onAreaCalculated={handleAreaCalculated}
                />
              </div>
              {calculatedArea && (
                <p className="text-xs text-green-400">
                  {t("area_calculated", { hectares: calculatedArea.hectares.toFixed(2), manzanas: calculatedArea.manzanas.toFixed(2) })}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("gps_lat")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., 14.4529"
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
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("gps_lng")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., -87.6124"
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
                    <FormLabel className="text-white/80">{t("certifications")}</FormLabel>
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
                    <FormLabel className="text-white/80">{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("description_placeholder")}
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
                    <FormLabel className="text-white/80">{t("photo_url")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("photo_placeholder")}
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
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-bold h-11"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? t("registering") : t("register_btn")}
              </Button>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
