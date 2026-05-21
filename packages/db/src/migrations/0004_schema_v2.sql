-- Add phone/country to users (idempotent)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text;

-- Rename farms.photo_url -> photo_urls (only if old name still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farms' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE "farms" RENAME COLUMN "photo_url" TO "photo_urls";
  END IF;
END $$;

-- Change farms.photo_urls to text[] (only if it's still text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farms' AND column_name = 'photo_urls' AND data_type = 'text'
  ) THEN
    ALTER TABLE "farms" ALTER COLUMN "photo_urls" TYPE text[] USING ARRAY["photo_urls"]::text[];
  END IF;
END $$;

-- Rename lots.cover -> cover_images (only if old name still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lots' AND column_name = 'cover'
  ) THEN
    ALTER TABLE "lots" RENAME COLUMN "cover" TO "cover_images";
  END IF;
END $$;

-- Change lots.cover_images to text[] (only if it's still text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lots' AND column_name = 'cover_images' AND data_type = 'text'
  ) THEN
    ALTER TABLE "lots" ALTER COLUMN "cover_images" TYPE text[] USING ARRAY["cover_images"]::text[];
  END IF;
END $$;
