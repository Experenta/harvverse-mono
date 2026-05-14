import { createHash } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NdviMonth {
  date: string;       // YYYY-MM
  mean: number | null;
}

export interface ClimateMonth {
  date: string;       // YYYY-MM
  precipMm: number;
  tempC: number;
}

export interface ScoreBreakdown {
  ndviAvg: number | null;       // null when Sentinel Hub not configured
  ndviStability: number | null; // null when Sentinel Hub not configured
  annualPrecip: number;
  rainDistrib: number;
  temperature: number;
  eudr: number;
  total: number;
}

export interface RiskScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  hash: string;
  ndviMonths: NdviMonth[];
  climateMonths: ClimateMonth[];
  hasSentinel: boolean;
}

// ── Sentinel Hub ──────────────────────────────────────────────────────────────

const SH_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SH_STATS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";

// Evalscript validated in test_copernicus.py
const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  return {
    ndvi: [(s.B08 - s.B04) / (s.B08 + s.B04)],
    dataMask: [s.dataMask]
  };
}`;

export async function getSentinelToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(SH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(
      `Sentinel Hub auth failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

const DEM_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["DEM"], output: { bands: 1 } };
}
function evaluatePixel(s) {
  return [s.DEM];
}`;

export async function getAltitudeFromDem(
  token: string,
  lat: number,
  lng: number,
): Promise<number | null> {
  try {
    const payload = {
      input: {
        bounds: {
          bbox: [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
        },
        data: [{ type: "dem" }],
      },
      aggregation: {
        timeRange: {
          from: "2020-01-01T00:00:00Z",
          to: "2020-01-02T00:00:00Z",
        },
        aggregationInterval: { of: "P1D" },
        evalscript: DEM_EVALSCRIPT,
        width: 512,
        height: 512,
      },
    };

    const res = await fetch(SH_STATS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;

    type SHDemResponse = {
      data?: Array<{
        outputs?: {
          default?: {
            bands?: Record<string, { stats?: { mean?: number | null } }>;
          };
        };
      }>;
    };
    const data = (await res.json()) as SHDemResponse;
    const bands = data.data?.[0]?.outputs?.default?.bands ?? {};
    const mean = Object.values(bands)[0]?.stats?.mean ?? null;
    return typeof mean === "number" ? Math.round(mean) : null;
  } catch {
    return null;
  }
}

// Free fallback: Open-Meteo elevation endpoint (Copernicus DEM GLO-90, no credentials needed)
export async function getAltitudeFromOpenMeteo(
  lat: number,
  lng: number,
): Promise<number | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.searchParams.set("latitude", lat.toFixed(6));
    url.searchParams.set("longitude", lng.toFixed(6));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: (number | null)[] };
    const elevation = data.elevation?.[0] ?? null;
    return typeof elevation === "number" ? Math.round(elevation) : null;
  } catch {
    return null;
  }
}

export function computePolygonCentroid(polygon: {
  coordinates: number[][][];
}): { lat: number; lng: number } {
  // Exclude closing point (GeoJSON closed ring: first === last)
  const ring = (polygon.coordinates[0] ?? []).slice(0, -1);
  if (ring.length === 0) return { lat: 0, lng: 0 };
  const lngSum = ring.reduce((s, c) => s + (c[0] ?? 0), 0);
  const latSum = ring.reduce((s, c) => s + (c[1] ?? 0), 0);
  return { lat: latSum / ring.length, lng: lngSum / ring.length };
}

export function bboxFromPolygon(
  polygon: { coordinates: number[][][] },
  bufferPercent = 0.1,
): [number, number, number, number] {
  const ring = polygon.coordinates[0] ?? [];
  let lonMin = Infinity, latMin = Infinity, lonMax = -Infinity, latMax = -Infinity;
  for (const point of ring) {
    const lon = point[0] ?? 0;
    const lat = point[1] ?? 0;
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  }
  // Apply proportional buffer
  const lonRange = lonMax - lonMin;
  const latRange = latMax - latMin;
  lonMin -= lonRange * bufferPercent;
  lonMax += lonRange * bufferPercent;
  latMin -= latRange * bufferPercent;
  latMax += latRange * bufferPercent;
  // Enforce minimum 0.05° in each dimension, centered on midpoint
  const MIN = 0.05;
  const lonCenter = (lonMin + lonMax) / 2;
  const latCenter = (latMin + latMax) / 2;
  if (lonMax - lonMin < MIN) {
    lonMin = lonCenter - MIN / 2;
    lonMax = lonCenter + MIN / 2;
  }
  if (latMax - latMin < MIN) {
    latMin = latCenter - MIN / 2;
    latMax = latCenter + MIN / 2;
  }
  return [lonMin, latMin, lonMax, latMax];
}

async function fetchNdviStats(
  token: string,
  bbox: [number, number, number, number],
  months: number,
): Promise<NdviMonth[]> {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const payload = {
    input: {
      bounds: {
        bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: { mosaickingOrder: "leastCC" },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: `${start.toISOString().split("T")[0]}T00:00:00Z`,
        to: `${end.toISOString().split("T")[0]}T00:00:00Z`,
      },
      aggregationInterval: { of: "P1M" },
      evalscript: NDVI_EVALSCRIPT,
      width: 512,
      height: 512,
    },
  };

  const res = await fetch(SH_STATS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `Sentinel Hub stats failed: ${res.status} ${await res.text()}`,
    );
  }

  type SHResponse = {
    data?: Array<{
      interval: { from: string };
      outputs?: {
        ndvi?: {
          bands?: Record<string, { stats?: { mean?: number | null } }>;
        };
      };
    }>;
  };
  const data = (await res.json()) as SHResponse;

  return (data.data ?? []).map((interval) => {
    const date = interval.interval.from.slice(0, 7);
    const bands = interval.outputs?.ndvi?.bands ?? {};
    const band = Object.values(bands)[0];
    const mean = band?.stats?.mean ?? null;
    return { date, mean };
  });
}

// ── ERA5 via Open-Meteo archive (daily → monthly aggregation) ─────────────────
// Note: CDS API + netcdf4 would give identical ERA5 data but requires native
// HDF5 bindings. Open-Meteo serves the same ERA5 reanalysis in JSON.

async function fetchOpenMeteoClimate(
  lat: number,
  lng: number,
  months: number,
): Promise<ClimateMonth[]> {
  const now = new Date();
  // End: last day of the previous completed month
  const endObj = new Date(now.getFullYear(), now.getMonth(), 0);
  // Start: first day, `months` months before
  const startObj = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("start_date", fmt(startObj));
  url.searchParams.set("end_date", fmt(endObj));
  url.searchParams.set(
    "daily",
    "precipitation_sum,temperature_2m_mean",
  );
  url.searchParams.set("timezone", "UTC");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo failed: ${res.status} ${await res.text()}`);
  }

  type OMResponse = {
    daily?: {
      time?: string[];
      precipitation_sum?: (number | null)[];
      temperature_2m_mean?: (number | null)[];
    };
  };
  const data = (await res.json()) as OMResponse;

  const times = data.daily?.time ?? [];
  const precip = data.daily?.precipitation_sum ?? [];
  const temp = data.daily?.temperature_2m_mean ?? [];

  // Aggregate daily → monthly
  const byMonth = new Map<
    string,
    { year: number; month: number; precipSum: number; tempSum: number; count: number }
  >();
  for (let i = 0; i < times.length; i++) {
    const parts = (times[i] ?? "").split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const rec = byMonth.get(key) ?? {
      year,
      month,
      precipSum: 0,
      tempSum: 0,
      count: 0,
    };
    rec.precipSum += precip[i] ?? 0;
    if (temp[i] != null) {
      rec.tempSum += temp[i] as number;
      rec.count++;
    }
    byMonth.set(key, rec);
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((r) => ({
      date: `${r.year}-${String(r.month).padStart(2, "0")}`,
      precipMm: r.precipSum,
      tempC: r.count > 0 ? r.tempSum / r.count : 0,
    }));
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function lerp(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  return y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), 0, 1);
}

