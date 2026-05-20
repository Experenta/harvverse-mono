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
