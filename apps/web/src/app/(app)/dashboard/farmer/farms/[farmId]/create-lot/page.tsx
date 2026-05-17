"use client";

import { useEffect, useState } from "react";
import type { Polygon } from "geojson";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle, Loader2, Satellite } from "lucide-react";

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
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";
import {
  polygonCentroid,
  polygonContainedIn,
} from "@/lib/geo";

const INVESTMENT_RATES = {
  PHYSICAL: 2525,
  DIGITAL: 1200,
  PHYGITAL: 3425,
} as const;

const COFFEE_VARIETIES = [
  "Geisha",
  "Bourbon",
  "Catuai",
  "Pacamara",
  "Typica",
  "Caturra",
  "Parainema",
];

const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic"];

const CURRENT_YEAR = new Date().getFullYear();

const createLotSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Lot code required")
    .max(30, "Max 30 characters"),
  variety: z.string().min(1, "Variety required"),
  process: z.string().optional(),
  areaManzanas: z.coerce.number().min(0.1, "Area required"),
  altitudeMasl: z.coerce.number().int().min(0).optional(),
  gpsLat: z.coerce.number().min(-90).max(90).optional(),
  gpsLng: z.coerce.number().min(-180).max(180).optional(),
  harvestYear: z.coerce
    .number()
    .int()
    .min(2020)
    .max(CURRENT_YEAR + 2)
    .optional(),
  numTrees: z.coerce.number().int().min(1).optional(),
  plantAgeYears: z.coerce.number().int().min(0).max(100).optional(),
  scaScoreTenths: z.coerce.number().int().min(0).max(1000).optional(),
  profile: z.string().optional(),
  summary: z.string().optional(),
  // Investment plan (required — creates the plan atomically with the lot)
  ticketCents: z.coerce.number().int().positive(),
  priceCentsPerLb: z.coerce.number().int().positive(),
  priceFloorCentsPerLb: z.coerce.number().int().positive(),
  agronomicCostCents: z.coerce.number().int().positive(),
  projectedYieldY1TenthsQq: z.coerce.number().int().positive(),
  yieldCapY1TenthsQq: z.coerce.number().int().positive(),
  splitFarmerBps: z.coerce.number().int().min(0).max(10000),
  splitPartnerBps: z.coerce.number().int().min(0).max(10000),
});

type CreateLotInput = z.input<typeof createLotSchema>;
type CreateLotValues = z.output<typeof createLotSchema>;

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600";
const selectClasses =
  "w-full bg-black/20 border border-white/10 text-white p-2 rounded";

