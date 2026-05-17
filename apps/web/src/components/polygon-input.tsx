"use client";

import { area as turfArea } from "@turf/area";
import dynamic from "next/dynamic";
import type { Polygon } from "geojson";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@harvverse-monorepo/ui/components/tabs";

import PolygonFileUpload from "./polygon-file-upload";

const PolygonMap = dynamic(() => import("./polygon-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[350px] rounded-lg bg-black/20 border border-white/10 text-gray-500 text-sm">
      Loading map…
    </div>
  ),
});

interface Props {
  value: Polygon | null;
  onChange: (polygon: Polygon | null) => void;
  onAreaCalculated?: (area: { hectares: number; manzanas: number } | null) => void;
  farmPolygon?: Polygon;
  label?: string;
}

export default function PolygonInput({ value, onChange, onAreaCalculated, farmPolygon, label }: Props) {
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

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm text-white/80">{label}</p>
      )}
      <Tabs defaultValue="map">
        <TabsList className="mb-3">
          <TabsTrigger value="map">Draw on map</TabsTrigger>
          <TabsTrigger value="upload">Upload file</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          <PolygonMap
            onPolygonChange={handlePolygonChange}
            initialPolygon={value ?? undefined}
            farmPolygon={farmPolygon}
          />
        </TabsContent>
        <TabsContent value="upload">
          <PolygonFileUpload
            onPolygonChange={handlePolygonChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