// Continuous: 0→0.3 = 0, 0.3→0.5 = 0–100, ≥0.5 = 100 (per user spec confirmation)
function scoreNdviAvg(avg: number): number {
  if (avg < 0.3) return 0;
  if (avg <= 0.5) return lerp(avg, 0.3, 0.5, 0, 100);
  return 100;
}

function scoreNdviStability(values: number[]): number {
  if (values.length < 2) return 50;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 50;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  // Low CV = stable = good. Thresholds: <0.05 = 100, >0.3 = 0
  if (cv <= 0.05) return 100;
  if (cv >= 0.3) return 0;
  return lerp(cv, 0.05, 0.3, 100, 0);
}

// Optimal coffee precip: 1500–2000 mm/yr. Thresholds are author's judgment.
function scoreAnnualPrecip(annualMm: number): number {
  if (annualMm < 1000) return 0;
  if (annualMm <= 1500) return lerp(annualMm, 1000, 1500, 0, 100);
  if (annualMm <= 2000) return 100;
  if (annualMm <= 2500) return lerp(annualMm, 2000, 2500, 100, 0);
  return 0;
}

// Ideal: 1–4 months with <60 mm (dry season enables coffee flowering).
// Threshold count bands are author's judgment.
function scoreRainDistrib(months: ClimateMonth[]): number {
  const dryCount = months.filter((m) => m.precipMm < 60).length;
  if (dryCount === 0) return 30;
  if (dryCount <= 4) return 100;
  if (dryCount <= 7) return lerp(dryCount, 4, 7, 100, 40);
  return lerp(dryCount, 7, 12, 40, 0);
}

// Optimal coffee temperature: 18–22 °C. Thresholds are author's judgment.
function scoreTemperature(avgC: number): number {
  if (avgC < 15) return 0;
  if (avgC <= 18) return lerp(avgC, 15, 18, 0, 100);
  if (avgC <= 22) return 100;
  if (avgC <= 25) return lerp(avgC, 22, 25, 100, 0);
  return 0;
}

