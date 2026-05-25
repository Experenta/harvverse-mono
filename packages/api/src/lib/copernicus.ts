import { createHash } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NdviMonth {
  date: string;       // YYYY-MM
  mean: number | null;
  validPixelCoverage: number | null;
  cloudCoverage: number | null;
}

export interface ClimateMonth {
  date: string;       // YYYY-MM
  precipMm: number;
  tempC: number;
  daysOver100Mm: number;
}

export interface QuarterlyNdviMetric {
  quarter: string;
  mean: number | null;
  validPixelCoverage: number | null;
  deltaFromPrevious: number | null;
  anomaly: "none" | "drop" | "increase" | "insufficient_data";
}

export interface ClimateTrendMetrics {
  provider: "open_meteo_archive";
  providerLabel: string;
  precipitationTrendMmPerYear: number | null;
  daysOver100Mm: number;
  averageAnnualPrecipMm: number | null;
  averageTempC: number | null;
  waterStressLabel: "low" | "medium" | "high" | "unknown";
  confidence: EvidenceConfidence;
}

export interface TerrainMetrics {
  provider: "copernicus_dem_glo30" | "open_meteo_elevation_fallback" | "unavailable";
  providerLabel: string;
  elevationMasl: number | null;
  slopeDegrees: number | null;
  aspectDegrees: number | null;
  terrainRisk: "low" | "medium" | "high" | "unknown";
  confidence: EvidenceConfidence;
  limitations: string[];
}

export interface Sentinel1Metrics {
  provider: "sentinel_1_grd" | "not_configured";
  vvQuarterly: Array<{ quarter: string; mean: number | null }>;
  vhQuarterly: Array<{ quarter: string; mean: number | null }>;
  structuralChangeSignal: "none" | "possible_change" | "unknown";
  soilMoistureProxy: "low" | "medium" | "high" | "unknown";
  confidence: EvidenceConfidence;
  limitations: string[];
}

export interface JrcGfc2020Screening {
  provider: "jrc_gfc2020" | "not_configured";
  baselineForestIntersectionPct: number | null;
  post2020LossSignal: "none" | "possible_loss" | "unknown";
  confidence: EvidenceConfidence;
  limitations: string[];
}

export interface ScoreDataQuality {
  overallConfidence: EvidenceConfidence;
  completenessPct: number;
  usableNdviMonths: number;
  climateMonths: number;
  averageValidPixelCoverage: number | null;
  providerCoverage: {
    sentinel2: EvidenceConfidence;
    climate: EvidenceConfidence;
    terrain: EvidenceConfidence;
    sentinel1: EvidenceConfidence;
    forestBaseline: EvidenceConfidence;
  };
  warnings: string[];
  limitations: string[];
}

export type EudrRiskStatus =
  | "low_risk"
  | "review_required"
  | "high_risk"
  | "unknown";

export type EvidenceConfidence = "none" | "low" | "medium" | "high";

export interface EudrScreening {
  status: EudrRiskStatus;
  score: number;
  confidence: EvidenceConfidence;
  manualCompliance: boolean | null;
  source: "manual_verifier" | "sentinel_2_screening" | "unassessed";
  reasons: string[];
  limitations: string[];
  cutoffDate: "2020-12-31";
  ndviAverage: number | null;
  validNdviMonths: number;
}

export interface ScoreBreakdown {
  ndviAvg: number | null;       // null when Sentinel Hub not configured
  ndviStability: number | null; // null when Sentinel Hub not configured
  annualPrecip: number;
  rainDistrib: number;
  temperature: number;
  eudr: number;
  eudrScreening: EudrScreening;
  opticalCoverage: {
    averageValidPixelCoverage: number | null;
    averageCloudCoverage: number | null;
    lowCoverageMonths: number;
  };
  quarterlyNdvi: QuarterlyNdviMetric[];
  climateTrend: ClimateTrendMetrics;
  terrain: TerrainMetrics;
  sentinel1: Sentinel1Metrics;
  jrcGfc2020: JrcGfc2020Screening;
  dataQuality: ScoreDataQuality;
  total: number;
}

