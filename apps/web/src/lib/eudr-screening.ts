export type EudrRiskStatus =
  | "low_risk"
  | "review_required"
  | "high_risk"
  | "unknown";

export interface EudrScreening {
  status: EudrRiskStatus;
  score?: number;
  confidence?: "none" | "low" | "medium" | "high";
  source?: string;
  reasons?: string[];
  limitations?: string[];
}

export type EudrGrade = "excellent" | "good" | "medium" | "poor" | "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function isEudrStatus(value: unknown): value is EudrRiskStatus {
  return (
    value === "low_risk" ||
    value === "review_required" ||
    value === "high_risk" ||
    value === "unknown"
  );
}

function parseScreening(value: unknown): EudrScreening | null {
  if (!isRecord(value) || !isEudrStatus(value.status)) return null;
  return {
    status: value.status,
    score: typeof value.score === "number" ? value.score : undefined,
    confidence:
      value.confidence === "none" ||
      value.confidence === "low" ||
      value.confidence === "medium" ||
      value.confidence === "high"
        ? value.confidence
        : undefined,
    source: typeof value.source === "string" ? value.source : undefined,
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((item): item is string => typeof item === "string")
      : undefined,
    limitations: Array.isArray(value.limitations)
      ? value.limitations.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

export function extractEudrScreening(scoreBreakdown: unknown): EudrScreening | null {
  if (!isRecord(scoreBreakdown)) return null;
  return (
    parseScreening(scoreBreakdown.eudrScreening) ??
    (isRecord(scoreBreakdown.breakdown)
      ? parseScreening(scoreBreakdown.breakdown.eudrScreening)
      : null)
  );
}

export function eudrTone(status: EudrRiskStatus | null | undefined) {
  if (status === "low_risk") {
    return {
      badge: "border-green-500/30 bg-green-500/20 text-green-300",
      card: "border-green-500/25 bg-green-500/10",
      text: "text-green-300",
    };
  }
  if (status === "high_risk") {
    return {
      badge: "border-red-500/30 bg-red-500/20 text-red-300",
      card: "border-red-500/25 bg-red-500/10",
      text: "text-red-300",
    };
  }
  if (status === "review_required") {
    return {
      badge: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300",
      card: "border-yellow-500/25 bg-yellow-500/10",
      text: "text-yellow-300",
    };
  }
  return {
    badge: "border-white/15 bg-white/10 text-white/60",
    card: "border-white/10 bg-white/[0.03]",
    text: "text-white/60",
  };
}

export function eudrGrade(screening: EudrScreening | null | undefined): EudrGrade {
  if (!screening || screening.status === "unknown") return "unknown";
  if (screening.status === "high_risk") return "poor";
  if (screening.status === "review_required") return "medium";
  if (screening.status === "low_risk") {
    return screening.confidence === "high" ? "excellent" : "good";
  }
  return "unknown";
}

export function eudrGradeTone(grade: EudrGrade) {
  if (grade === "excellent") {
    return {
      badge: "border-green-500/30 bg-green-500/20 text-green-300",
      card: "border-green-500/25 bg-green-500/10",
      text: "text-green-300",
    };
  }
  if (grade === "good") {
    return {
      badge: "border-[#67B9C1]/35 bg-[#67B9C1]/15 text-[#67B9C1]",
      card: "border-[#67B9C1]/25 bg-[#67B9C1]/10",
      text: "text-[#67B9C1]",
    };
  }
  if (grade === "medium") {
    return {
      badge: "border-yellow-500/35 bg-yellow-500/15 text-yellow-300",
      card: "border-yellow-500/25 bg-yellow-500/10",
      text: "text-yellow-300",
    };
  }
  if (grade === "poor") {
    return {
      badge: "border-red-500/30 bg-red-500/20 text-red-300",
      card: "border-red-500/25 bg-red-500/10",
      text: "text-red-300",
    };
  }
  return {
    badge: "border-white/15 bg-white/10 text-white/60",
    card: "border-white/10 bg-white/[0.03]",
    text: "text-white/60",
  };
}
