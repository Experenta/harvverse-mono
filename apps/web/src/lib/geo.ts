import type { Polygon } from "geojson";

// 1 Honduran manzana = 6987.2 m²
const MANZANA_SQ_METERS = 6987.2;

export function polygonAreaManzanas(polygon: Polygon): number {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return 0;
  const pts = ring.slice(0, -1);
  if (pts.length < 3) return 0;

  const latRef = pts.reduce((s, c) => s + (c[1] ?? 0), 0) / pts.length;
  const latScale = 111320;
  const lngScale = 111320 * Math.cos((latRef * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [lng1, lat1] = pts[i]!;
    const [lng2, lat2] = pts[(i + 1) % pts.length]!;
    area +=
      lng1! * lngScale * (lat2! * latScale) -
      lng2! * lngScale * (lat1! * latScale);
  }

  return Math.abs(area) / 2 / MANZANA_SQ_METERS;
}

export function polygonCentroid(polygon: Polygon): { lat: number; lng: number } {
  const ring = polygon.coordinates[0]!;
  const pts = ring.slice(0, -1);
  const lat = pts.reduce((s, c) => s + (c[1] ?? 0), 0) / pts.length;
  const lng = pts.reduce((s, c) => s + (c[0] ?? 0), 0) / pts.length;
  return { lat, lng };
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ri_lng, ri_lat] = ring[i]!;
    const [rj_lng, rj_lat] = ring[j]!;
    if (
      (ri_lat! > lat) !== (rj_lat! > lat) &&
      lng <
        ((rj_lng! - ri_lng!) * (lat - ri_lat!)) / (rj_lat! - ri_lat!) +
          ri_lng!
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Vertex-only check: warns if any lot corner falls outside the farm boundary.
// Does not detect edge bulges on concave farms — use as a soft warning only.
export function polygonContainedIn(lot: Polygon, farm: Polygon): boolean {
  const farmRing = farm.coordinates[0]!;
  return lot.coordinates[0]!
    .slice(0, -1)
    .every(([lng, lat]) => pointInRing(lng!, lat!, farmRing));
}
