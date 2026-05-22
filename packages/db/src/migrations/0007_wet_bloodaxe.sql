-- Reconciliation migration for environments where 0005_tiny_zarda.sql
-- already applied the Copernicus/EUDR schema before this generated migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'satellite_report'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'satellite_report';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'eudr_screening'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'eudr_screening';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'ndvi_milestone_check'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'ndvi_milestone_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'sar_milestone_check'
      AND enumtypid = 'public.evidence_type'::regtype
  ) THEN
    ALTER TYPE "public"."evidence_type" ADD VALUE 'sar_milestone_check';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copernicus_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL,
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copernicus_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL,
  "run_id" integer,
  "type" varchar(60) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "message" text NOT NULL,
  "metrics" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copernicus_observations" (
  "id" serial PRIMARY KEY NOT NULL,
  "run_id" integer NOT NULL,
  "farm_id" integer NOT NULL,
  "provider_name" text NOT NULL,
  "collection_id" text,
  "observed_at" timestamp,
  "metric_type" varchar(60) NOT NULL,
  "metrics" jsonb NOT NULL,
  "confidence" varchar(20) DEFAULT 'unknown' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eudr_assessments" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL,
  "run_id" integer,
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "farm_images" (
  "id" serial PRIMARY KEY NOT NULL,
  "farm_id" integer NOT NULL,
  "data" text,
  "storage_provider" varchar(20) DEFAULT 'database' NOT NULL,
  "storage_bucket" text,
  "storage_key" text,
  "storage_region" varchar(40),
  "checksum_sha256" varchar(64),
  "mime_type" varchar(50) NOT NULL,
  "filename" text NOT NULL,
  "size_bytes" integer,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "country" text NOT NULL,
  "investment_range" text NOT NULL,
  "how_heard" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "risk_score" integer;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "eudr_compliant" boolean;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "ndvi_average" numeric;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "annual_precip_mm" numeric;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "avg_temp_c" numeric;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'copernicus_runs_farm_id_farms_id_fk'
      AND conrelid = 'public.copernicus_runs'::regclass
  ) THEN
    ALTER TABLE "copernicus_runs"
      ADD CONSTRAINT "copernicus_runs_farm_id_farms_id_fk"
      FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'copernicus_alerts_farm_id_farms_id_fk'
      AND conrelid = 'public.copernicus_alerts'::regclass
  ) THEN
    ALTER TABLE "copernicus_alerts"
      ADD CONSTRAINT "copernicus_alerts_farm_id_farms_id_fk"
      FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'copernicus_alerts_run_id_copernicus_runs_id_fk'
      AND conrelid = 'public.copernicus_alerts'::regclass
  ) THEN
    ALTER TABLE "copernicus_alerts"
      ADD CONSTRAINT "copernicus_alerts_run_id_copernicus_runs_id_fk"
      FOREIGN KEY ("run_id") REFERENCES "public"."copernicus_runs"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'copernicus_observations_run_id_copernicus_runs_id_fk'
      AND conrelid = 'public.copernicus_observations'::regclass
  ) THEN
    ALTER TABLE "copernicus_observations"
      ADD CONSTRAINT "copernicus_observations_run_id_copernicus_runs_id_fk"
      FOREIGN KEY ("run_id") REFERENCES "public"."copernicus_runs"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'copernicus_observations_farm_id_farms_id_fk'
      AND conrelid = 'public.copernicus_observations'::regclass
  ) THEN
    ALTER TABLE "copernicus_observations"
      ADD CONSTRAINT "copernicus_observations_farm_id_farms_id_fk"
      FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eudr_assessments_farm_id_farms_id_fk'
      AND conrelid = 'public.eudr_assessments'::regclass
  ) THEN
    ALTER TABLE "eudr_assessments"
      ADD CONSTRAINT "eudr_assessments_farm_id_farms_id_fk"
      FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eudr_assessments_run_id_copernicus_runs_id_fk'
      AND conrelid = 'public.eudr_assessments'::regclass
  ) THEN
    ALTER TABLE "eudr_assessments"
      ADD CONSTRAINT "eudr_assessments_run_id_copernicus_runs_id_fk"
      FOREIGN KEY ("run_id") REFERENCES "public"."copernicus_runs"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'farm_images_farm_id_farms_id_fk'
      AND conrelid = 'public.farm_images'::regclass
  ) THEN
    ALTER TABLE "farm_images"
      ADD CONSTRAINT "farm_images_farm_id_farms_id_fk"
      FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_alerts_farm_status_idx" ON "copernicus_alerts" USING btree ("farm_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_alerts_run_idx" ON "copernicus_alerts" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_observations_run_idx" ON "copernicus_observations" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_observations_farm_metric_idx" ON "copernicus_observations" USING btree ("farm_id","metric_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_runs_farm_created_idx" ON "copernicus_runs" USING btree ("farm_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copernicus_runs_report_hash_idx" ON "copernicus_runs" USING btree ("generated_report_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eudr_assessments_farm_created_idx" ON "eudr_assessments" USING btree ("farm_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eudr_assessments_run_idx" ON "eudr_assessments" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eudr_assessments_hash_idx" ON "eudr_assessments" USING btree ("assessment_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "farm_images_farm_id_idx" ON "farm_images" USING btree ("farm_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "farm_images_primary_idx" ON "farm_images" USING btree ("farm_id","is_primary");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "farm_images_storage_key_idx" ON "farm_images" USING btree ("storage_key");
