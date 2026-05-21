"use client";

import { area as turfArea } from "@turf/area";
import dynamic from "next/dynamic";
import type { Polygon } from "geojson";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@harvverse-monorepo/ui/components/button";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@harvverse-monorepo/ui/components/tabs";

import PolygonFileUpload, { parsePolygonText } from "./polygon-file-upload";

const PolygonMap = dynamic(() => import("./polygon-map"), {
  ssr: false,
  loading: () => <LoadingMap />,
});

const FarmLotMap = dynamic(() => import("./farm-lot-map"), {
  ssr: false,
  loading: () => <LoadingMap />,
});

function LoadingMap() {
  const t = useTranslations("polygon");
  return (
    <div className="flex items-center justify-center h-[350px] rounded-lg bg-black/20 border border-white/10 text-gray-500 text-sm">
      {t("loading_map")}
    </div>
  );
}

interface ExistingLot {
  code: string | null;
  polygon: Polygon | null;
}

interface Props {
  value: Polygon | null;
  onChange: (polygon: Polygon | null) => void;
  onAreaCalculated?: (area: { hectares: number; manzanas: number } | null) => void;
  farmPolygon?: Polygon | null;
  existingLots?: ExistingLot[];
  mode?: "farm" | "lot";
  label?: string;
}

export default function PolygonInput({ 
  value, 
  onChange, 
  onAreaCalculated, 
  farmPolygon, 
  existingLots = [],
  mode = "farm",
  label 
}: Props) {
  const t = useTranslations("polygon");
  const [pasteValue, setPasteValue] = useState("");
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  function handlePolygonChange(p: Polygon | null) {
    onChange(p);
    if (!onAreaCalculated) return;
    if (!p) {
      onAreaCalculated(null);
      return;
    }
    const areaM2 = turfArea({ type: "Feature", geometry: p, properties: {} });
    const hectares = parseFloat((areaM2 / 10000).toFixed(2));
    const manzanas = parseFloat((hectares / 0.7).toFixed(2));
    onAreaCalculated({ hectares, manzanas });
  }

  function handlePasteImport() {
    setPasteError(null);
    setPasteMessage(null);
    try {
      const result = parsePolygonText(pasteValue, "auto");
      handlePolygonChange(result.polygon);
      setPasteMessage(t("paste_success", { count: result.uniquePoints }));
    } catch {
      setPasteError(t("paste_error"));
      handlePolygonChange(null);
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm text-white/80">{label}</p>
      )}
      <Tabs defaultValue="map">
        <TabsList className="mb-3">
          <TabsTrigger value="map">{t("draw_tab")}</TabsTrigger>
          <TabsTrigger value="upload">{t("upload_tab")}</TabsTrigger>
          <TabsTrigger value="paste">{t("paste_tab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          {mode === "lot" ? (
            <FarmLotMap
              farmPolygon={farmPolygon ?? null}
              existingLots={existingLots}
              onNewPolygon={handlePolygonChange}
              onAreaCalculated={onAreaCalculated ?? (() => {})}
            />
          ) : (
            <PolygonMap
              onPolygonChange={handlePolygonChange}
              initialPolygon={value ?? undefined}
              farmPolygon={farmPolygon ?? undefined}
            />
          )}
        </TabsContent>
        <TabsContent value="upload">
          <PolygonFileUpload
            onPolygonChange={handlePolygonChange}
          />
        </TabsContent>
        <TabsContent value="paste">
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
            <div>
              <p className="text-sm font-semibold text-white/80">{t("paste_title")}</p>
              <p className="mt-1 text-xs text-white/50">{t("paste_hint")}</p>
            </div>
            <textarea
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              className="harv-input min-h-40 w-full rounded-lg border p-3 font-mono text-xs"
              placeholder={t("paste_placeholder")}
              spellCheck={false}
            />
            {pasteError ? <p className="text-xs text-red-400">{pasteError}</p> : null}
            {pasteMessage ? <p className="text-xs text-primary">{pasteMessage}</p> : null}
            <Button
              type="button"
              className="bg-primary text-[#001020] hover:bg-primary/90"
              onClick={handlePasteImport}
              disabled={!pasteValue.trim()}
            >
              <ClipboardPaste className="mr-2 size-4" />
              {t("paste_button")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