export interface RiskScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  hash: string;
  ndviMonths: NdviMonth[];
  climateMonths: ClimateMonth[];
  hasSentinel: boolean;
  quarterlyNdvi: QuarterlyNdviMetric[];
  climateTrend: ClimateTrendMetrics;
  terrain: TerrainMetrics;
  sentinel1: Sentinel1Metrics;
  jrcGfc2020: JrcGfc2020Screening;
  eudrScreening: EudrScreening;
  dataQuality: ScoreDataQuality;
  // Manual/verifier compliance value only. Satellite screening must not set this.
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
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "FLOAT32" },
      { id: "cloudMask", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}
function evaluatePixel(s) {
  const isCloud = [3, 8, 9, 10, 11].includes(s.SCL);
  const valid = s.dataMask === 1 && !isCloud && (s.B08 + s.B04) !== 0;
  const ndvi = valid ? (s.B08 - s.B04) / (s.B08 + s.B04) : NaN;
  return {
    ndvi: [ndvi],
    dataMask: [valid ? 1 : 0],
    cloudMask: [isCloud ? 1 : 0]
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

const SENTINEL1_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: [
      { id: "vv", bands: 1, sampleType: "FLOAT32" },
      { id: "vh", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}
function evaluatePixel(s) {
  return {
    vv: [s.dataMask ? s.VV : NaN],
    vh: [s.dataMask ? s.VH : NaN],
    dataMask: [s.dataMask]
  };
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
  polygon?: { coordinates: number[][][] } | null,
): Promise<NdviMonth[]> {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const payload = {
    input: {
      bounds: {
        bbox,
        ...(polygon
          ? {
              geometry: {
                type: "Polygon",
                coordinates: polygon.coordinates,
              },
            }
          : {}),
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
        dataMask?: {
          bands?: Record<string, { stats?: { mean?: number | null } }>;
        };
        cloudMask?: {
          bands?: Record<string, { stats?: { mean?: number | null } }>;
        };
      };
    }>;
  };
  const data = (await res.json()) as SHResponse;

  return (data.data ?? []).map((interval) => {
    const date = interval.interval.from.slice(0, 7);
    const ndviBands = interval.outputs?.ndvi?.bands ?? {};
    const dataMaskBands = interval.outputs?.dataMask?.bands ?? {};
    const cloudMaskBands = interval.outputs?.cloudMask?.bands ?? {};
    const ndviBand = Object.values(ndviBands)[0];
    const dataMaskBand = Object.values(dataMaskBands)[0];
    const cloudMaskBand = Object.values(cloudMaskBands)[0];
    const mean = numericOrNull(ndviBand?.stats?.mean ?? null);
    const validPixelCoverage = numericOrNull(dataMaskBand?.stats?.mean ?? null);
    const cloudCoverage = numericOrNull(cloudMaskBand?.stats?.mean ?? null);
    return { date, mean, validPixelCoverage, cloudCoverage };
  });
}

async function fetchSentinel1Stats(
  token: string,
  bbox: [number, number, number, number],
  months: number,
  polygon?: { coordinates: number[][][] } | null,
): Promise<{
  vvQuarterly: Array<{ quarter: string; mean: number | null }>;
  vhQuarterly: Array<{ quarter: string; mean: number | null }>;
  coverageQuarterly: Array<{ quarter: string; validPixelCoverage: number | null }>;
}> {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const payload = {
    input: {
      bounds: {
        bbox,
        ...(polygon
          ? {
              geometry: {
                type: "Polygon",
                coordinates: polygon.coordinates,
              },
            }
          : {}),
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-1-grd",
          dataFilter: {
            acquisitionMode: "IW",
            polarization: "DV",
          },
          processing: {
            backCoeff: "SIGMA0_ELLIPSOID",
            orthorectify: true,
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: `${start.toISOString().split("T")[0]}T00:00:00Z`,
        to: `${end.toISOString().split("T")[0]}T00:00:00Z`,
      },
      aggregationInterval: { of: "P3M" },
      evalscript: SENTINEL1_EVALSCRIPT,
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
      `Sentinel-1 stats failed: ${res.status} ${await res.text()}`,
    );
  }

  type SHSarResponse = {
    data?: Array<{
      interval: { from: string };
      outputs?: Record<
        "vv" | "vh" | "dataMask",
        { bands?: Record<string, { stats?: { mean?: number | null } }> }
      >;
    }>;
  };
  const data = (await res.json()) as SHSarResponse;
  const vvQuarterly: Array<{ quarter: string; mean: number | null }> = [];
  const vhQuarterly: Array<{ quarter: string; mean: number | null }> = [];
  const coverageQuarterly: Array<{ quarter: string; validPixelCoverage: number | null }> = [];

  for (const interval of data.data ?? []) {
    const quarter = quarterFromMonth(interval.interval.from.slice(0, 7));
    const vv = numericOrNull(
      Object.values(interval.outputs?.vv?.bands ?? {})[0]?.stats?.mean ?? null,
    );
    const vh = numericOrNull(
      Object.values(interval.outputs?.vh?.bands ?? {})[0]?.stats?.mean ?? null,
    );
    const coverage =
      numericOrNull(
        Object.values(interval.outputs?.dataMask?.bands ?? {})[0]?.stats?.mean ?? null,
      );
    vvQuarterly.push({ quarter, mean: vv });
    vhQuarterly.push({ quarter, mean: vh });
    coverageQuarterly.push({ quarter, validPixelCoverage: coverage });
  }

  return { vvQuarterly, vhQuarterly, coverageQuarterly };
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
  const monthMap = new Map<string, { precipMm: number; tempSum: number; tempCount: number; daysOver100Mm: number }>();
  for (let i = 0; i < times.length; i++) {
    const month = (times[i] ?? "").slice(0, 7); // "YYYY-MM"
    if (month.length !== 7) continue;
    const entry = monthMap.get(month) ?? { precipMm: 0, tempSum: 0, tempCount: 0, daysOver100Mm: 0 };
    const precip = precipDaily[i] ?? 0;
    entry.precipMm += precip;
    if (precip > 100) entry.daysOver100Mm++;
    const t = tempDaily[i];
    if (t != null) { entry.tempSum += t; entry.tempCount++; }
    monthMap.set(month, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { precipMm, tempSum, tempCount, daysOver100Mm }]) => ({
      date,
      precipMm,
      tempC: tempCount > 0 ? tempSum / tempCount : 0,
      daysOver100Mm,
    }));
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundedOrNull(value: unknown, digits: number): number | null {
  const numeric = numericOrNull(value);
  return numeric != null ? Number(numeric.toFixed(digits)) : null;
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

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function quarterFromMonth(date: string) {
  const [year, monthRaw] = date.split("-");
  const month = Number(monthRaw);
  if (!year || Number.isNaN(month)) return date;
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

function buildQuarterlyNdviMetrics(months: NdviMonth[]): QuarterlyNdviMetric[] {
  const grouped = new Map<string, NdviMonth[]>();
  for (const month of months) {
    const quarter = quarterFromMonth(month.date);
    grouped.set(quarter, [...(grouped.get(quarter) ?? []), month]);
  }

  let previousMean: number | null = null;
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, items]) => {
      const mean = average(
        items
          .map((item) => item.mean)
          .filter((value): value is number => typeof value === "number"),
      );
      const validPixelCoverage = average(
        items
          .map((item) => item.validPixelCoverage)
          .filter((value): value is number => typeof value === "number"),
      );
      const deltaFromPrevious =
        mean != null && previousMean != null ? mean - previousMean : null;
      const anomaly: QuarterlyNdviMetric["anomaly"] =
        mean == null || validPixelCoverage == null || validPixelCoverage < 0.35
          ? "insufficient_data"
          : deltaFromPrevious != null && deltaFromPrevious <= -0.15
            ? "drop"
            : deltaFromPrevious != null && deltaFromPrevious >= 0.15
              ? "increase"
              : "none";
      previousMean = mean ?? previousMean;
      return {
        quarter,
        mean,
        validPixelCoverage,
        deltaFromPrevious,
        anomaly,
      };
    });
}

function buildClimateTrendMetrics(months: ClimateMonth[]): ClimateTrendMetrics {
  const annualizedPrecip =
    months.length > 0
      ? (months.reduce((sum, month) => sum + month.precipMm, 0) / months.length) * 12
      : null;
  const avgTemp = average(months.map((month) => month.tempC));
  const daysOver100Mm = months.reduce((sum, month) => sum + month.daysOver100Mm, 0);

  const firstHalf = months.slice(0, Math.floor(months.length / 2));
  const secondHalf = months.slice(Math.floor(months.length / 2));
  const firstAnnualized =
    firstHalf.length > 0
      ? (firstHalf.reduce((sum, month) => sum + month.precipMm, 0) / firstHalf.length) * 12
      : null;
  const secondAnnualized =
    secondHalf.length > 0
      ? (secondHalf.reduce((sum, month) => sum + month.precipMm, 0) / secondHalf.length) * 12
      : null;
  const yearsBetweenHalves = months.length >= 2 ? months.length / 24 : null;
  const precipitationTrendMmPerYear =
    firstAnnualized != null && secondAnnualized != null && yearsBetweenHalves
      ? (secondAnnualized - firstAnnualized) / yearsBetweenHalves
      : null;

  const waterStressLabel: ClimateTrendMetrics["waterStressLabel"] =
    annualizedPrecip == null || avgTemp == null
      ? "unknown"
      : annualizedPrecip < 1000 || avgTemp > 26
        ? "high"
        : annualizedPrecip < 1300 || avgTemp > 24
          ? "medium"
          : "low";

  return {
    provider: "open_meteo_archive",
    providerLabel: "Open-Meteo Archive climate fallback",
    precipitationTrendMmPerYear,
    daysOver100Mm,
    averageAnnualPrecipMm: annualizedPrecip,
    averageTempC: avgTemp,
    waterStressLabel,
    confidence: months.length >= 12 ? "medium" : "low",
  };
}

async function buildTerrainMetrics(params: {
  token: string | null;
  lat: number;
  lng: number;
}): Promise<TerrainMetrics> {
  if (params.token) {
    const demElevation = await getAltitudeFromDem(params.token, params.lat, params.lng);
    if (demElevation != null) {
      return {
        provider: "copernicus_dem_glo30",
        providerLabel: "Copernicus DEM terrain screening",
        elevationMasl: demElevation,
        slopeDegrees: null,
        aspectDegrees: null,
        terrainRisk:
          demElevation < 600 || demElevation > 2200
            ? "medium"
            : "low",
        confidence: "medium",
        limitations: [
          "This V1 terrain screen uses DEM elevation; slope and aspect are reserved for the raster-processing provider increment.",
        ],
      };
    }
  }

  const fallbackElevation = await getAltitudeFromOpenMeteo(params.lat, params.lng);
  return {
    provider: fallbackElevation != null ? "open_meteo_elevation_fallback" : "unavailable",
    providerLabel:
      fallbackElevation != null
        ? "Open-Meteo elevation fallback"
        : "Terrain provider unavailable",
    elevationMasl: fallbackElevation,
    slopeDegrees: null,
    aspectDegrees: null,
    terrainRisk:
      fallbackElevation == null
        ? "unknown"
        : fallbackElevation < 600 || fallbackElevation > 2200
          ? "medium"
          : "low",
    confidence: fallbackElevation == null ? "none" : "low",
    limitations: [
      "Open-Meteo elevation is a fallback and is not a full Copernicus DEM terrain report.",
      "Slope and aspect require the raster-processing provider increment.",
    ],
  };
}

function buildSentinel1Metrics(
  stats: Awaited<ReturnType<typeof fetchSentinel1Stats>> | null,
): Sentinel1Metrics {
  if (!stats) {
    return {
      provider: "not_configured",
      vvQuarterly: [],
      vhQuarterly: [],
      structuralChangeSignal: "unknown",
      soilMoistureProxy: "unknown",
      confidence: "none",
      limitations: [
        "Sentinel-1 SAR quarterly backscatter is not enabled in this deployment yet.",
        "Soil moisture is reported only as a future radar proxy, not direct ground soil moisture.",
      ],
    };
  }

  const validVh = stats.vhQuarterly
    .map((quarter) => quarter.mean)
    .filter((value): value is number => typeof value === "number");
  const validVv = stats.vvQuarterly
    .map((quarter) => quarter.mean)
    .filter((value): value is number => typeof value === "number");
  const latestVh = validVh.at(-1) ?? null;
  const previousVh = validVh.length >= 2 ? validVh.at(-2) ?? null : null;
  const vhDelta =
    latestVh != null && previousVh != null ? latestVh - previousVh : null;
  const trailingVh =
    validVh.length >= 5 ? average(validVh.slice(-5, -1)) : null;
  const belowTrailingAverage =
    latestVh != null && trailingVh != null && trailingVh > 0
      ? latestVh < trailingVh * 0.7
      : false;
  const vvAverage = average(validVv);

  return {
    provider: "sentinel_1_grd",
    vvQuarterly: stats.vvQuarterly,
    vhQuarterly: stats.vhQuarterly,
    structuralChangeSignal:
      vhDelta != null && vhDelta <= -0.03 && belowTrailingAverage
        ? "possible_change"
        : "none",
    soilMoistureProxy:
      vvAverage == null
        ? "unknown"
        : vvAverage < 0.04
          ? "low"
          : vvAverage > 0.16
            ? "high"
            : "medium",
    confidence: validVh.length >= 4 && validVv.length >= 4 ? "medium" : "low",
    limitations: [
      "Sentinel-1 backscatter is a structural/moisture proxy and not a direct ground measurement.",
      "Single-quarter radar movement is noisy; structural change is flagged only when the latest quarter is also materially below the recent trailing average.",
    ],
  };
}

function buildJrcPlaceholder(): JrcGfc2020Screening {
  return {
    provider: "not_configured",
    baselineForestIntersectionPct: null,
    post2020LossSignal: "unknown",
    confidence: "none",
    limitations: [
      "Automated forest-loss evidence is not included in the beta screening.",
      "Manual review is required before treating the EUDR signal as final.",
    ],
  };
}

function confidenceRank(confidence: EvidenceConfidence) {
  return ({ none: 0, low: 1, medium: 2, high: 3 } as const)[confidence];
}

function confidenceFromRank(rank: number): EvidenceConfidence {
  if (rank >= 3) return "high";
  if (rank >= 2) return "medium";
  if (rank >= 1) return "low";
  return "none";
}

function buildScoreDataQuality(params: {
  hasSentinel: boolean;
  validNdvi: number[];
  climateMonths: ClimateMonth[];
  averageValidPixelCoverage: number | null;
  terrain: TerrainMetrics;
  sentinel1: Sentinel1Metrics;
  jrcGfc2020: JrcGfc2020Screening;
}): ScoreDataQuality {
  const sentinel2Confidence: EvidenceConfidence =
    !params.hasSentinel || params.validNdvi.length === 0
      ? "none"
      : params.validNdvi.length >= 18 &&
          params.averageValidPixelCoverage != null &&
          params.averageValidPixelCoverage >= 0.5
        ? "high"
        : (params.validNdvi.length >= 18 &&
            params.averageValidPixelCoverage == null) ||
            (params.validNdvi.length >= 6 &&
              params.averageValidPixelCoverage != null &&
              params.averageValidPixelCoverage >= 0.35)
          ? "medium"
          : "low";

  const climateConfidence: EvidenceConfidence =
    params.climateMonths.length >= 24
      ? "medium"
      : params.climateMonths.length >= 12
        ? "low"
        : "none";

  const forestBaselineConfidence = params.jrcGfc2020.confidence;
  const providerCoverage = {
    sentinel2: sentinel2Confidence,
    climate: climateConfidence,
    terrain: params.terrain.confidence,
    sentinel1: params.sentinel1.confidence,
    forestBaseline: forestBaselineConfidence,
  };

  const weightedCompleteness =
    (confidenceRank(providerCoverage.sentinel2) / 3) * 30 +
    (confidenceRank(providerCoverage.climate) / 3) * 25 +
    (confidenceRank(providerCoverage.terrain) / 3) * 15 +
    (confidenceRank(providerCoverage.sentinel1) / 3) * 10 +
    (confidenceRank(providerCoverage.forestBaseline) / 3) * 20;

  const warnings: string[] = [];
  if (sentinel2Confidence === "none") {
    warnings.push("Sentinel-2 NDVI evidence is unavailable; vegetation scoring is omitted.");
  } else if (sentinel2Confidence === "low") {
    warnings.push("Sentinel-2 NDVI evidence is sparse or low coverage.");
  } else if (params.averageValidPixelCoverage == null) {
    warnings.push("Sentinel-2 valid pixel coverage was not reported by the provider.");
  }
  if (params.sentinel1.confidence === "none") {
    warnings.push("Sentinel-1 radar evidence is unavailable.");
  }
  if (forestBaselineConfidence === "none") {
    warnings.push("Forest-loss evidence requires manual review.");
  }
  if (climateConfidence !== "medium") {
    warnings.push("Climate archive evidence is incomplete.");
  }

  const minProviderRank = Math.min(
    confidenceRank(providerCoverage.sentinel2),
    confidenceRank(providerCoverage.climate),
    confidenceRank(providerCoverage.forestBaseline),
  );
  const overallConfidence = confidenceFromRank(
    Math.min(
      Math.floor(weightedCompleteness >= 80 ? 3 : weightedCompleteness >= 55 ? 2 : weightedCompleteness >= 30 ? 1 : 0),
      minProviderRank === 0 ? 1 : minProviderRank,
    ),
  );

  return {
    overallConfidence,
    completenessPct: Math.round(weightedCompleteness),
    usableNdviMonths: params.validNdvi.length,
    climateMonths: params.climateMonths.length,
    averageValidPixelCoverage: params.averageValidPixelCoverage,
    providerCoverage,
    warnings,
    limitations: [
      "This score is a preliminary farm screening signal, not a legal compliance certificate.",
      "EUDR confidence remains capped until manual forest-loss review is complete.",
      "Ground-truth agronomic validation is still required for production lending or export decisions.",
    ],
  };
}

function buildEudrScreening(params: {
  manualCompliance: boolean | null;
  hasSentinel: boolean;
  validNdvi: number[];
  ndviAverage: number | null;
  ndviStabilityScore: number | null;
  averageValidPixelCoverage: number | null;
  jrcGfc2020: JrcGfc2020Screening;
}): EudrScreening {
  const sharedLimitations = [
    "Automatic screening is not a legal EUDR deforestation determination.",
    "Manual forest-loss review is required for stronger EUDR evidence.",
  ];

  if (params.manualCompliance === true) {
    return {
      status: "low_risk",
      score: 100,
      confidence: "high",
      manualCompliance: true,
      source: "manual_verifier",
      reasons: ["A verifier or admin manually marked this farm EUDR compliant."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (params.manualCompliance === false) {
    return {
      status: "high_risk",
      score: 0,
      confidence: "high",
      manualCompliance: false,
      source: "manual_verifier",
      reasons: ["A verifier or admin manually marked this farm EUDR non-compliant."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (!params.hasSentinel || params.validNdvi.length === 0) {
    return {
      status: "unknown",
      score: 50,
      confidence: "none",
      manualCompliance: null,
      source: "unassessed",
      reasons: ["No usable Sentinel-2 NDVI observations were available for automated screening."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (params.validNdvi.length < 6) {
    return {
      status: "review_required",
      score: 45,
      confidence: "low",
      manualCompliance: null,
      source: "sentinel_2_screening",
      reasons: ["Sentinel-2 coverage is too sparse for a reliable EUDR screening signal."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (
    params.averageValidPixelCoverage != null &&
    params.averageValidPixelCoverage < 0.35
  ) {
    return {
      status: "review_required",
      score: 45,
      confidence: "low",
      manualCompliance: null,
      source: "sentinel_2_screening",
      reasons: ["Optical satellite coverage is too low for a confident automated screen."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (
    params.jrcGfc2020.post2020LossSignal === "possible_loss" ||
    (params.jrcGfc2020.baselineForestIntersectionPct != null &&
      params.jrcGfc2020.baselineForestIntersectionPct > 0 &&
      params.jrcGfc2020.post2020LossSignal === "unknown")
  ) {
    return {
      status: "review_required",
      score: 35,
      confidence: params.jrcGfc2020.confidence === "none" ? "low" : "medium",
      manualCompliance: null,
      source: "sentinel_2_screening",
      reasons: ["Forest-loss evidence requires review."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  const ndviAverage = params.ndviAverage ?? 0;
  if (ndviAverage < 0.3) {
    return {
      status: "high_risk",
      score: 20,
      confidence: "medium",
      manualCompliance: null,
      source: "sentinel_2_screening",
      reasons: ["Average Sentinel-2 NDVI is below the vegetation screening threshold."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  if (params.ndviStabilityScore != null && params.ndviStabilityScore < 35) {
    return {
      status: "review_required",
      score: 40,
      confidence: "medium",
      manualCompliance: null,
      source: "sentinel_2_screening",
      reasons: ["Sentinel-2 NDVI is unstable enough to require review."],
      limitations: sharedLimitations,
      cutoffDate: "2020-12-31",
      ndviAverage: params.ndviAverage,
      validNdviMonths: params.validNdvi.length,
    };
  }

  return {
    status: "review_required",
    score: ndviAverage >= 0.5 ? 50 : 45,
    confidence: "low",
    manualCompliance: null,
    source: "sentinel_2_screening",
    reasons:
      ndviAverage >= 0.5
        ? ["Sentinel-2 NDVI shows a persistent vegetation signal, but manual review is still required."]
        : ["Sentinel-2 NDVI does not show a clear low-vegetation signal, but review is still required."],
    limitations: sharedLimitations,
    cutoffDate: "2020-12-31",
    ndviAverage: params.ndviAverage,
    validNdviMonths: params.validNdvi.length,
  };
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
  let sentinelToken: string | null = null;
  let sentinel1Stats: Awaited<ReturnType<typeof fetchSentinel1Stats>> | null = null;

  if (params.sentinelClientId && params.sentinelClientSecret) {
    try {
      sentinelToken = await getSentinelToken(
        params.sentinelClientId,
        params.sentinelClientSecret,
      );
      const [ndvi, sar] = await Promise.allSettled([
        fetchNdviStats(sentinelToken, sentinelBbox, MONTHS, params.polygon),
        fetchSentinel1Stats(sentinelToken, sentinelBbox, MONTHS, params.polygon),
      ]);
      if (ndvi.status === "fulfilled") {
        ndviMonths = ndvi.value;
        hasSentinel = true;
      } else {
        console.error("[copernicus] Sentinel-2 error:", ndvi.reason);
      }
      if (sar.status === "fulfilled") {
        sentinel1Stats = sar.value;
      } else {
        console.error("[copernicus] Sentinel-1 error:", sar.reason);
      }
    } catch (err) {
      // Credentials set but API call failed → continue without NDVI
      console.error("[copernicus] Sentinel Hub error:", err);
      sentinelToken = null;
    }
  }

  // ── Climate (ERA5 via Open-Meteo) ──────────────────────────────────────────
  const [climateMonths, terrain] = await Promise.all([
    fetchOpenMeteoClimate(climateLat, climateLng, MONTHS),
    buildTerrainMetrics({
      token: sentinelToken,
      lat: climateLat,
      lng: climateLng,
    }),
  ]);

  // ── Individual scores ──────────────────────────────────────────────────────
  const validNdvi = ndviMonths
    .filter((m) => m.mean != null)
    .map((m) => m.mean as number);
  const avgNdvi =
    validNdvi.length > 0
      ? validNdvi.reduce((a, b) => a + b, 0) / validNdvi.length
      : null;

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

  const ndviAvgScore = hasSentinel && avgNdvi != null ? scoreNdviAvg(avgNdvi) : null;
  const ndviStabScore = hasSentinel ? scoreNdviStability(validNdvi) : null;
  const averageValidPixelCoverage = average(
    ndviMonths
      .map((month) => month.validPixelCoverage)
      .filter((value): value is number => typeof value === "number"),
  );
  const averageCloudCoverage = average(
    ndviMonths
      .map((month) => month.cloudCoverage)
      .filter((value): value is number => typeof value === "number"),
  );
  const lowCoverageMonths = ndviMonths.filter(
    (month) =>
      month.validPixelCoverage != null &&
      month.validPixelCoverage < 0.35,
  ).length;
  const quarterlyNdvi = buildQuarterlyNdviMetrics(ndviMonths);
  const climateTrend = buildClimateTrendMetrics(climateMonths);
  const sentinel1 = buildSentinel1Metrics(sentinel1Stats);
  const jrcGfc2020 = buildJrcPlaceholder();
  const dataQuality = buildScoreDataQuality({
    hasSentinel,
    validNdvi,
    climateMonths,
    averageValidPixelCoverage,
    terrain,
    sentinel1,
    jrcGfc2020,
  });

  const eudrScreening = buildEudrScreening({
    manualCompliance: params.eudrCompliant,
    hasSentinel,
    validNdvi,
    ndviAverage: avgNdvi,
    ndviStabilityScore: ndviStabScore,
    averageValidPixelCoverage,
    jrcGfc2020,
  });

  const breakdown: ScoreBreakdown = {
    ndviAvg: ndviAvgScore,
    ndviStability: ndviStabScore,
    annualPrecip: scoreAnnualPrecip(annualPrecip),
    rainDistrib: scoreRainDistrib(climateMonths),
    temperature: scoreTemperature(avgTemp),
    eudr: eudrScreening.score,
    eudrScreening,
    opticalCoverage: {
      averageValidPixelCoverage,
      averageCloudCoverage,
      lowCoverageMonths,
    },
    quarterlyNdvi,
    climateTrend,
    terrain,
    sentinel1,
    jrcGfc2020,
    dataQuality,
    total: 0,
  };

  // Weighted total — re-normalises automatically if NDVI is absent, then caps
  // low-evidence fallback runs so climate-only results do not look definitive.
  const components: Array<{ score: number; weight: number }> = [
    { score: breakdown.annualPrecip, weight: BASE_WEIGHTS.annualPrecip },
    { score: breakdown.rainDistrib, weight: BASE_WEIGHTS.rainDistrib },
    { score: breakdown.temperature, weight: BASE_WEIGHTS.temperature },
    { score: breakdown.eudr, weight: BASE_WEIGHTS.eudr },
  ];
  if (ndviAvgScore != null && ndviStabScore != null) {
    components.push(
      { score: ndviAvgScore, weight: BASE_WEIGHTS.ndviAvg },
      { score: ndviStabScore, weight: BASE_WEIGHTS.ndviStability },
    );
  }
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const rawTotal = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight,
  );
  const evidenceCap =
    !hasSentinel || dataQuality.overallConfidence === "none" ? 59 : 100;
  breakdown.total = Math.min(rawTotal, evidenceCap);

  // ── Score hash (verifiable fingerprint of inputs) ──────────────────────────
  const hashInput = JSON.stringify({
    lat: Number(params.lat.toFixed(4)),
    lng: Number(params.lng.toFixed(4)),
    sentinelBbox: sentinelBbox.map((v) => Number(v.toFixed(6))),
    months: MONTHS,
    ndviMonths: ndviMonths.map((m) => ({
      date: m.date,
      mean: roundedOrNull(m.mean, 4),
      validPixelCoverage: roundedOrNull(m.validPixelCoverage, 4),
      cloudCoverage: roundedOrNull(m.cloudCoverage, 4),
    })),
    climateMonths: climateMonths.map((m) => ({
      date: m.date,
      precipMm: Number(m.precipMm.toFixed(2)),
      tempC: Number(m.tempC.toFixed(2)),
      daysOver100Mm: m.daysOver100Mm,
    })),
    quarterlyNdvi,
    climateTrend,
    terrain,
    sentinel1,
    jrcGfc2020,
    dataQuality,
    manualEudrCompliant: params.eudrCompliant,
    eudrScreening: {
      status: eudrScreening.status,
      score: eudrScreening.score,
      confidence: eudrScreening.confidence,
      source: eudrScreening.source,
      ndviAverage:
        eudrScreening.ndviAverage != null
          ? Number(eudrScreening.ndviAverage.toFixed(4))
          : null,
      validNdviMonths: eudrScreening.validNdviMonths,
    },
  });
  const hash = createHash("sha256").update(hashInput).digest("hex");

  return {
    score: breakdown.total,
    breakdown,
    hash,
    ndviMonths,
    climateMonths,
    hasSentinel,
    quarterlyNdvi,
    climateTrend,
    terrain,
    sentinel1,
    jrcGfc2020,
    eudrScreening,
    dataQuality,
    eudrCompliant: params.eudrCompliant,
  };
}
