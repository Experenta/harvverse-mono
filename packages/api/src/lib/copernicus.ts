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
  eudrCompliant: boolean | null;
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

// ── ERA5 via Open-Meteo archive (daily → manual monthly aggregation) ──────────
// The archive API's &monthly= aggregation only accepts a narrow set of
// ForecastVariableMonthly enum values — precipitation_sum and rain_sum are
// both rejected. We use &daily= instead and aggregate per month ourselves.
// daily precipitation_sum is mm/day; summing per month gives correct totals.

async function fetchOpenMeteoClimate(
  lat: number,
  lng: number,
  months: number,
): Promise<ClimateMonth[]> {
  const now = new Date();
  // End: last day of the most recent completed month
  const endObj = new Date(now.getFullYear(), now.getMonth(), 0);
  // Start: first day, `months` months before end month
  const startObj = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Build URL manually to keep commas literal (searchParams would URL-encode them)
  const rawUrl =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat.toFixed(4)}` +
    `&longitude=${lng.toFixed(4)}` +
    `&start_date=${fmt(startObj)}` +
    `&end_date=${fmt(endObj)}` +
    `&daily=precipitation_sum,temperature_2m_mean` +
    `&timezone=UTC`;

  const res = await fetch(rawUrl);
  if (!res.ok) {
    throw new Error(`Open-Meteo failed: ${res.status} ${await res.text()}`);
  }

  type OMDailyResponse = {
    daily?: {
      time?: string[];
      precipitation_sum?: (number | null)[];
      temperature_2m_mean?: (number | null)[];
    };
  };
  const data = (await res.json()) as OMDailyResponse;

  const times = data.daily?.time ?? [];
  const precipDaily = data.daily?.precipitation_sum ?? [];
  const tempDaily = data.daily?.temperature_2m_mean ?? [];

  // Aggregate daily rows into calendar months
  const monthMap = new Map<string, { precipMm: number; tempSum: number; tempCount: number }>();
  for (let i = 0; i < times.length; i++) {
    const month = (times[i] ?? "").slice(0, 7); // "YYYY-MM"
    if (month.length !== 7) continue;
    const entry = monthMap.get(month) ?? { precipMm: 0, tempSum: 0, tempCount: 0 };
    entry.precipMm += precipDaily[i] ?? 0;
    const t = tempDaily[i];
    if (t != null) { entry.tempSum += t; entry.tempCount++; }
    monthMap.set(month, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { precipMm, tempSum, tempCount }]) => ({
      date,
      precipMm,
      tempC: tempCount > 0 ? tempSum / tempCount : 0,
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
  // Filter out cloud/shadow artifacts — NDVI < 0.2 are not real vegetation readings
  const clean = values.filter((v) => v >= 0.2);
  if (clean.length < 6) return 50;
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  if (mean === 0) return 50;
  const variance = clean.reduce((s, v) => s + (v - mean) ** 2, 0) / clean.length;
  const cv = Math.sqrt(variance) / mean;
  // Low CV = stable = good. Thresholds: <0.05 = 100, >0.3 = 0
  if (cv <= 0.05) return 100;
  if (cv >= 0.3) return 0;
  return lerp(cv, 0.05, 0.3, 100, 0);
}

// Optimal coffee precip: 1500–2000 mm/yr. Extended upper range for high-altitude
// specialty regions (Honduras highlands can reach 2,500–3,000 mm and still excel).
function scoreAnnualPrecip(annualMm: number): number {
  if (annualMm < 800) return 0;
  if (annualMm <= 1200) return lerp(annualMm, 800, 1200, 0, 60);
  if (annualMm <= 1500) return lerp(annualMm, 1200, 1500, 60, 85);
  if (annualMm <= 2000) return 100;
  if (annualMm <= 2500) return lerp(annualMm, 2000, 2500, 100, 70);
  if (annualMm <= 3000) return lerp(annualMm, 2500, 3000, 70, 40);
  if (annualMm <= 3500) return lerp(annualMm, 3000, 3500, 40, 20);
  return 0;
}

// Coffee needs a bimodal rainfall pattern: a pronounced dry season (allows
// flowering) and a pronounced rainy season (drives bean development).
// Thresholds are calibrated on Central American highland coffee regions.
function scoreRainDistrib(months: ClimateMonth[]): number {
  // Rainy season: 4+ months above 150 mm
  const hasRainySeason = months.filter((m) => m.precipMm > 150).length >= 4;

  // Dry season: 2+ consecutive months below 100 mm
  let maxConsecutiveDry = 0;
  let run = 0;
  for (const m of months) {
    if (m.precipMm < 100) {
      run++;
      if (run > maxConsecutiveDry) maxConsecutiveDry = run;
    } else {
      run = 0;
    }
  }
  const hasDrySeason = maxConsecutiveDry >= 2;

  if (hasDrySeason && hasRainySeason) return 100;
  if (hasDrySeason || hasRainySeason) return 60;
  return 20;
}

// Optimal coffee temperature: 18–22 °C. High-altitude specialty coffee benefits
// from cooler temps (slower maturation → better cup profile).
function scoreTemperature(avgC: number): number {
  if (avgC < 12) return 0;
  if (avgC <= 15) return lerp(avgC, 12, 15, 0, 50);  // cold but viable for specialty
  if (avgC <= 18) return 80;                           // good for specialty, slower maturation
  if (avgC <= 22) return 100;                          // optimal
  if (avgC <= 24) return 85;                           // warm but acceptable
  if (avgC <= 26) return lerp(avgC, 24, 26, 85, 60); // marginal
  return 20;
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

  // Infer EUDR compliance from NDVI if not explicitly set and Sentinel data is available
  let effectiveEudr = params.eudrCompliant;
  if (effectiveEudr === null && hasSentinel && validNdvi.length > 0) {
    if (avgNdvi >= 0.5) effectiveEudr = true;
    else if (avgNdvi < 0.3) effectiveEudr = false;
  }

  const breakdown: ScoreBreakdown = {
    ndviAvg: ndviAvgScore,
    ndviStability: ndviStabScore,
    annualPrecip: scoreAnnualPrecip(annualPrecip),
    rainDistrib: scoreRainDistrib(climateMonths),
    temperature: scoreTemperature(avgTemp),
    eudr: scoreEudr(effectiveEudr),
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
    eudrCompliant: effectiveEudr,
  });
  const hash = createHash("sha256").update(hashInput).digest("hex");

  return {
    score: breakdown.total,
    breakdown,
    hash,
    ndviMonths,
    climateMonths,
    hasSentinel,
    eudrCompliant: effectiveEudr,
  };
}
