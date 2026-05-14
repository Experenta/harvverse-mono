"use client";

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
  farmPolygon?: Polygon;
  label?: string;
}

export default function PolygonInput({ value, onChange, farmPolygon, label }: Props) {
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
            onPolygonChange={onChange}
            initialPolygon={value ?? undefined}
            farmPolygon={farmPolygon}
          />
        </TabsContent>
        <TabsContent value="upload">
          <PolygonFileUpload
            onPolygonChange={onChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
