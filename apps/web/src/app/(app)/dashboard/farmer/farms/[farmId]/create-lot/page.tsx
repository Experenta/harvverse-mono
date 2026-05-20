"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Polygon } from "geojson";
import type { Route } from "next";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  CheckCircle,
  ExternalLink,
  FileUp,
  HelpCircle,
  Loader2,
  MapPinned,
  Satellite,
} from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Checkbox } from "@harvverse-monorepo/ui/components/checkbox";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@harvverse-monorepo/ui/components/tooltip";

import { computeEarnings, formatUsd, formatUsdPrecise } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harvverse-monorepo/ui/components/select";
import RiskScorePreview, { type RiskScoreData } from "@/components/risk-score-preview";
import PolygonInput from "@/components/polygon-input";
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

const DEFAULT_PLAN_TERMS = {
  ticketUsd: 3425,
  pricePerLbUsd: 3.5,
  priceFloorPerLbUsd: 2.5,
  agronomicCostUsd: 1490,
  projectedYieldQq: 6,
  yieldCapQq: 8,
  farmerSharePct: 60,
};

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().positive().optional(),
);

const createLotSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Lot code must be at least 3 characters")
      .max(30, "Max 30 characters"),
    variety: z.string().min(1, "Variety required"),
    process: z.string().optional(),
    areaManzanas: z.coerce.number().min(0.1, "Area required"),
    altitudeMasl: z.coerce.number().int().min(0).max(4000, "Max 4000 m").optional(),
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
    profile: z.string().trim().min(1, "Profile required"),
    summary: z.string().trim().min(1, "Summary required"),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    ticketUsd: optionalPositiveNumber,
    pricePerLbUsd: optionalPositiveNumber,
    priceFloorPerLbUsd: optionalPositiveNumber,
    agronomicCostUsd: optionalPositiveNumber,
    projectedYieldQq: optionalPositiveNumber,
    yieldCapQq: optionalPositiveNumber,
    farmerSharePct: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce.number().min(1).max(99).optional(),
    ),
  });

type CreateLotInput = z.input<typeof createLotSchema>;
type CreateLotValues = z.output<typeof createLotSchema>;
type SubmitMode = "draft" | "publish";

const planSchema = z.object({
  ticketUsd: z.number().positive().min(1000),
  pricePerLbUsd: z.number().positive(),
  priceFloorPerLbUsd: z.number().positive(),
  agronomicCostUsd: z.number().positive(),
  projectedYieldQq: z.number().positive(),
  yieldCapQq: z.number().positive(),
  farmerSharePct: z.number().min(1).max(99),
});

const inputClasses =
  "harv-input";
const selectClasses =
  "harv-input w-full rounded-lg border p-2";