function scoreEudr(eudrCompliant: boolean | null): number {
  if (eudrCompliant === true) return 100;
  if (eudrCompliant === false) return 0;
  return 50; // unknown / not yet assessed
}

// ── Main ──────────────────────────────────────────────────────────────────────

const BASE_WEIGHTS = {
  ndviAvg: 20,
  ndviStability: 10,
  annualPrecip: 15,
  rainDistrib: 15,
  temperature: 10,
  eudr: 20,
  // soil moisture (10%) excluded: sensor_data has no FK to lots/farms.
  // Add a lot→module linkage to enable it.
} as const;

export async function computeRiskScore(params: {
  lat: number;
  lng: number;
  eudrCompliant: boolean | null;
  sentinelClientId?: string;
  sentinelClientSecret?: string;
  polygon?: { coordinates: number[][][] } | null;
}): Promise<RiskScoreResult> {
  const MONTHS = 24;

  // Resolve sentinel bbox and climate point from polygon or GPS coordinates
  const sentinelBbox: [number, number, number, number] = params.polygon
    ? bboxFromPolygon(params.polygon)
    : [params.lng - 0.05, params.lat - 0.05, params.lng + 0.05, params.lat + 0.05];
  const { lat: climateLat, lng: climateLng } = params.polygon
    ? computePolygonCentroid(params.polygon)
    : { lat: params.lat, lng: params.lng };

  // ── NDVI ──────────────────────────────────────────────────────────────────
  let ndviMonths: NdviMonth[] = [];
  let hasSentinel = false;

  if (params.sentinelClientId && params.sentinelClientSecret) {
    try {
      const token = await getSentinelToken(
        params.sentinelClientId,
        params.sentinelClientSecret,
      );
      ndviMonths = await fetchNdviStats(token, sentinelBbox, MONTHS);
      hasSentinel = true;
    } catch (err) {
      // Credentials set but API call failed → continue without NDVI
      console.error("[copernicus] Sentinel Hub error:", err);
    }
  }

  // ── Climate (ERA5 via Open-Meteo) ──────────────────────────────────────────
  const climateMonths = await fetchOpenMeteoClimate(climateLat, climateLng, MONTHS);

  // ── Individual scores ──────────────────────────────────────────────────────
  const validNdvi = ndviMonths
    .filter((m) => m.mean != null)
    .map((m) => m.mean as number);
  const avgNdvi =
    validNdvi.length > 0
      ? validNdvi.reduce((a, b) => a + b, 0) / validNdvi.length
      : 0;

  const annualPrecip =
    climateMonths.length > 0
      ? (climateMonths.reduce((s, m) => s + m.precipMm, 0) /
          climateMonths.length) *
        12
      : 0;
  const avgTemp =
    climateMonths.length > 0
      ? climateMonths.reduce((s, m) => s + m.tempC, 0) / climateMonths.length
      : 0;

  const ndviAvgScore = hasSentinel ? scoreNdviAvg(avgNdvi) : null;
  const ndviStabScore = hasSentinel ? scoreNdviStability(validNdvi) : null;

  const breakdown: ScoreBreakdown = {
    ndviAvg: ndviAvgScore,
    ndviStability: ndviStabScore,
    annualPrecip: scoreAnnualPrecip(annualPrecip),
    rainDistrib: scoreRainDistrib(climateMonths),
    temperature: scoreTemperature(avgTemp),
    eudr: scoreEudr(params.eudrCompliant),
    total: 0,
  };

  // Weighted total — re-normalises automatically if NDVI is absent
  const components: Array<{ score: number; weight: number }> = [
    { score: breakdown.annualPrecip, weight: BASE_WEIGHTS.annualPrecip },
    { score: breakdown.rainDistrib, weight: BASE_WEIGHTS.rainDistrib },
    { score: breakdown.temperature, weight: BASE_WEIGHTS.temperature },
    { score: breakdown.eudr, weight: BASE_WEIGHTS.eudr },
  ];
  if (hasSentinel) {
    components.push(
      { score: ndviAvgScore!, weight: BASE_WEIGHTS.ndviAvg },
      { score: ndviStabScore!, weight: BASE_WEIGHTS.ndviStability },
    );
  }
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  breakdown.total = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight,
  );

  // ── Score hash (verifiable fingerprint of inputs) ──────────────────────────
  const hashInput = JSON.stringify({
    lat: Number(params.lat.toFixed(4)),
    lng: Number(params.lng.toFixed(4)),
    sentinelBbox: sentinelBbox.map((v) => Number(v.toFixed(6))),
    months: MONTHS,
    ndviMonths: ndviMonths.map((m) => ({
      date: m.date,
      mean: m.mean != null ? Number(m.mean.toFixed(4)) : null,
    })),
    climateMonths: climateMonths.map((m) => ({
      date: m.date,
      precipMm: Number(m.precipMm.toFixed(2)),
      tempC: Number(m.tempC.toFixed(2)),
    })),
    eudrCompliant: params.eudrCompliant,
  });
  const hash = createHash("sha256").update(hashInput).digest("hex");

  return {
    score: breakdown.total,
    breakdown,
    hash,
    ndviMonths,
    climateMonths,
    hasSentinel,
  };
}
