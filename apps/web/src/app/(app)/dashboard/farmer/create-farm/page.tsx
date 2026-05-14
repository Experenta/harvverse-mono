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
import { ArrowLeft, CheckCircle, Loader2, Satellite } from "lucide-react";

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
import { polygonAreaManzanas } from "@/lib/geo";

const createFarmSchema = z.object({
  name: z.string().min(2, "Farm name required"),
  country: z.string().min(1, "Country required"),
  region: z.string().min(2, "Region required"),
  altitudeMasl: z.coerce.number().int().min(0).optional(),
  totalArea: z.coerce.number().min(0.1).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  varieties: z.array(z.string()).min(1, "Select at least one variety"),
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

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600";

export default function CreateFarmPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [altitudeMessage, setAltitudeMessage] = useState<string | null>(null);

  const detectAltitude = useMutation(
    trpc.lots.detectAltitude.mutationOptions({
      onSuccess: (data) => {
        if (data.altitudeMeters != null) {
          form.setValue("altitudeMasl", data.altitudeMeters);
          setAltitudeMessage(
            `Detected: ${data.altitudeMeters} meters above sea level (via Copernicus DEM)`,
          );
        } else {
          setAltitudeMessage(
            "Could not detect automatically, please enter manually",
          );
        }
      },
      onError: () => {
        setAltitudeMessage(
          "Could not detect automatically, please enter manually",
        );
      },
    }),
  );

  const createFarm = useMutation(
    trpc.farms.create.mutationOptions({
      onSuccess: async (farm) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
        toast.success(`Farm "${farm.name}" registered`);
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
      description: "",
      photoUrl: "",
    },
  });

  const rawLat = form.watch("latitude");
  const rawLng = form.watch("longitude");
  const gpsLat = Number.isFinite(Number(rawLat)) && rawLat !== undefined ? Number(rawLat) : null;
  const gpsLng = Number.isFinite(Number(rawLng)) && rawLng !== undefined ? Number(rawLng) : null;
  const canDetect = gpsLat !== null && gpsLng !== null;

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

  // Auto-fill total area from polygon when the field hasn't been manually edited
  useEffect(() => {
    if (!polygon) return;
    if (form.formState.dirtyFields.totalArea) return;
    const area = parseFloat(polygonAreaManzanas(polygon).toFixed(2));
    if (area > 0) form.setValue("totalArea", area);
  }, [polygon]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: CreateFarmValues) {
    if (!user) {
      toast.error("Sign in as a farmer to register a farm");
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
      description: values.description || undefined,
      photoUrl: values.photoUrl || undefined,
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
        Back to Dashboard
      </Button>

      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-8 border-primary/20">
          <h1 className="text-3xl font-bold mb-2">Register Your Farm</h1>
          <p className="text-gray-400 mb-8">
            Create a new farm to start offering investment opportunities
          </p>

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
                    <FormLabel className="text-white/80">Farm Name *</FormLabel>
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
                      <FormLabel className="text-white/80">Country *</FormLabel>
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
                      <FormLabel className="text-white/80">Region *</FormLabel>
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
                <FormField
                  control={form.control}
                  name="altitudeMasl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        Altitude (MASL)
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

                <FormField
                  control={form.control}
                  name="totalArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        Total Area (Manzanas)
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

              <PolygonInput
                value={polygon}
                onChange={setPolygon}
                label="Farm Boundary (optional but recommended for risk scoring)"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">GPS Latitude</FormLabel>
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
                      <FormLabel className="text-white/80">GPS Longitude</FormLabel>
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

              {canDetect && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 text-white/80 hover:border-white/30 hover:text-white"
                    disabled={detectAltitude.isPending}
                    onClick={() => {
                      setAltitudeMessage(null);
                      detectAltitude.mutate({ lat: gpsLat!, lng: gpsLng! });
                    }}
                  >
                    {detectAltitude.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Satellite className="w-4 h-4 mr-2" />
                    )}
                    Detect Altitude from Satellite
                  </Button>
                  {altitudeMessage && (
                    <p
                      className={`text-xs ${
                        altitudeMessage.startsWith("Detected")
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {altitudeMessage}
                    </p>
                  )}
                </div>
              )}

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
                    <FormLabel className="text-white/80">
                      Farm Photo URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
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
                className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-11"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Registering..." : "Register Farm"}
              </Button>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
