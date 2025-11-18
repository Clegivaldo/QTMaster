-- Migration: add revision column to editor_templates
ALTER TABLE "editor_templates" ADD COLUMN "revision" integer DEFAULT 0;

-- Add index if needed (optional)
CREATE INDEX IF NOT EXISTS "editor_templates_revision_idx" ON "editor_templates"("revision");
