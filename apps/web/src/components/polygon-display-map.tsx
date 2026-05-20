"use client";

import "leaflet/dist/leaflet.css";
import type { Polygon } from "geojson";
import { MapContainer, Polygon as LeafletPolygon, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

interface Props {
  polygon: Polygon;
  className?: string;
  color?: string;
  fillOpacity?: number;
}

function geoToLeaflet(coords: number[][]): LatLngExpression[] {
  return coords.map((c) => [c[1] ?? 0, c[0] ?? 0] as LatLngExpression);
}

function FitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions as LatLngBoundsExpression, { padding: [16, 16] });
    }
  }, [map, positions]);
  return null;
}

export default function PolygonDisplayMap({
  polygon,
  className,
  color = "#93d832",
  fillOpacity = 0.3,
}: Props) {
  const outerRing = polygon.coordinates[0] ?? [];
  const positions = geoToLeaflet(outerRing);

  return (
    <div className={className} style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={[0, 0]}
        zoom={13}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        />
        <LeafletPolygon
          positions={positions}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity,
            weight: 2,
          }}
        />
        <FitBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