export default function CreateLotPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);

  const { data: user } = useCurrentUser();
  const { data: farm, isLoading: farmLoading } = useQuery(
    trpc.farms.byId.queryOptions({ id: farmId }, { enabled: farmIdValid }),
  );

  const [lotPolygon, setLotPolygon] = useState<Polygon | null>(null);
  const [outsideFarm, setOutsideFarm] = useState(false);
  const [altitudeMessage, setAltitudeMessage] = useState<string | null>(null);
  const [calculatedArea, setCalculatedArea] = useState<{ hectares: number; manzanas: number } | null>(null);
  const [previewScoreData, setPreviewScoreData] = useState<RiskScoreData | null>(null);
  const [riskScoreMessage, setRiskScoreMessage] = useState<string | null>(null);

  const farmPolygon =
    farm?.polygon != null ? (farm.polygon as Polygon) : undefined;

  const createLot = useMutation(
    trpc.lots.create.mutationOptions({
      onSuccess: async (lot) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.lots.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.farms.byId.queryKey({ id: farmId }),
          }),
        ]);
        toast.success(`Lot "${lot.code ?? lot.id}" created`);
        router.push(`/dashboard/farmer/farms/${farmId}` as Route);
      },
    }),
  );

  const form = useForm<CreateLotInput, unknown, CreateLotValues>({
    resolver: zodResolver(createLotSchema),
    defaultValues: {
      code: "",
      variety: "Bourbon",
      process: "Washed",
      areaManzanas: undefined,
      altitudeMasl: undefined,
      gpsLat: undefined,
      gpsLng: undefined,
      harvestYear: CURRENT_YEAR,
      numTrees: undefined,
      plantAgeYears: undefined,
      scaScoreTenths: undefined,
      profile: "",
      summary: "",
      ticketCents: 342500,
      priceCentsPerLb: 350,
      priceFloorCentsPerLb: 250,
      agronomicCostCents: 149000,
      projectedYieldY1TenthsQq: 60,
      yieldCapY1TenthsQq: 80,
      splitFarmerBps: 6000,
      splitPartnerBps: 4000,
    },
  });

  // Auto-fill GPS centroid from polygon when those fields are untouched
  useEffect(() => {
    setPreviewScoreData(null);
    setRiskScoreMessage(null);
    if (!lotPolygon) return;

    if (
      form.getValues("gpsLat") === undefined &&
      form.getValues("gpsLng") === undefined
    ) {
      const { lat, lng } = polygonCentroid(lotPolygon);
      form.setValue("gpsLat", parseFloat(lat.toFixed(6)));
      form.setValue("gpsLng", parseFloat(lng.toFixed(6)));
    }

    if (farmPolygon) {
      setOutsideFarm(!polygonContainedIn(lotPolygon, farmPolygon));
    }
  }, [lotPolygon]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAreaCalculated(area: { hectares: number; manzanas: number } | null) {
    setCalculatedArea(area);
    if (!area) return;
    if (!form.formState.dirtyFields.areaManzanas) {
      form.setValue("areaManzanas", area.manzanas);
    }
  }

  const detectAltitude = useMutation(
    trpc.lots.detectAltitude.mutationOptions({
      onSuccess: (data) => {
        if (data.altitudeMeters != null) {
          form.setValue("altitudeMasl", data.altitudeMeters);
          setAltitudeMessage(
            `Detected: ${data.altitudeMeters} m above sea level (Copernicus DEM)`,
          );
        } else {
          setAltitudeMessage("Could not detect automatically, enter manually");
        }
      },
      onError: () =>
        setAltitudeMessage("Could not detect automatically, enter manually"),
    }),
  );

  const previewRiskScore = useMutation(
    trpc.lots.previewRiskScore.mutationOptions({
      onSuccess: (data) => {
        setPreviewScoreData(data);
        setRiskScoreMessage(null);
      },
      onError: (err) => {
        setRiskScoreMessage(`Error: ${err.message}`);
      },
    }),
  );

  const rawLat = form.watch("gpsLat");
  const rawLng = form.watch("gpsLng");
  const gpsLat =
    Number.isFinite(Number(rawLat)) && rawLat !== undefined
      ? Number(rawLat)
      : null;
  const gpsLng =
    Number.isFinite(Number(rawLng)) && rawLng !== undefined
      ? Number(rawLng)
      : null;
  const canDetect = gpsLat !== null && gpsLng !== null;

  // Clear stale preview when GPS coords change manually
  useEffect(() => {
    setPreviewScoreData(null);
    setRiskScoreMessage(null);
  }, [rawLat, rawLng]);

  const areaManzanas = form.watch("areaManzanas");
  const showPreview =
    typeof areaManzanas === "number" && areaManzanas > 0;

  function onSubmit(values: CreateLotValues) {
    if (!farm) {
      toast.error("Farm not loaded yet");
      return;
    }
    if (!user) {
      toast.error("Sign in to create a lot");
      return;
    }
    createLot.mutate({
      farmId: farm.id,
      farmName: farm.name,
      farmerWallet: user.walletAddress ?? "",
      region: farm.region,
      country: farm.country,
      code: values.code,
      variety: values.variety,
      process: values.process || undefined,
      areaManzanas: String(values.areaManzanas),
      altitudeMasl: values.altitudeMasl ?? farm.altitudeMasl ?? undefined,
      gpsLat: values.gpsLat != null ? String(values.gpsLat) : undefined,
      gpsLng: values.gpsLng != null ? String(values.gpsLng) : undefined,
      harvestYear: values.harvestYear,
      numTrees: values.numTrees,
      plantAgeYears: values.plantAgeYears,
      scaScoreTenths: values.scaScoreTenths,
      profile: values.profile || undefined,
      summary: values.summary || undefined,
      polygon: lotPolygon ?? undefined,
      status: "available",
      riskScore: previewScoreData?.score ?? undefined,
      eudrCompliant: previewScoreData?.eudrCompliant ?? undefined,
      scoreHash: previewScoreData?.hash ?? undefined,
      plan: {
        ticketCents: values.ticketCents,
        priceCentsPerLb: values.priceCentsPerLb,
        priceFloorCentsPerLb: values.priceFloorCentsPerLb,
        agronomicCostCents: values.agronomicCostCents,
        projectedYieldY1TenthsQq: values.projectedYieldY1TenthsQq,
        yieldCapY1TenthsQq: values.yieldCapY1TenthsQq,
        splitFarmerBps: values.splitFarmerBps,
        splitPartnerBps: values.splitPartnerBps,
      },
    });
  }

  const isSubmitting = createLot.isPending;

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() =>
          router.push(`/dashboard/farmer/farms/${farmId}` as Route)
        }
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <GlassCard className="p-8 border-primary/20">
        <h1 className="text-3xl font-bold mb-2">Create Investment Lot</h1>
        <p className="text-gray-400 mb-8">
          {farmLoading
            ? "Loading farm..."
            : farm
              ? `Adding a lot to ${farm.name}`
              : "Farm not found"}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Lot Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., HV-HN-ZAF-L02"
                      className={inputClasses}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1">
              <PolygonInput
                value={lotPolygon}
                onChange={setLotPolygon}
                onAreaCalculated={handleAreaCalculated}
                farmPolygon={farmPolygon}
                label={
                  farmPolygon
                    ? "Lot Boundary (blue = farm boundary)"
                    : "Lot Boundary (optional)"
                }
              />
              {calculatedArea && (
                <p className="text-xs text-green-400">
                  Calculated area: {calculatedArea.hectares.toFixed(2)} hectares ({calculatedArea.manzanas.toFixed(2)} manzanas)
                </p>
              )}
              {outsideFarm && lotPolygon && (
                <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Some lot corners appear to fall outside the farm boundary.
                  Double-check the polygon.
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="areaManzanas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">
                    Area (Manzanas) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="auto-calculated from polygon, or enter manually"
                      className={inputClasses}
                      {...field}
                      value={(field.value as string | number | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPreview && (
              <GlassCard className="p-6 bg-primary/5 border-primary/20">
                <h3 className="font-bold mb-4">
                  Investment Preview (for {areaManzanas} manzanas)
                </h3>
                <div className="text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span>
                      🌿 Physical: $
                      {(
                        INVESTMENT_RATES.PHYSICAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">$2,525/mz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      💎 Digital: $
                      {(
                        INVESTMENT_RATES.DIGITAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">$1,200/mz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      ✨ Phygital: $
                      {(
                        INVESTMENT_RATES.PHYGITAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">$3,425/mz</span>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="variety"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Coffee Variety *
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className={selectClasses}
                        style={{ colorScheme: "dark" }}
                      >
                        {COFFEE_VARIETIES.map((v) => (
                          <option key={v} value={v}>
                            {v}
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
                name="process"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Process</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                        className={selectClasses}
                        style={{ colorScheme: "dark" }}
                      >
                        {PROCESSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gpsLat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">GPS Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="auto-filled from polygon"
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gpsLng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      GPS Longitude
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="auto-filled from polygon"
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
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
                        placeholder={
                          farm?.altitudeMasl
                            ? `defaults to ${farm.altitudeMasl}`
                            : "e.g., 1300"
                        }
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="harvestYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Harvest Year
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={String(CURRENT_YEAR)}
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
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

            {(canDetect || lotPolygon !== null) && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/30 text-primary hover:border-primary/60 hover:text-primary w-full"
                  disabled={previewRiskScore.isPending}
                  onClick={() => {
                    setRiskScoreMessage(null);
                    const lat = gpsLat ?? (lotPolygon ? polygonCentroid(lotPolygon).lat : null);
                    const lng = gpsLng ?? (lotPolygon ? polygonCentroid(lotPolygon).lng : null);
                    if (lat === null || lng === null) return;
                    previewRiskScore.mutate({
                      lat,
                      lng,
                      polygon: lotPolygon
                        ? { coordinates: lotPolygon.coordinates as number[][][] }
                        : undefined,
                    });
                  }}
                >
                  {previewRiskScore.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Consulting Sentinel-2 and ERA5 satellites...
                    </>
                  ) : (
                    <>
                      <Satellite className="w-4 h-4 mr-2" />
                      Calculate Risk Score from Satellite Data
                    </>
                  )}
                </Button>
                {riskScoreMessage && (
                  <p className="text-xs text-red-400">{riskScoreMessage}</p>
                )}
                {previewScoreData && <RiskScorePreview data={previewScoreData} />}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numTrees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Number of Trees
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 1000"
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plantAgeYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      Plant Age (Years)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5"
                        className={inputClasses}
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scaScoreTenths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">SCA Score (×10)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 858 = 85.8 pts"
                      className={inputClasses}
                      {...field}
                      value={(field.value as string | number | undefined) ?? ""}
                    />
                  </FormControl>
                  {field.value ? (
                    <p className="text-xs text-gray-500">
                      {(Number(field.value) / 10).toFixed(1)} SCA points
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Tasting Profile</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Caramel, dark chocolate, citric acidity"
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
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description of the lot..."
                      className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <GlassCard className="p-6 bg-primary/5 border-primary/20 space-y-4">
              <div>
                <h3 className="font-bold text-primary">Investment Plan</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Pre-filled with standard terms — adjust as needed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ticketCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Ticket Price (¢)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">${((Number(field.value) || 0) / 100).toLocaleString()}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agronomicCostCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Agronomic Cost (¢)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">${((Number(field.value) || 0) / 100).toLocaleString()}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceCentsPerLb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Price/lb (¢)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">${((Number(field.value) || 0) / 100).toFixed(2)}/lb</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceFloorCentsPerLb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Price Floor/lb (¢)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">${((Number(field.value) || 0) / 100).toFixed(2)}/lb</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectedYieldY1TenthsQq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Proj. Yield Y1 (0.1 qq)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">{((Number(field.value) || 0) / 10).toFixed(1)} qq</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yieldCapY1TenthsQq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Yield Cap Y1 (0.1 qq)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">{((Number(field.value) || 0) / 10).toFixed(1)} qq</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="splitFarmerBps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Farmer Split (bps)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">{((Number(field.value) || 0) / 100).toFixed(0)}%</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="splitPartnerBps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Partner Split (bps)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-gray-500">{((Number(field.value) || 0) / 100).toFixed(0)}%</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </GlassCard>

            <Button
              type="submit"
              disabled={isSubmitting || !farm}
              className="w-full bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold h-11"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? "Creating..." : "Create Lot"}
            </Button>
          </form>
        </Form>
      </GlassCard>
    </div>
  );
}
