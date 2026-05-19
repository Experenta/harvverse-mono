"use client";

import { useEffect } from "react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle, Info, Lock, Loader2 } from "lucide-react";

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

import { formatUsdFromCents } from "@/lib/format";
import { useCurrentUser } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";

const editLotSchema = z.object({
  // Section B — marketing
  variety: z.string().trim().max(100).optional(),
  profile: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  scaScoreTenths: z.coerce.number().int().min(0).max(1000).optional(),
  // Section C — agronomic
  numTrees: z.coerce.number().int().min(0).optional(),
  plantAgeYears: z.coerce.number().int().min(0).optional(),
  areaManzanas: z.coerce.number().min(0).optional(),
  harvestYear: z.coerce.number().int().min(2000).max(2100).optional(),
  cycleNotes: z.string().trim().optional(),
});

type EditLotInput = z.input<typeof editLotSchema>;
type EditLotValues = z.output<typeof editLotSchema>;

const inputClasses = "bg-black/20 border-white/10 text-white placeholder:text-gray-600";

export default function FarmerLotEditPage() {
  const router = useRouter();
  const params = useParams<{ lotId: string }>();
  const lotId = Number(params.lotId);
  const lotIdValid = Number.isFinite(lotId) && lotId > 0;
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations("lot");
  const tc = useTranslations("common");

  const { data: lot, isLoading: lotLoading } = useQuery(
    trpc.lots.byId.queryOptions({ id: lotId }, { enabled: lotIdValid }),
  );

  const updateLot = useMutation(
    trpc.lots.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.lots.byId.queryKey({ id: lotId }),
        });
        toast.success(t("updated"));
        router.push(`/dashboard/farmer/lots/${lotId}` as Route);
      },
    }),
  );

  const form = useForm<EditLotInput, unknown, EditLotValues>({
    resolver: zodResolver(editLotSchema),
    defaultValues: {
      variety: "",
      profile: "",
      summary: "",
      coverImageUrl: "",
      scaScoreTenths: undefined,
      numTrees: undefined,
      plantAgeYears: undefined,
      areaManzanas: undefined,
      harvestYear: undefined,
      cycleNotes: "",
    },
  });

  useEffect(() => {
    if (!lot) return;
    form.reset({
      variety: lot.variety ?? "",
      profile: lot.profile ?? "",
      summary: lot.summary ?? "",
      coverImageUrl: lot.coverImages?.[0] ?? "",
      scaScoreTenths: lot.scaScoreTenths ?? undefined,
      numTrees: lot.numTrees ?? undefined,
      plantAgeYears: lot.plantAgeYears ?? undefined,
      areaManzanas: lot.areaManzanas != null ? Number(lot.areaManzanas) : undefined,
      harvestYear: lot.harvestYear ?? undefined,
      cycleNotes: lot.cycleNotes ?? "",
    });
  }, [lot]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userLoading && user && user.role !== "farmer") {
    router.replace("/dashboard/player");
    return null;
  }

  const isLoading = userLoading || lotLoading;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!lot) {
    return (
      <GlassCard className="p-12 text-center border-primary/20">
        <p className="text-gray-400">{t("not_found")}</p>
      </GlassCard>
    );
  }

  const isAvailable = lot.status === "available";
  const activePlan = lot.plans?.find((p) => p.status === "approved_for_demo") ?? lot.plans?.[0];

  function onSubmit(values: EditLotValues) {
    updateLot.mutate({
      lotId,
      variety: values.variety || undefined,
      profile: values.profile || undefined,
      summary: values.summary || undefined,
      coverImages: values.coverImageUrl ? [values.coverImageUrl] : [],
      scaScoreTenths: values.scaScoreTenths,
      numTrees: values.numTrees,
      plantAgeYears: values.plantAgeYears,
      areaManzanas: values.areaManzanas,
      harvestYear: values.harvestYear,
      cycleNotes: values.cycleNotes || undefined,
    });
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="mb-6 text-white/70"
        onClick={() =>
          router.push(`/dashboard/farmer/lots/${lotId}` as Route)
        }
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tc("back")}
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        <GlassCard className="p-8 border-primary/20">
          <h1 className="text-3xl font-bold mb-1">{t("edit_title")}</h1>
          <p className="text-gray-400 text-sm mb-8">
            {lot.code ?? t("lot_id", { id: lot.id })}
          </p>

          {/* Section A — Agreement Terms (always read-only) */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-primary">{t("section_a_title")}</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">{t("section_a_info")}</p>
            {activePlan ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{t("ticket")}</p>
                  <p className="text-white font-medium">{formatUsdFromCents(activePlan.ticketCents)}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{t("price_per_lb")}</p>
                  <p className="text-white font-medium">{formatUsdFromCents(activePlan.priceCentsPerLb)}/lb</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{t("farmer_split_pct")}</p>
                  <p className="text-white font-medium">{((activePlan.splitFarmerBps ?? 0) / 100).toFixed(1)}%</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">{t("partner_split_pct")}</p>
                  <p className="text-white font-medium">{((activePlan.splitPartnerBps ?? 0) / 100).toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t("no_active_plan")}</p>
            )}
          </div>

          <div className="border-t border-white/10 my-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Section B — Marketing */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isAvailable ? (
                    <h2 className="text-base font-semibold">{t("section_b_title")}</h2>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-yellow-400" />
                      <h2 className="text-base font-semibold text-yellow-400">{t("section_b_title")}</h2>
                    </>
                  )}
                </div>
                {!isAvailable && (
                  <p className="text-xs text-yellow-500/80 mb-4">
                    {t("section_b_locked", { status: lot.status })}
                  </p>
                )}
              </div>

              {isAvailable ? (
                <>
                  <FormField
                    control={form.control}
                    name="variety"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">{t("variety")}</FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
                            placeholder="e.g., Geisha"
                            {...field}
                            value={typeof field.value === "string" ? field.value : (field.value ?? "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scaScoreTenths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">{t("sca_score")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className={inputClasses}
                            placeholder="e.g., 875"
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
                    name="profile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">{t("tasting_profile")}</FormLabel>
                        <FormControl>
                          <Textarea
                            className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                            placeholder="e.g., Jasmine, peach, brown sugar..."
                            {...field}
                            value={typeof field.value === "string" ? field.value : (field.value ?? "")}
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
                        <FormLabel className="text-white/80">{t("summary")}</FormLabel>
                        <FormControl>
                          <Textarea
                            className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                            placeholder={t("summary_placeholder")}
                            {...field}
                            value={typeof field.value === "string" ? field.value : (field.value ?? "")}
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
                            className={inputClasses}
                            placeholder={t("cover_image_placeholder")}
                            {...field}
                            value={typeof field.value === "string" ? field.value : (field.value ?? "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm opacity-60">
                  {lot.variety && (
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                      <p className="text-gray-500 text-xs mb-1">{t("variety")}</p>
                      <p className="text-white">{lot.variety}</p>
                    </div>
                  )}
                  {lot.scaScoreTenths != null && (
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                      <p className="text-gray-500 text-xs mb-1">{t("sca_score")}</p>
                      <p className="text-white">{(lot.scaScoreTenths / 10).toFixed(1)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-white/10 my-2" />

              {/* Section C — Agronomic Notes (always editable) */}
              <div>
                <h2 className="text-base font-semibold mb-4">{t("section_c_title")}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numTrees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("num_trees")}</FormLabel>
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
                  name="plantAgeYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("plant_age")}</FormLabel>
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
                  name="areaManzanas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("area_manzanas")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
                  name="harvestYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">{t("harvest_year")}</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="cycleNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">{t("cycle_notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="bg-black/20 border-white/10 text-white placeholder:text-gray-600"
                        placeholder={t("cycle_notes_placeholder")}
                        rows={4}
                        {...field}
                        value={typeof field.value === "string" ? field.value : (field.value ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateLot.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-[#001020] font-bold h-11"
              >
                {updateLot.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {updateLot.isPending ? t("saving") : t("save_btn")}
              </Button>
            </form>
          </Form>
        </GlassCard>
      </div>
    </div>
  );
}
