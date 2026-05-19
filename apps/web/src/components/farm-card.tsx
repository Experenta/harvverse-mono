"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin, Mountain, CheckCircle2, Sprout, Plus, Layers } from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Badge } from "@harvverse-monorepo/ui/components/badge";

interface Lot {
  id: number;
  status: string;
  variety?: string | null;
  plans: unknown[];
}

interface Farm {
  id: number;
  name: string;
  region: string;
  country: string;
  altitudeMasl?: number | null;
  areaManzanas?: string | null;
  certifications?: string[] | null;
  photoUrls?: string[] | null;
  coeScore?: string | null;
  verified?: boolean | null;
  lots: Lot[];
}

interface FarmCardProps {
  farm: Farm;
}

export function FarmCard({ farm }: FarmCardProps) {
  const router = useRouter();
  const t = useTranslations("farm");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const tl = useTranslations("lot");

  const activeLots = farm.lots.filter(
    (l) => l.status === "active" || l.status === "available" || l.status === "reserved",
  );
  const varieties = Array.from(
    new Set(farm.lots.map((l) => l.variety).filter(Boolean)),
  ) as string[];

  return (
    <GlassCard className="overflow-hidden border-primary/20 flex flex-col">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/10 to-[#001020]">
        <img
          src={farm.photoUrls?.[0] ?? "/farm-placeholder.jpg"}
          alt={farm.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/farm-placeholder.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {farm.verified && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/90 text-[#001020] border-0 text-xs font-semibold gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t("verified")}
            </Badge>
          </div>
        )}
        {farm.coeScore && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-500/90 text-black border-0 text-xs font-semibold">
              CoE {farm.coeScore}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold mb-1 leading-tight">{farm.name}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400 text-sm mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {farm.region}, {farm.country}
          </span>
          {farm.altitudeMasl && (
            <span className="flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 shrink-0" />
              {farm.altitudeMasl} m
            </span>
          )}
          {farm.areaManzanas && (
            <span>{Number(farm.areaManzanas).toFixed(1)} mzn</span>
          )}
        </div>

        {varieties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {varieties.slice(0, 3).map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5"
              >
                <Sprout className="w-2.5 h-2.5" />
                {v}
              </span>
            ))}
          </div>
        )}

        {farm.certifications && farm.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {farm.certifications.slice(0, 3).map((cert) => (
              <Badge
                key={cert}
                className="bg-[#67B9C1]/10 text-[#67B9C1] border-[#67B9C1]/20 text-xs"
              >
                {cert}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>
            {tl("active_lots_count", { count: activeLots.length })}
          </span>
        </div>

        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push(`/dashboard/farmer/farms/${farm.id}`)}
          >
            {tn("manage_lots")}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary"
            onClick={() =>
              router.push(
                `/dashboard/farmer/farms/${farm.id}/create-lot` as Route,
              )
            }
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {tc("add_lot")}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
