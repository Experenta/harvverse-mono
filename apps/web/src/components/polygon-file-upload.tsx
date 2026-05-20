"use client";

import { useRef, useState } from "react";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { kml } from "@tmcw/togeojson";
import { Upload } from "lucide-react";

interface Props {
  onPolygonChange: (polygon: Polygon | null) => void;
  className?: string;
}

export function extractPolygon(fc: FeatureCollection): Polygon | null {
  for (const feature of fc.features) {
    if (!feature.geometry) continue;
    if (feature.geometry.type === "Polygon") return feature.geometry as Polygon;
    if (feature.geometry.type === "MultiPolygon") {
      const mp = feature.geometry as MultiPolygon;
      return { type: "Polygon", coordinates: mp.coordinates[0] };
    }
  }
  return null;
}

function polygonPointCount(polygon: Polygon) {
  const outerRing = polygon.coordinates[0] ?? [];
  return Math.max(0, outerRing.length - 1);
}

export function parsePolygonText(text: string, format: "auto" | "kml" | "json" = "auto") {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("empty");
  }
  if (trimmed.length > 1_000_000) {
    throw new Error("too_large");
  }

  const looksLikeXml = trimmed.startsWith("<");
  const shouldParseKml = format === "kml" || (format === "auto" && looksLikeXml);
  let polygon: Polygon | null = null;

  if (shouldParseKml) {
    const doc = new DOMParser().parseFromString(trimmed, "text/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error("invalid_kml");
    }
    const fc = kml(doc) as FeatureCollection;
    polygon = extractPolygon(fc);
  } else {
    const json = JSON.parse(trimmed) as unknown;
    if (
      json !== null &&
      typeof json === "object" &&
      "type" in json
    ) {
      const typed = json as { type: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown };
      if (typed.type === "FeatureCollection") {
        polygon = extractPolygon(json as FeatureCollection);
      } else if (typed.type === "Feature" && typed.geometry) {
        const geom = typed.geometry as { type: string; coordinates: unknown };
        if (geom.type === "Polygon") polygon = geom as unknown as Polygon;
        else if (geom.type === "MultiPolygon") {
          const mp = geom as unknown as MultiPolygon;
          polygon = { type: "Polygon", coordinates: mp.coordinates[0] };
        }
      } else if (typed.type === "Polygon") {
        polygon = json as unknown as Polygon;
      } else if (typed.type === "MultiPolygon") {
        const mp = json as unknown as MultiPolygon;
        polygon = { type: "Polygon", coordinates: mp.coordinates[0] };
      }
    }
  }

  if (!polygon) {
    throw new Error("no_polygon");
  }
  const uniquePoints = polygonPointCount(polygon);
  if (uniquePoints < 3) {
    throw new Error("too_few_points");
  }
  return { polygon, uniquePoints };
}

export default function PolygonFileUpload({
  onPolygonChange,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setError(null);
    setFilename(file.name);
    setPointCount(null);

    try {
      const text = await file.text();
      let polygon: Polygon | null = null;
      let uniquePoints = 0;

      if (file.name.toLowerCase().endsWith(".kml")) {
        const result = parsePolygonText(text, "kml");
        polygon = result.polygon;
        uniquePoints = result.uniquePoints;
      } else {
        const result = parsePolygonText(text, "json");
        polygon = result.polygon;
        uniquePoints = result.uniquePoints;
      }

      if (!polygon) {
        setError("No polygon found in this file.");
        onPolygonChange(null);
        return;
      }

      setPointCount(uniquePoints);
      onPolygonChange(polygon);
    } catch {
      setError("Failed to parse file. Make sure it is valid GeoJSON or KML.");
      onPolygonChange(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
          dragging
            ? "border-primary/60 bg-primary/10"
            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30",
        ].join(" ")}
      >
        {filename && pointCount !== null ? (
          <>
            <Upload className="w-6 h-6 text-primary" />
            <div className="text-center">
              <p className="text-sm text-white font-medium">{filename}</p>
              <p className="text-xs text-gray-400 mt-1">{pointCount} points loaded</p>
            </div>
            <p className="text-xs text-gray-500">Click to replace</p>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-500" />
            <div className="text-center">
              <p className="text-sm text-white/70">Drop a file here or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">Supports .geojson, .json, .kml</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,.kml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
