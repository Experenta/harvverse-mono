"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Polygon } from "geojson";
import {
  CircleMarker,
  MapContainer,
  Polygon as LeafletPolygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { Button } from "@harvverse-monorepo/ui/components/button";

interface Props {
  onPolygonChange: (polygon: Polygon | null) => void;
  initialPolygon?: Polygon;
  farmPolygon?: Polygon;
  className?: string;
  readOnly?: boolean;
}

// GeoJSON uses [lng, lat]; Leaflet uses [lat, lng]
function geoToLeaflet(ring: number[][]): [number, number][] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function leafletToGeo(points: [number, number][]): [number, number][] {
  return points.map(([lat, lng]) => [lng, lat]);
}

function ClickHandler({ onAdd }: { onAdd: (pt: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FitBounds({
  coords,
  fallback,
}: {
  coords: [number, number][];
  fallback?: [number, number][];
}) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current) {
      const toFit = coords.length > 0 ? coords : fallback;
      if (toFit && toFit.length > 0) {
        map.fitBounds(toFit, { padding: [30, 30] });
        fitted.current = true;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function PolygonMap({
  onPolygonChange,
  initialPolygon,
  farmPolygon,
  className,
  readOnly,
}: Props) {
  const [points, setPoints] = useState<[number, number][]>(() => {
    if (initialPolygon?.coordinates[0]) {
      // slice off the closing point (first === last in GeoJSON)
      const ring = initialPolygon.coordinates[0];
      return geoToLeaflet(ring.slice(0, -1));
    }
    return [];
  });

  useEffect(() => {
    if (points.length < 3) {
      onPolygonChange(null);
      return;
    }
    const geoRing = leafletToGeo(points);
    onPolygonChange({
      type: "Polygon",
      coordinates: [[...geoRing, geoRing[0]]],
    });
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  const farmLeaflet =
    farmPolygon?.coordinates[0] ? geoToLeaflet(farmPolygon.coordinates[0]) : undefined;

  const initialCenter: [number, number] = (() => {
    if (points.length > 0)
      return [
        points.reduce((s, p) => s + p[0], 0) / points.length,
        points.reduce((s, p) => s + p[1], 0) / points.length,
      ];
    if (farmLeaflet && farmLeaflet.length > 0)
      return [
        farmLeaflet.reduce((s, p) => s + p[0], 0) / farmLeaflet.length,
        farmLeaflet.reduce((s, p) => s + p[1], 0) / farmLeaflet.length,
      ];
    return [14.45, -87.61];
  })();

  return (
    <div className={className}>
      <MapContainer
        center={initialCenter}
        zoom={10}
        style={{ height: "350px", width: "100%" }}
        className="rounded-lg z-0"
      >
        <TileLayer
          attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {farmLeaflet && (
          <LeafletPolygon
            positions={farmLeaflet}
            pathOptions={{
              color: "#4a9eff",
              fillColor: "#4a9eff",
              fillOpacity: 0.08,
              weight: 2,
              dashArray: "6 4",
            }}
          />
        )}
        {!readOnly && (
          <ClickHandler onAdd={(pt) => setPoints((prev) => [...prev, pt])} />
        )}
        {points.length >= 2 && (
          <LeafletPolygon
            positions={[...points, points[0]]}
            pathOptions={{
              color: "#39FF14",
              fillColor: "#39FF14",
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        )}
        {points.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={5}
            pathOptions={{
              color: "#39FF14",
              fillColor: "#39FF14",
              fillOpacity: 1,
              weight: 1,
            }}
          />
        ))}
        <FitBounds coords={points} fallback={farmLeaflet} />
      </MapContainer>

      {!readOnly && (
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-gray-400">{points.length} points selected</span>
          {points.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPoints([])}
              className="text-gray-400 h-7 px-2 hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
