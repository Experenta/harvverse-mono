"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Polygon } from "geojson";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle,
  ExternalLink,
  FileUp,
  Loader2,
  MapPinned,
} from "lucide-react";

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
import FarmImageUpload from "@/components/farm-image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harvverse-monorepo/ui/components/select";

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

export default function CreateFarmPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const t = useTranslations("farm");
  const tc = useTranslations("common");
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [altitudeStatus, setAltitudeStatus] = useState<"detected" | "error" | null>(null);
  const [detectedAltitude, setDetectedAltitude] = useState<number | null>(null);
  const [calculatedArea, setCalculatedArea] = useState<{ hectares: number; manzanas: number } | null>(null);
  const [showPolygonGuide, setShowPolygonGuide] = useState(true);
  const [createdFarm, setCreatedFarm] = useState<{ id: number; name: string } | null>(null);
  const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([]);
  const altitudeRequestKeyRef = useRef<string | null>(null);

  function handlePolygonChange(p: Polygon | null) {
    setPolygon(p);
    setAltitudeStatus(null);
    setDetectedAltitude(null);
    form.setValue("altitudeMasl", undefined);
    if (!p) {
      altitudeRequestKeyRef.current = null;
      return;
    }
    const ring = (p.coordinates[0] ?? []).slice(0, -1);
    if (ring.length > 0) {
      const lat = ring.reduce((s: number, c: number[]) => s + (c[1] ?? 0), 0) / ring.length;
      const lng = ring.reduce((s: number, c: number[]) => s + (c[0] ?? 0), 0) / ring.length;
      const requestKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (altitudeRequestKeyRef.current === requestKey) return;
      altitudeRequestKeyRef.current = requestKey;
      detectAltitude.mutate({ lat, lng });
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
        setCreatedFarm({ id: farm.id, name: farm.name });
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
      name: values.name,
      country: values.country,
      region: values.region,
      altitudeMasl: values.altitudeMasl,
      totalArea: values.totalArea != null ? String(values.totalArea) : undefined,
      areaManzanas: calculatedArea?.manzanas != null ? String(calculatedArea.manzanas) : undefined,
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

  function continueToFarmDetail() {
    if (!createdFarm) return;
    router.push(`/dashboard/farmer/farms/${createdFarm.id}` as Route);
  }

  return (
    <div className="px-4 md:px-0 text-[#EEEEEE]">
      <Button
        variant="ghost"
        className="mb-6 text-white/70 px-0 md:px-4"
        onClick={() => router.push("/dashboard/farmer" as Route)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back_to_dashboard")}
      </Button>

      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6 md:p-8 border-primary/20 bg-white/[0.03]">
          <h1 className="font-trenda text-2xl md:text-3xl font-bold text-white mb-2">{t("register_title")}</h1>
          <p className="text-sm md:text-base text-white/70 mb-8">{t("register_subtitle")}</p>
          <div className="mb-8 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs font-bold">
            <div className={`rounded-lg px-3 py-2 text-center ${createdFarm ? "text-white/45" : "bg-primary text-[#001020]"}`}>
              {t("step_info")} {createdFarm ? "○" : "●"}
            </div>
            <div className={`rounded-lg px-3 py-2 text-center ${createdFarm ? "bg-primary text-[#001020]" : "text-white/45"}`}>
              {t("step_photos")} {createdFarm ? "●" : "○"}
            </div>
          </div>

          {createdFarm ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                <h2 className="font-trenda text-xl font-bold text-white">
                  {t("photos_title")}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {t("photos_subtitle")}
                </p>
              </div>
              <FarmImageUpload
                farmId={createdFarm.id}
                onUploadComplete={(ids) =>
                  setUploadedImageIds((current) => [...current, ...ids])
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  className="h-11 bg-primary font-black text-[#001020] hover:bg-primary/90"
                  onClick={continueToFarmDetail}
                >
                  {t("photos_continue")}
                  {uploadedImageIds.length > 0 ? ` (${uploadedImageIds.length})` : ""}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-[#67B9C1]/40 text-[#67B9C1] hover:bg-[#67B9C1]/10"
                  onClick={continueToFarmDetail}
                >
                  {t("photos_skip")}
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  {t("register_title")}
                </p>
              </div>

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

              <div>
                <div className="mb-4 border-b border-white/10 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {t("polygon_label")}
                  </p>
                </div>
                <p className="text-sm text-white/80 mb-1 font-bold">{t("polygon_label")}</p>
                <p className="text-xs text-white/40 mb-3 leading-relaxed">{t("polygon_subtitle")}</p>
                <div className="mb-3 rounded-xl border border-[#67B9C1]/20 bg-[#67B9C1]/[0.06]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => setShowPolygonGuide((value) => !value)}
                    aria-expanded={showPolygonGuide}
                  >
                    <span className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                        <MapPinned className="h-4 w-4 text-primary" />
                      </span>
                      <span>
                        <span className="block font-trenda text-sm font-bold text-white">
                          {t("polygon_guide_title")}
                        </span>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#67B9C1]">
                          {t("polygon_guide_app")}
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${
                        showPolygonGuide ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showPolygonGuide && (
                    <div className="border-t border-white/10 px-4 pb-4 pt-3">
                      <ol className="grid gap-3 text-xs leading-relaxed text-white/60 sm:grid-cols-2">
                        {([
                          "polygon_guide_step1",
                          "polygon_guide_step2",
                          "polygon_guide_step3",
                          "polygon_guide_step4",
                          "polygon_guide_step5",
                          "polygon_guide_step6",
                          "polygon_guide_step7",
                        ] as const).map((key, index) => (
                          <li key={key} className="flex gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-black text-primary">
                              {index + 1}
                            </span>
                            <span>{t(key)}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <a
                          href="https://play.google.com/store/apps/details?id=com.google.earth"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#67B9C1]/30 bg-[#67B9C1]/5 px-3 text-xs font-bold text-[#67B9C1] transition-all hover:bg-[#67B9C1]/10"
                        >
                          <FileUp className="h-3.5 w-3.5" />
                          {t("polygon_guide_android")}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                        <a
                          href="https://apps.apple.com/us/app/google-earth/id293622097"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                        >
                          <FileUp className="h-3.5 w-3.5" />
                          {t("polygon_guide_ios")}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <PolygonInput
                  value={polygon}
                  onChange={handlePolygonChange}
                  onAreaCalculated={handleAreaCalculated}
                />
              </div>
              {calculatedArea && (
                <p className="text-[10px] font-bold text-green-400/80 bg-green-400/5 px-2 py-1 rounded inline-block">
                  {t("area_calculated", { hectares: calculatedArea.hectares.toFixed(2), manzanas: calculatedArea.manzanas.toFixed(2) })}
                </p>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-4 border-b border-white/10 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {t("measurements_section")}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <p className={`text-[10px] ${altitudeStatus === "detected" ? "text-green-400" : "text-yellow-400"}`}>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="border-b border-white/10 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  {t("varieties")}
                </p>
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
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/35 min-h-[100px] text-sm"
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
                className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/10 transition-all"
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
          )}
        </GlassCard>
      </div>
    </div>
  );
}
