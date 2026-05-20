"use client";

import "leaflet/dist/leaflet.css";
import { area as turfArea } from "@turf/area";
import type { Polygon } from "geojson";
import { divIcon } from "leaflet";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon as LeafletPolygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useTranslations } from "next-intl";

import { Button } from "@harvverse-monorepo/ui/components/button";

interface ExistingLot {
  code: string | null;
  polygon: Polygon | null;
}

interface Props {
  farmPolygon: Polygon | null;
  existingLots: ExistingLot[];
  onNewPolygon: (polygon: Polygon | null) => void;
  onAreaCalculated: (area: { hectares: number; manzanas: number } | null) => void;
}

function geoToLeaflet(ring: number[][]): [number, number][] {
  return ring.map(([lng, lat]) => [lat ?? 0, lng ?? 0]);
}

function leafletToGeo(points: [number, number][]): [number, number][] {
  return points.map(([lat, lng]) => [lng, lat]);
}

function centroid(points: [number, number][]): [number, number] {
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function ClickHandler({ onAdd }: { onAdd: (pt: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FitBounds({ rings }: { rings: [number, number][][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const points = rings.flat();
    if (points.length > 0) {
      map.fitBounds(points, { padding: [32, 32] });
      fitted.current = true;
    }
  }, [map, rings]);

  return null;
}

export default function FarmLotMap({
  farmPolygon,
  existingLots,
  onNewPolygon,
  onAreaCalculated,
}: Props) {
  const t = useTranslations("lot");
  const [points, setPoints] = useState<[number, number][]>([]);

  const farmRing = useMemo(
    () => (farmPolygon?.coordinates[0] ? geoToLeaflet(farmPolygon.coordinates[0]) : null),
    [farmPolygon],
  );

  const existingRings = useMemo(
    () =>
      existingLots
        .map((lot) => ({
          code: lot.code,
          ring: lot.polygon?.coordinates[0]
            ? geoToLeaflet(lot.polygon.coordinates[0])
            : null,
        }))
        .filter((lot): lot is { code: string | null; ring: [number, number][] } => !!lot.ring),
    [existingLots],
  );

  useEffect(() => {
    if (points.length < 3) {
      onNewPolygon(null);
      onAreaCalculated(null);
      return;
    }

    const geoRing = leafletToGeo(points);
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [[...geoRing, geoRing[0]!]],
    };
    onNewPolygon(polygon);

    const areaM2 = turfArea({ type: "Feature", geometry: polygon, properties: {} });
    const hectares = parseFloat((areaM2 / 10000).toFixed(2));
    const manzanas = parseFloat((hectares / 0.7).toFixed(2));
    onAreaCalculated({ hectares, manzanas });
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  const initialCenter = (() => {
    if (farmRing && farmRing.length > 0) return centroid(farmRing);
    const firstExisting = existingRings[0]?.ring;
    if (firstExisting && firstExisting.length > 0) return centroid(firstExisting);
    return [14.45, -87.61] as [number, number];
  })();

  const labelIcon = (label: string) =>
    divIcon({
      className: "",
      html: `<span style="display:inline-flex;align-items:center;border:1px solid rgba(103,185,193,.55);background:rgba(0,16,32,.82);color:#67B9C1;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(label)}</span>`,
    });

  return (
    <div>
      <MapContainer
        center={initialCenter}
        zoom={15}
        style={{ height: "390px", width: "100%" }}
        className="z-0 rounded-lg"
      >
        <TileLayer
          attribution='Tiles &copy; Esri - Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ClickHandler onAdd={(pt) => setPoints((prev) => [...prev, pt])} />

        {farmRing ? (
          <LeafletPolygon
            positions={farmRing}
            pathOptions={{
              color: "#93D832",
              fillColor: "#93D832",
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        ) : null}

        {existingRings.map((lot, index) => (
          <Fragment key={`${lot.code ?? "lot"}-${index}`}>
            <LeafletPolygon
              positions={lot.ring}
              pathOptions={{
                color: "#67B9C1",
                fillColor: "#67B9C1",
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
            <Marker position={centroid(lot.ring)} icon={labelIcon(lot.code ?? `Lot ${index + 1}`)} />
          </Fragment>
        ))}

        {points.length >= 2 ? (
          <LeafletPolygon
            positions={points.length >= 3 ? [...points, points[0]!] : points}
            pathOptions={{
              color: "#F8D568",
              fillColor: "#F8D568",
              fillOpacity: points.length >= 3 ? 0.08 : 0,
              weight: 3,
              dashArray: "6 4",
            }}
          />
        ) : null}

        {points.map((point, index) => (
          <CircleMarker
            key={`${point[0]}-${point[1]}-${index}`}
            center={point}
            radius={5}
            pathOptions={{
              color: "#EEEEEE",
              fillColor: "#F8D568",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}

        <FitBounds
          rings={[
            ...(farmRing ? [farmRing] : []),
            ...existingRings.map((lot) => lot.ring),
          ]}
        />
      </MapContainer>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" />
            {t("map_farm_boundary")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#67B9C1]" />
            {t("map_existing_lots")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#F8D568]" />
            {t("map_new_lot")}
          </span>
        </div>
        {points.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-white/60 hover:text-white"
            onClick={() => setPoints([])}
          >
            {t("clear_new_lot")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
