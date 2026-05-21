-- Add optional message field to proposals (partner message to farmer)
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "message" text;