export default function CreateLotPage() {
  const router = useRouter();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const farmIdValid = Number.isFinite(farmId);
  const t = useTranslations("lot");
  const tf = useTranslations("farm");
  const tc = useTranslations("common");
  const tLF = useTranslations("lot_financial");

  const { data: user } = useCurrentUser();
  const { data: farm, isLoading: farmLoading } = useQuery(
    trpc.farms.byId.queryOptions({ id: farmId }, { enabled: farmIdValid }),
  );
  const { data: existingLots = [] } = useQuery(
    trpc.lots.byFarmId.queryOptions({ farmId }, { enabled: farmIdValid }),
  );

  const [lotPolygon, setLotPolygon] = useState<Polygon | null>(null);
  const [outsideFarm, setOutsideFarm] = useState(false);
  const [altitudeStatus, setAltitudeStatus] = useState<"detected" | "error" | null>(null);
  const [detectedAltitude, setDetectedAltitude] = useState<number | null>(null);
  const [calculatedArea, setCalculatedArea] = useState<{ hectares: number; manzanas: number } | null>(null);
  const [previewScoreData, setPreviewScoreData] = useState<RiskScoreData | null>(null);
  const [riskScoreMessage, setRiskScoreMessage] = useState<string | null>(null);
  const [showPolygonGuide, setShowPolygonGuide] = useState(true);
  const [defineTermsNow, setDefineTermsNow] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("draft");

  const farmPolygon =
    farm?.polygon != null ? (farm.polygon as Polygon) : undefined;

  const createLot = useMutation(
    trpc.lots.create.mutationOptions({
      onSuccess: async (lot, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.lots.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.farms.byId.queryKey({ id: farmId }),
          }),
        ]);
        if (variables.status === "draft") {
          toast.success(`${t("saved_as_draft")} ${t("draft_redirect")}`);
        } else {
          toast.success(`Lot "${lot.code ?? lot.id}" created`);
        }
        router.push(`/dashboard/farmer/lots/${lot.id}` as Route);
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
      coverImageUrl: "",
      ...DEFAULT_PLAN_TERMS,
    },
  });

  // Auto-fill GPS centroid from polygon when those fields are untouched
  useEffect(() => {
    setPreviewScoreData(null);
    setRiskScoreMessage(null);
    if (!lotPolygon) return;

    const { lat, lng } = polygonCentroid(lotPolygon);

    if (
      form.getValues("gpsLat") === undefined &&
      form.getValues("gpsLng") === undefined
    ) {
      form.setValue("gpsLat", parseFloat(lat.toFixed(6)));
      form.setValue("gpsLng", parseFloat(lng.toFixed(6)));
    }

    setAltitudeStatus(null);
    setDetectedAltitude(null);
    detectAltitude.mutate({ lat, lng });

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

  const farmerSharePct = form.watch("farmerSharePct");
  const projectedYieldQq = form.watch("projectedYieldQq");
  const pricePerLbUsd = form.watch("pricePerLbUsd");
  const agronomicCostUsd = form.watch("agronomicCostUsd");
  const priceFloorPerLbUsd = form.watch("priceFloorPerLbUsd");
  const ticketUsd = form.watch("ticketUsd");
  const yieldCapQq = form.watch("yieldCapQq");
  const planValues = {
    ticketUsd: Number(ticketUsd),
    pricePerLbUsd: Number(pricePerLbUsd),
    priceFloorPerLbUsd: Number(priceFloorPerLbUsd),
    agronomicCostUsd: Number(agronomicCostUsd),
    projectedYieldQq: Number(projectedYieldQq),
    yieldCapQq: Number(yieldCapQq),
    farmerSharePct: Number(farmerSharePct),
  };
  const planParse = planSchema.safeParse(planValues);
  const hasValidPlanTerms = planParse.success;
  const earnings = computeEarnings({
    projectedYieldQq: Number(projectedYieldQq) || 0,
    pricePerLbUsd: Number(pricePerLbUsd) || 0,
    agronomicCostUsd: Number(agronomicCostUsd) || 0,
    farmerSharePct: Number(farmerSharePct) || 0,
  });

  function onSubmit(values: CreateLotValues, mode: SubmitMode) {
    if (!farm) {
      toast.error(t("farm_not_loaded"));
      return;
    }
    if (!user) {
      toast.error(t("sign_in_required"));
      return;
    }
    const planResult = planSchema.safeParse({
      ticketUsd: values.ticketUsd,
      pricePerLbUsd: values.pricePerLbUsd,
      priceFloorPerLbUsd: values.priceFloorPerLbUsd,
      agronomicCostUsd: values.agronomicCostUsd,
      projectedYieldQq: values.projectedYieldQq,
      yieldCapQq: values.yieldCapQq,
      farmerSharePct: values.farmerSharePct,
    });

    if (mode === "publish" && !planResult.success) {
      toast.error(t("publish_requires_terms"));
      return;
    }

    setSubmitMode(mode);
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
      coverImages: values.coverImageUrl ? [values.coverImageUrl] : undefined,
      polygon: lotPolygon ?? undefined,
      status: mode === "publish" ? "available" : "draft",
      riskScore: previewScoreData?.score ?? undefined,
      eudrCompliant: previewScoreData?.eudrCompliant ?? undefined,
      scoreHash: previewScoreData?.hash ?? undefined,
      plan: mode === "publish" && planResult.success
        ? {
            ticketCents: Math.round(planResult.data.ticketUsd * 100),
            priceCentsPerLb: Math.round(planResult.data.pricePerLbUsd * 100),
            priceFloorCentsPerLb: Math.round(planResult.data.priceFloorPerLbUsd * 100),
            agronomicCostCents: Math.round(planResult.data.agronomicCostUsd * 100),
            projectedYieldY1TenthsQq: Math.round(planResult.data.projectedYieldQq * 10),
            yieldCapY1TenthsQq: Math.round(planResult.data.yieldCapQq * 10),
            splitFarmerBps: Math.round(planResult.data.farmerSharePct * 100),
            splitPartnerBps: Math.round((100 - planResult.data.farmerSharePct) * 100),
          }
        : undefined,
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
        {tc("back")}
      </Button>

      <GlassCard className="p-8 border-primary/20 bg-white/[0.03]">
        <h1 className="font-trenda text-3xl font-bold text-white mb-2">{t("create_title")}</h1>
        <p className="text-white/70 mb-8">
          {farmLoading
            ? t("loading_farm")
            : farm
              ? t("adding_to", { farmName: farm.name })
              : t("farm_not_found")}
        </p>

        <Form {...form}>
          <form className="space-y-5">
            <div className="border-b border-white/10 pb-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                {t("lot_info_section")}
              </p>
            </div>

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">{t("code")} *</FormLabel>
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
              <p className="text-sm text-white/80">
                {farmPolygon
                  ? t("lot_boundary_with_farm")
                  : t("lot_boundary")}
              </p>
              <div className="rounded-xl border border-[#67B9C1]/20 bg-[#67B9C1]/[0.06]">
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
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#67B9C1]">
                        {t("polygon_guide_app")}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${
                      showPolygonGuide ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showPolygonGuide && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3">
                    <ol className="grid gap-2 text-xs leading-relaxed text-white/70 sm:grid-cols-2">
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
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                            {index + 1}
                          </span>
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href="https://play.google.com/store/apps/details?id=com.google.earth"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#67B9C1]/35 px-3 text-xs font-semibold text-[#67B9C1] transition hover:border-[#67B9C1]/70 hover:bg-[#67B9C1]/10"
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        {t("polygon_guide_android")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href="https://apps.apple.com/us/app/google-earth/id293622097"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold text-white/70 transition hover:border-white/35 hover:bg-white/5 hover:text-white"
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        {t("polygon_guide_ios")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <PolygonInput
                mode="lot"
                value={lotPolygon}
                onChange={setLotPolygon}
                onAreaCalculated={handleAreaCalculated}
                farmPolygon={farmPolygon}
                existingLots={existingLots.map((lot) => ({
                  code: lot.code,
                  polygon: lot.polygon != null ? (lot.polygon as Polygon) : null,
                }))}
              />
              {calculatedArea && (
                <p className="text-xs text-green-400">
                  {tf("area_calculated", { hectares: calculatedArea.hectares.toFixed(2), manzanas: calculatedArea.manzanas.toFixed(2) })}
                </p>
              )}
              {outsideFarm && lotPolygon && (
                <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {t("outside_farm_warning")}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="areaManzanas"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      {t("area_manzanas")} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("area_auto")}
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
                  {t("investment_preview", { area: areaManzanas })}
                </h3>
                <div className="text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span>
                      Physical: $
                      {(
                        INVESTMENT_RATES.PHYSICAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-white/45">$2,525/mz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      Digital: $
                      {(
                        INVESTMENT_RATES.DIGITAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-white/45">$1,200/mz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      Phygital: $
                      {(
                        INVESTMENT_RATES.PHYGITAL * areaManzanas
                      ).toLocaleString()}
                    </span>
                    <span className="text-xs text-white/45">$3,425/mz</span>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="variety"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">
                      {t("variety")} *
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("variety")} />
                        </SelectTrigger>
                        <SelectContent>
                          {COFFEE_VARIETIES.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
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
                name="process"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("process")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("process")} />
                        </SelectTrigger>
                        <SelectContent>
                          {PROCESSES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel className="text-white/80">{t("gps_lat")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder={t("gps_auto")}
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
                      {t("gps_lng")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder={t("gps_auto")}
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
                      {t("altitude")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={
                          farm?.altitudeMasl
                            ? t("altitude_default", { value: farm.altitudeMasl })
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
                      {t("harvest_year")}
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

            {altitudeStatus && (
              <p
                className={`text-xs ${
                  altitudeStatus === "detected"
                    ? "text-green-400"
                    : "text-yellow-400"
                }`}
              >
                {altitudeStatus === "detected" && detectedAltitude != null
                  ? t("altitude_detected", { value: detectedAltitude })
                  : t("altitude_error")}
              </p>
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
                      {t("calculating_risk")}
                    </>
                  ) : (
                    <>
                      <Satellite className="w-4 h-4 mr-2" />
                      {t("calculate_risk")}
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
                      {t("num_trees")}
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
                      {t("plant_age")}
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
                  <FormLabel className="text-white/80">{t("sca_score")}</FormLabel>
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
                    <p className="text-xs text-white/45">
                      {t("sca_hint", { value: (Number(field.value) / 10).toFixed(1) })}
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
                  <FormLabel className="text-white/80">{t("tasting_profile")} *</FormLabel>
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
                  <FormLabel className="text-white/80">{t("summary")} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("summary_placeholder")}
                      className="bg-black/20 border-white/10 text-white placeholder:text-white/35"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">{t("cover_image_url")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("cover_image_placeholder")}
                      className={inputClasses}
                      {...field}
                      value={(field.value as string | number | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-b border-white/10 pb-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                {tLF("section_title")}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-white">
                <Checkbox
                  checked={defineTermsNow}
                  onCheckedChange={(checked) => setDefineTermsNow(checked === true)}
                  className="border-[#67B9C1]/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-[#001020]"
                />
                {t("define_terms_now")}
              </label>
            </div>

            {!defineTermsNow ? (
              <GlassCard className="border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-white/65">{t("terms_optional_hint")}</p>
              </GlassCard>
            ) : (
              <>
            <GlassCard className="p-6 bg-primary/5 border-primary/20 space-y-4">
              <div>
                <h3 className="font-bold text-primary">{tLF("section_title")}</h3>
                <p className="text-xs text-white/60 mt-1">{tLF("plan_hint")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ticketUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{tLF("ticket_label")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("ticket_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agronomicCostUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 flex items-center gap-1">
                        {tLF("agro_cost_label")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-white/45 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_agro_cost")}</TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="1" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("agro_cost_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerLbUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{tLF("price_label")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("price_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceFloorPerLbUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 flex items-center gap-1">
                        {tLF("price_floor_label")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-white/45 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_price_floor")}</TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("price_floor_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectedYieldQq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 flex items-center gap-1">
                        {tLF("yield_label")}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-white/45 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>{tLF("tooltip_quintal")}</TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("yield_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yieldCapQq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{tLF("yield_cap_label")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("yield_cap_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="farmerSharePct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{tLF("farmer_share_label")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="1" max="99" className={inputClasses} {...field} value={(field.value as string | number | undefined) ?? ""} />
                      </FormControl>
                      <p className="text-xs text-white/45">{tLF("farmer_share_helper")}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col justify-center">
                  <p className="text-xs text-white/45 mb-1">{tLF("partner_share_info")}</p>
                  <p className="text-white font-medium text-lg">
                    {(100 - (Number(farmerSharePct) || 0)).toFixed(0)}%
                  </p>
                  <p className="text-xs text-white/35">(100% − tu parte)</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 bg-emerald-900/10 border-emerald-500/20 space-y-3">
              <h3 className="font-bold text-emerald-400">{tLF("preview_title")}</h3>
              <p className="text-xs text-white/60">{tLF("preview_note")}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">{tLF("earnings_gross")}</span>
                  <span className="text-white font-medium">{formatUsd(earnings.grossIncomeUsd)}</span>
                </div>
                <p className="text-xs text-white/35">
                  {tLF("gross_income_line", {
                    value: (Number(projectedYieldQq) || 0).toFixed(1),
                    price: formatUsdPrecise(Number(pricePerLbUsd) || 0).replace("$", ""),
                  })}
                </p>
                <div className="flex justify-between">
                  <span className="text-white/60">{tLF("earnings_agro_cost")}</span>
                  <span className="text-red-400">−{formatUsd(Number(agronomicCostUsd) || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-white/60">{tLF("earnings_net_profit")}</span>
                  <span className="text-white font-medium">{formatUsd(earnings.netProfitUsd)}</span>
                </div>
                <div className="flex justify-between bg-emerald-900/20 rounded-lg p-2">
                  <span className="text-emerald-300 font-semibold">
                    {tLF("earnings_your_share", { pct: (Number(farmerSharePct) || 0).toFixed(0) })}
                  </span>
                  <span className="text-emerald-300 font-bold text-base">{formatUsd(earnings.farmerEarningsUsd)}</span>
                </div>
              </div>
              <p className="text-xs text-white/35">{tLF("earnings_note")}</p>
            </GlassCard>
              </>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || !farm}
                className="h-11 flex-1 border-[#67B9C1]/40 text-[#67B9C1] hover:bg-[#67B9C1]/10"
                onClick={form.handleSubmit((values) => onSubmit(values, "draft"))}
              >
                {isSubmitting && submitMode === "draft" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {t("save_draft")}
              </Button>

              <Tooltip>
                <TooltipTrigger>
                  <span className="flex-1">
                    <Button
                      type="button"
                      disabled={isSubmitting || !farm || !defineTermsNow || !hasValidPlanTerms}
                      className="h-11 w-full bg-primary hover:bg-primary/90 text-[#001020] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={form.handleSubmit((values) => onSubmit(values, "publish"))}
                    >
                      {isSubmitting && submitMode === "publish" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {t("save_publish")}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!defineTermsNow || !hasValidPlanTerms ? (
                  <TooltipContent>{t("publish_requires_terms")}</TooltipContent>
                ) : null}
              </Tooltip>
            </div>
          </form>
        </Form>
      </GlassCard>
    </div>
  );
}
