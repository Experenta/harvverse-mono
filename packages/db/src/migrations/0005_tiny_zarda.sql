DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'draft'
      AND enumtypid = 'public.lot_status'::regtype
  ) THEN
    ALTER TYPE "public"."lot_status" ADD VALUE 'draft' BEFORE 'available';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'satellite_report'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'satellite_report';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'eudr_screening'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'eudr_screening';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ndvi_milestone_check'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'ndvi_milestone_check';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'sar_milestone_check'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'sar_milestone_check';
  END IF;
END $$;

ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "risk_score" integer;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "eudr_compliant" boolean;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_hash" varchar(64);
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_updated_at" timestamp;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "ndvi_average" numeric;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "annual_precip_mm" numeric;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "avg_temp_c" numeric;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;

CREATE TABLE IF NOT EXISTS "farm_images" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL REFERENCES "farms"("id"),
  "data" text NOT NULL,
  "mime_type" varchar(50) NOT NULL,
  "filename" text NOT NULL,
  "size_bytes" integer,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "farm_images_farm_id_idx" ON "farm_images" ("farm_id");
CREATE INDEX IF NOT EXISTS "farm_images_primary_idx" ON "farm_images" ("farm_id", "is_primary");

CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "country" text NOT NULL,
  "investment_range" text NOT NULL,
  "how_heard" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "copernicus_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL REFERENCES "farms"("id"),
  "provider_name" text NOT NULL,
  "provider_version" text,
  "collection_id" text,
  "time_range_start" timestamp,
  "time_range_end" timestamp,
  "polygon_hash" varchar(64) NOT NULL,
  "raw_response_hash" varchar(64),
  "derived_metrics" jsonb,
  "confidence" varchar(20) DEFAULT 'unknown' NOT NULL,
  "generated_report_hash" varchar(64) NOT NULL,
  "status" varchar(30) DEFAULT 'complete' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "copernicus_runs_farm_created_idx" ON "copernicus_runs" ("farm_id", "created_at");
CREATE INDEX IF NOT EXISTS "copernicus_runs_report_hash_idx" ON "copernicus_runs" ("generated_report_hash");

CREATE TABLE IF NOT EXISTS "copernicus_observations" (
  "id" serial PRIMARY KEY NOT NULL,
  "run_id" integer NOT NULL REFERENCES "copernicus_runs"("id"),
  "farm_id" integer NOT NULL REFERENCES "farms"("id"),
  "provider_name" text NOT NULL,
  "collection_id" text,
  "observed_at" timestamp,
  "metric_type" varchar(60) NOT NULL,
  "metrics" jsonb NOT NULL,
  "confidence" varchar(20) DEFAULT 'unknown' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "copernicus_observations_run_idx" ON "copernicus_observations" ("run_id");
CREATE INDEX IF NOT EXISTS "copernicus_observations_farm_metric_idx" ON "copernicus_observations" ("farm_id", "metric_type");

CREATE TABLE IF NOT EXISTS "eudr_assessments" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL REFERENCES "farms"("id"),
  "run_id" integer REFERENCES "copernicus_runs"("id"),
  "status" varchar(32) NOT NULL,
  "score" integer,
  "confidence" varchar(20) DEFAULT 'unknown' NOT NULL,
  "source" varchar(60) DEFAULT 'unassessed' NOT NULL,
  "cutoff_date" varchar(10) DEFAULT '2020-12-31' NOT NULL,
  "reasons" text[],
  "limitations" text[],
  "assessment_hash" varchar(64) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "eudr_assessments_farm_created_idx" ON "eudr_assessments" ("farm_id", "created_at");
CREATE INDEX IF NOT EXISTS "eudr_assessments_run_idx" ON "eudr_assessments" ("run_id");
CREATE INDEX IF NOT EXISTS "eudr_assessments_hash_idx" ON "eudr_assessments" ("assessment_hash");

CREATE TABLE IF NOT EXISTS "copernicus_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL REFERENCES "farms"("id"),
  "run_id" integer REFERENCES "copernicus_runs"("id"),
  "type" varchar(60) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "message" text NOT NULL,
  "metrics" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp
);

CREATE INDEX IF NOT EXISTS "copernicus_alerts_farm_status_idx" ON "copernicus_alerts" ("farm_id", "status");
CREATE INDEX IF NOT EXISTS "copernicus_alerts_run_idx" ON "copernicus_alerts" ("run_id");
