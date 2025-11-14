-- Migration: add-client-address-fields
-- Generated: 2025-11-12

-- Add new address-related columns to clients table
ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT;

-- Note: This migration is created to reflect the updated Prisma schema
-- Apply via: `prisma migrate deploy` or run in development with `prisma migrate dev`.
